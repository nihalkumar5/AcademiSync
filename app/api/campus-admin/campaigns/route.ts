import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { collegeKeyOf, istDate, requireCampusScope } from '@/lib/server/campusAdmin';
import { sendPush, tokensFromUserDoc } from '@/lib/server/push';

export const dynamic = 'force-dynamic';

// Campus admins create/edit/pause/delete notices & ads for THEIR college only. The audience is always
// locked to that college on the server; branch/semester targeting inside it is optional.
// A notice can also be pushed to students' phones once (limited per college per day).

const CATEGORIES = ['movie', 'merch', 'event', 'deal', 'general'];
const MAX_LIVE_PER_COLLEGE = 10;
const MAX_PUSHES_PER_DAY = 3;
const MAX_IMAGE_CHARS = 950_000; // data URL; keeps the doc under Firestore's 1 MB limit

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isHttps = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
};

function cleanCampaign(c: any) {
  const title = text(c?.title, 60);
  const targetUrl = text(c?.targetUrl, 500);
  if (!title) throw new HttpError(400, 'Add a headline');
  if (!isHttps(targetUrl)) throw new HttpError(400, 'Use a full https:// link');

  let imageUrl = typeof c?.imageUrl === 'string' ? c.imageUrl.trim() : '';
  if (imageUrl && !(isHttps(imageUrl) || /^data:image\/(jpeg|png|webp);base64,/.test(imageUrl))) imageUrl = '';
  if (imageUrl.length > MAX_IMAGE_CHARS) throw new HttpError(400, 'Banner image is too large');

  const branches = Array.isArray(c?.targetBranches)
    ? c.targetBranches.filter((b: unknown) => typeof b === 'string' && b.trim()).map((b: string) => b.trim().slice(0, 80)).slice(0, 24)
    : [];
  const semesters = Array.isArray(c?.targetSemesters)
    ? c.targetSemesters.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 12).slice(0, 12)
    : [];
  const expiresAt = typeof c?.expiresAt === 'string' && !Number.isNaN(Date.parse(c.expiresAt)) ? new Date(c.expiresAt).toISOString() : null;

  return {
    title,
    subtitle: text(c?.subtitle, 110),
    description: text(c?.description, 600),
    imageUrl,
    ctaText: text(c?.ctaText, 30) || 'Learn more',
    targetUrl,
    category: CATEGORIES.includes(c?.category) ? c.category : 'general',
    badgeText: text(c?.badgeText, 24),
    targetBranches: branches,
    targetSemesters: semesters,
    isActive: c?.isActive !== false,
    expiresAt,
  };
}

const matchesTargets = (p: any, branches: string[], sems: number[]) => {
  const b = (p.branch || '').toLowerCase().trim();
  const branchOk = branches.length === 0 || (!!b && branches.some((x) => b.includes(x.toLowerCase()) || x.toLowerCase().includes(b)));
  const semOk = sems.length === 0 || sems.includes(Number(p.semester));
  return branchOk && semOk;
};

async function pushNotice(collegeKey: string, campaignId: string, campaign: any): Promise<number> {
  // Daily limit per college (IST), counted in a transaction so parallel saves can't exceed it
  const quotaRef = adminDb.collection('campus_push_quota').doc(`${collegeKey}_${istDate()}`);
  await adminDb.runTransaction(async (tx: any) => {
    const q = await tx.get(quotaRef);
    const used = q.exists ? Number(q.data()?.count || 0) : 0;
    if (used >= MAX_PUSHES_PER_DAY) {
      throw new HttpError(429, `Daily limit reached: ${MAX_PUSHES_PER_DAY} notifications per day for your college. Saved without notification.`);
    }
    tx.set(quotaRef, { collegeKey, count: used + 1, updatedAt: Date.now() }, { merge: true });
  });

  const usersSnap = await adminDb.collection('users').select('profile', 'fcmToken', 'webPushTokens').get();
  const targets: ReturnType<typeof tokensFromUserDoc> = [];
  usersSnap.forEach((d: any) => {
    const data = d.data() || {};
    const p = data.profile || {};
    if (collegeKeyOf(p.college) !== collegeKey) return;
    if (!matchesTargets(p, campaign.targetBranches, campaign.targetSemesters)) return;
    targets.push(...tokensFromUserDoc(d.id, data));
  });

  const res = await sendPush(targets, {
    title: `📢 ${campaign.title}`,
    body: campaign.subtitle || campaign.description || 'New notice from your campus',
    data: { type: 'campus_notice', campaignId },
    link: '/',
  });
  await adminDb.collection('promotional_campaigns').doc(campaignId).update({ pushSentAt: new Date().toISOString(), pushRecipients: res.sent });
  return res.sent;
}

export async function POST(req: Request) {
  try {
    const scope = await requireCampusScope(req);
    if (scope instanceof NextResponse) return scope;
    const key = scope.collegeKey;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request');
    const col = adminDb.collection('promotional_campaigns');

    // Existing campaign must belong to this college
    const id = typeof body.id === 'string' && body.id && !body.id.includes('/') ? body.id : '';
    let existing: any = null;
    if (id) {
      const snap = await col.doc(id).get();
      if (!snap.exists) throw new HttpError(404, 'Notice not found');
      existing = snap.data();
      if (existing.ownerCollegeKey !== key) throw new HttpError(403, 'This notice belongs to another college');
    }

    if (body.action === 'delete') {
      if (!existing) throw new HttpError(400, 'Notice id is required');
      await col.doc(id).delete();
      return NextResponse.json({ success: true });
    }

    if (body.action === 'toggle') {
      if (!existing) throw new HttpError(400, 'Notice id is required');
      const next = !existing.isActive;
      if (next) {
        const live = await col.where('ownerCollegeKey', '==', key).where('isActive', '==', true).get();
        if (live.size >= MAX_LIVE_PER_COLLEGE) throw new HttpError(429, `You can have up to ${MAX_LIVE_PER_COLLEGE} live notices at a time`);
      }
      await col.doc(id).update({ isActive: next, updatedAt: new Date().toISOString() });
      return NextResponse.json({ success: true, isActive: next });
    }

    if (body.action !== 'save') throw new HttpError(400, 'Unknown action');

    const c = cleanCampaign(body.campaign);
    if (c.isActive && (!existing || !existing.isActive)) {
      const live = await col.where('ownerCollegeKey', '==', key).where('isActive', '==', true).get();
      if (live.size >= MAX_LIVE_PER_COLLEGE) throw new HttpError(429, `You can have up to ${MAX_LIVE_PER_COLLEGE} live notices at a time`);
    }

    const now = new Date().toISOString();
    const doc = {
      ...c,
      expiresAt: c.expiresAt || null,
      // Audience is always this college (names for older app versions, key for exact matching)
      targetAudienceType: 'custom',
      targetColleges: [scope.college],
      targetCollegeKeys: [key],
      ownerCollegeKey: key,
      ownerCollege: scope.college,
      ownerUid: scope.uid,
      ownerRole: 'campus_admin',
      updatedAt: now,
    };

    let campaignId = id;
    if (existing) {
      await col.doc(id).update(doc);
    } else {
      const ref = await col.add({ ...doc, impressions: 0, clicks: 0, createdAt: now });
      campaignId = ref.id;
    }

    // Optional push, once per notice, only while it's live
    let pushed: number | null = null;
    let pushError = '';
    if (body.sendPush === true && c.isActive && !existing?.pushSentAt) {
      try {
        pushed = await pushNotice(key, campaignId, doc);
      } catch (e) {
        pushError = e instanceof HttpError ? e.message : 'Saved, but the notification could not be sent';
        if (!(e instanceof HttpError)) logServerError('CampusNoticePush', e);
      }
    }

    return NextResponse.json({ success: true, id: campaignId, pushed, pushError });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    logServerError('CampusAdminCampaigns', error);
    return NextResponse.json({ success: false, error: 'Could not save the notice' }, { status: 500 });
  }
}
