/**
 * Campus-Safe AI Rate Limiter
 * 
 * Protects Gemini AI extraction endpoints from bot abuse, DDoS, and fake-account script exploits
 * while ensuring university/hostel students sharing campus WiFi (NAT) NEVER get blocked.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory buckets
const userBuckets = new Map<string, RateLimitRecord>();
const ipBuckets = new Map<string, RateLimitRecord>();

// Config thresholds
const USER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const USER_MAX_REQUESTS = 15; // Max 15 AI extractions per user per 15 min

const ANONYMOUS_IP_MAX_REQUESTS = 12; // Max 12 AI extractions per anonymous client per 15 min

const CAMPUS_IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const CAMPUS_IP_FLOOD_LIMIT = 120; // 120 requests per 10 min per IP (protects campus WiFi NAT while blocking bots)

// Clean up stale entries periodically to prevent memory leaks
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return; // run at most every 5 min
  lastCleanup = now;

  for (const [key, record] of Array.from(userBuckets.entries())) {
    if (now > record.resetAt) userBuckets.delete(key);
  }
  for (const [key, record] of Array.from(ipBuckets.entries())) {
    if (now > record.resetAt) ipBuckets.delete(key);
  }
}

export function getClientIp(req: Request): string {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0].trim();
      if (first) return first;
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp && realIp.trim()) return realIp.trim();

    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp && cfIp.trim()) return cfIp.trim();
  } catch {}
  return '127.0.0.1';
}

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

/**
 * Checks rate limits for AI endpoints in a campus-safe manner.
 * If user is authenticated, limit is isolated to their specific user ID.
 * IP limit is set high to prevent campus WiFi NAT blocking.
 * Always fails open on any unexpected error.
 */
export function checkAiRateLimit(req: Request, userId?: string | null): RateLimitResult {
  try {
    cleanupStaleEntries();

    const now = Date.now();
    const ip = getClientIp(req);

    // Whitelist local development / loopback
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return { allowed: true };
    }

    // 1. Check Anti-Bot Flood Wall on IP
    // This catches bot loops spamming 120+ requests in 10 minutes
    const ipRecord = ipBuckets.get(ip) || { count: 0, resetAt: now + CAMPUS_IP_WINDOW_MS };
    if (now > ipRecord.resetAt) {
      ipRecord.count = 0;
      ipRecord.resetAt = now + CAMPUS_IP_WINDOW_MS;
    }

    if (ipRecord.count >= CAMPUS_IP_FLOOD_LIMIT) {
      const retryAfter = Math.max(1, Math.ceil((ipRecord.resetAt - now) / 1000));
      return {
        allowed: false,
        error: 'High network activity detected on this connection. Please wait a few minutes before scanning again.',
        retryAfterSeconds: retryAfter,
      };
    }

    // 2. If Authenticated User: Isolate to their individual User ID
    // Even if 100 students share the same hostel WiFi, their user quotas are completely independent!
    const cleanUserId = userId ? String(userId).trim() : null;

    if (cleanUserId && cleanUserId !== 'null' && cleanUserId !== 'undefined') {
      const userRecord = userBuckets.get(cleanUserId) || { count: 0, resetAt: now + USER_WINDOW_MS };
      if (now > userRecord.resetAt) {
        userRecord.count = 0;
        userRecord.resetAt = now + USER_WINDOW_MS;
      }

      if (userRecord.count >= USER_MAX_REQUESTS) {
        const retryAfter = Math.max(1, Math.ceil((userRecord.resetAt - now) / 1000));
        return {
          allowed: false,
          error: `You've reached your temporary AI scan limit (${USER_MAX_REQUESTS} scans per 15 min). Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
          retryAfterSeconds: retryAfter,
        };
      }

      // Increment both
      userRecord.count += 1;
      userBuckets.set(cleanUserId, userRecord);

      ipRecord.count += 1;
      ipBuckets.set(ip, ipRecord);

      return { allowed: true };
    }

    // 3. Anonymous / Non-Logged In User:
    // Apply conservative individual IP limit for unauthenticated direct requests
    if (ipRecord.count >= ANONYMOUS_IP_MAX_REQUESTS) {
      const retryAfter = Math.max(1, Math.ceil((ipRecord.resetAt - now) / 1000));
      return {
        allowed: false,
        error: 'Too many anonymous scan requests. Please log in or wait a few minutes before scanning again.',
        retryAfterSeconds: retryAfter,
      };
    }

    ipRecord.count += 1;
    ipBuckets.set(ip, ipRecord);

    return { allowed: true };
  } catch (err) {
    // FAIL-OPEN: Never break a student's upload if rate limiter encounters an error
    console.warn('AiRateLimit: Fail-open on exception:', err);
    return { allowed: true };
  }
}
