import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { adminDb } from '@/lib/firebase-admin';
import { logServerError } from '@/lib/errorUtils';
import { getVerifiedUser } from '@/lib/serverAuth';
import { AttendanceError, Caller, consumeQuota, getAll, getAudit, loadProfile, logExport } from '@/lib/server/attendanceService';
import { buildAttendanceWorkbook, reportFileName, ReportBatch } from '@/lib/server/attendanceReport';
import { AuditEntry, isValidDateKey } from '@/lib/attendanceShared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Excel report of a faculty's own attendance records.
//   POST {batchKey|'all', subject?, from?, to?, tz?, delivery:'file'}  → the .xlsx (web)
//   POST {..., delivery:'link'}                                         → { url } one-time link (app)
//   GET  ?token=…                                                       → the .xlsx, once, within 2 minutes
// Every report that leaves the system is written to the batch's change log.

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const LINK_TTL_MS = 2 * 60 * 1000;
const fail = (status: number, error: string, code?: string) => NextResponse.json({ success: false, error, code }, { status, headers: NO_STORE });

interface Params {
  batchKey: string;
  subject?: string;
  from?: string;
  to?: string;
  tz: string;
}

const validTz = (tz: unknown) => {
  if (typeof tz !== 'string' || tz.length > 64) return 'Asia/Kolkata';
  try {
    new Intl.DateTimeFormat('en-IN', { timeZone: tz });
    return tz;
  } catch {
    return 'Asia/Kolkata';
  }
};

const readParams = (b: any): Params => {
  const batchKey = typeof b?.batchKey === 'string' && b.batchKey.length <= 200 && !b.batchKey.includes('/') ? b.batchKey : 'all';
  const subject = typeof b?.subject === 'string' && b.subject && b.subject !== 'all' && b.subject.length <= 120 ? b.subject : undefined;
  let from = isValidDateKey(b?.from) ? b.from : undefined;
  let to = isValidDateKey(b?.to) ? b.to : undefined;
  if (from && to && from > to) [from, to] = [to, from];
  return { batchKey, subject, from, to, tz: validTz(b?.tz) };
};

const dayLabel = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
const localDay = (iso: string, tz: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });

async function generate(caller: Caller, p: Params) {
  const [{ rosters, sessions }, profile] = await Promise.all([getAll(adminDb, caller), loadProfile(adminDb, caller.uid)]);
  const chosen = p.batchKey === 'all' ? rosters : rosters.filter((r) => r.batchKey === p.batchKey);
  if (!chosen.length) throw new AttendanceError(404, 'not-found', 'No attendance records for this batch yet');

  const inRange = (d: string) => (!p.from || d >= p.from) && (!p.to || d <= p.to);
  const linked: any[] = Array.isArray(profile.facultyLinkedBatches) ? profile.facultyLinkedBatches : [];
  const batches: ReportBatch[] = chosen
    .map((r) => ({
      batchKey: r.batchKey,
      label: r.batchLabel || linked.find((b) => b?.batchKey === r.batchKey)?.batchName || r.batchKey,
      roster: r,
      sessions: sessions.filter((s) => s.batchKey === r.batchKey && inRange(s.date) && (!p.subject || s.subjectName === p.subject)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const auditLists = await Promise.all(batches.map((b) => getAudit(adminDb, caller, b.batchKey, undefined, 5000)));
  const audit: AuditEntry[] = auditLists
    .flat()
    .filter((e) => inRange(localDay(e.at, p.tz)) && (!p.subject || !e.subjectName || e.subjectName === p.subject));

  const all = batches.flatMap((b) => b.sessions).map((s) => s.date).sort();
  const periodLabel =
    p.from && p.to
      ? `${dayLabel(p.from)} – ${dayLabel(p.to)}`
      : p.from
      ? `From ${dayLabel(p.from)}`
      : p.to
      ? `Up to ${dayLabel(p.to)}`
      : all.length
      ? `All lectures (${dayLabel(all[0])} – ${dayLabel(all[all.length - 1])})`
      : 'All lectures';

  const facultyName = `${profile.facultyTitle || 'Prof.'} ${String(profile.name || 'Faculty').trim()}`;
  const buffer = await buildAttendanceWorkbook({
    facultyName,
    facultyEmail: caller.email || undefined,
    institution: profile.college || undefined,
    department: profile.facultyDepartment || undefined,
    subject: p.subject,
    periodLabel,
    generatedAt: new Date(),
    timeZone: p.tz,
    batches,
    audit,
  });

  const lectures = batches.reduce((a, b) => a + b.sessions.length, 0);
  await logExport(
    adminDb,
    caller,
    batches.map((b) => b.batchKey),
    `Excel report downloaded: ${p.subject || 'all subjects'} · ${periodLabel} · ${lectures} lectures${batches.length > 1 ? ` · ${batches.length} batches` : ''}`
  );

  const name = reportFileName(batches.length > 1 ? 'All-batches' : batches[0].label, p.from, p.to);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...NO_STORE,
      'Content-Type': XLSX,
      'Content-Disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Content-Length': String(buffer.length),
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getVerifiedUser(req);
    if (!user) return fail(401, 'Sign in to download reports', 'unauthenticated');
    const caller: Caller = { uid: user.uid, email: user.email };
    const body = await req.json().catch(() => null);
    const p = readParams(body);
    await consumeQuota(adminDb, caller.uid, 'export');

    if (body?.delivery === 'link') {
      // For the app: a short-lived, single-use link the system browser can download from
      const token = randomBytes(32).toString('hex');
      await adminDb.collection('attendance_exports').doc(token).set({
        uid: caller.uid,
        email: caller.email || null,
        // Firestore rejects undefined, so store only the filters that are set
        params: JSON.parse(JSON.stringify(p)),
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + LINK_TTL_MS,
        used: false,
      });
      return NextResponse.json({ success: true, url: `/api/attendance/report?token=${token}` }, { headers: NO_STORE });
    }
    return await generate(caller, p);
  } catch (err) {
    if (err instanceof AttendanceError) return fail(err.status, err.message, err.code);
    logServerError('attendance report POST', err);
    return fail(500, "Couldn't create the report. Try again.");
  }
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return fail(400, 'Invalid link');
  try {
    const ref = adminDb.collection('attendance_exports').doc(token);
    const claim = await adminDb.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      const d = snap.data();
      if (d.used || Date.now() > d.expiresAt) return null;
      tx.update(ref, { used: true, usedAt: new Date().toISOString() });
      return d;
    });
    if (!claim) return fail(410, 'This download link has expired. Go back to the app and download the report again.', 'expired');
    return await generate({ uid: claim.uid, email: claim.email }, claim.params as Params);
  } catch (err) {
    if (err instanceof AttendanceError) return fail(err.status, err.message, err.code);
    logServerError('attendance report GET', err);
    return fail(500, "Couldn't create the report. Try again.");
  }
}
