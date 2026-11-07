import { NextResponse } from 'next/server';
import { adminDb } from './firebase-admin';
import { getVerifiedUser } from './serverAuth';
import { checkAiRateLimit, RateLimitResult } from './rateLimit';

// Durable per-user quota, shared by every serverless instance (the in-memory limiter is per instance)
const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_MAX_REQUESTS = 15;
const DAILY_MAX_REQUESTS = 60;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const tooManyRequests = (result: RateLimitResult) =>
  NextResponse.json(
    { success: false, error: result.error || 'Rate limit exceeded. Please wait a few minutes before scanning again.' },
    {
      status: 429,
      headers: result.retryAfterSeconds ? { 'Retry-After': String(result.retryAfterSeconds) } : undefined,
    }
  );

/**
 * Counts one AI scan against the user's quota in Firestore (`ai_usage/{uid}`, server-only).
 * Fails open on Firestore errors so an outage never blocks scans; the in-memory limiter still applies.
 */
export async function consumeAiQuota(uid: string): Promise<RateLimitResult> {
  const ref = adminDb.collection('ai_usage').doc(uid);
  try {
    return await adminDb.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() || {} : {};
      const now = Date.now();
      const today = new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);

      const windowExpired = !data.windowStart || now - data.windowStart >= WINDOW_MS;
      const windowStart = windowExpired ? now : data.windowStart;
      const windowCount = windowExpired ? 0 : data.windowCount || 0;
      const dayCount = data.day === today ? data.dayCount || 0 : 0;

      if (windowCount >= WINDOW_MAX_REQUESTS) {
        const retryAfter = Math.max(1, Math.ceil((windowStart + WINDOW_MS - now) / 1000));
        return {
          allowed: false,
          error: `You've reached your temporary AI scan limit (${WINDOW_MAX_REQUESTS} scans per 15 min). Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
          retryAfterSeconds: retryAfter,
        };
      }
      if (dayCount >= DAILY_MAX_REQUESTS) {
        const nextIstMidnight = Date.parse(`${today}T00:00:00Z`) + 24 * 60 * 60 * 1000 - IST_OFFSET_MS;
        return {
          allowed: false,
          error: `You've reached today's AI scan limit (${DAILY_MAX_REQUESTS} scans per day). Please try again tomorrow.`,
          retryAfterSeconds: Math.max(1, Math.ceil((nextIstMidnight - now) / 1000)),
        };
      }

      tx.set(ref, {
        windowStart,
        windowCount: windowCount + 1,
        day: today,
        dayCount: dayCount + 1,
        updatedAt: now,
      });
      return { allowed: true };
    });
  } catch (err) {
    console.warn('AiQuota: Fail-open on Firestore error:', err);
    return { allowed: true };
  }
}

/**
 * Gate for AI extraction routes: requires a signed-in user, then applies the IP flood wall,
 * the per-instance limiter and the durable per-user quota. Returns an error response, or null to proceed.
 */
export async function guardAiRequest(req: Request): Promise<NextResponse | null> {
  const user = await getVerifiedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Please sign in to use AI scanning.' },
      { status: 401 }
    );
  }

  const instanceCheck = checkAiRateLimit(req, user.uid);
  if (!instanceCheck.allowed) return tooManyRequests(instanceCheck);

  const quotaCheck = await consumeAiQuota(user.uid);
  if (!quotaCheck.allowed) return tooManyRequests(quotaCheck);

  return null;
}
