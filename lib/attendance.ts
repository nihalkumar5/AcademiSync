import { useEffect, useState } from 'react';

// Client side of attendance: API calls, a small shared cache and React hooks.
// The record model and rules live in ./attendanceShared (also used by the server).
export * from './attendanceShared';
import { rosterId, studentStats, byRoll } from './attendanceShared';
import type { Roster, AttendanceSession, RosterStudent, AuditEntry } from './attendanceShared';


// ---------- Server API ----------
// Reads and writes go through /api/attendance (Admin SDK + ID-token checks), so attendance works
// the same on web and in the app regardless of which Firestore rules are deployed.
const api = async (method: 'GET' | 'POST', query = '', body?: unknown) => {
  const { getAuthHeaders } = await import('./authHeaders');
  const res = await fetch(`/api/attendance${query}`, {
    method,
    headers: await getAuthHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const err: any = new Error(data?.error || 'Request failed');
    err.code = data?.code || (res.status === 401 ? 'unauthenticated' : res.status === 403 ? 'permission-denied' : 'error');
    throw err;
  }
  return data;
};

// One small shared cache per faculty+batch, so switching batches back and forth is instant
interface Entry {
  roster: Roster | null;
  sessions: AttendanceSession[];
  loading: boolean;
  error: string | null;
}
const store = new Map<string, Entry>();
const subs = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();
const emit = (key: string) => subs.get(key)?.forEach((f) => f());
const sortSessions = (list: AttendanceSession[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
const patch = (key: string, fn: (e: Entry) => Entry) => {
  const cur = store.get(key);
  if (!cur) return;
  store.set(key, fn(cur));
  emit(key);
};

const load = (facultyId: string, batchKey: string) => {
  const key = rosterId(facultyId, batchKey);
  if (inflight.has(key)) return inflight.get(key)!;
  if (!store.has(key)) store.set(key, { roster: null, sessions: [], loading: true, error: null });
  const p = (async () => {
    try {
      const data = await api('GET', `?batchKey=${encodeURIComponent(batchKey)}`);
      store.set(key, { roster: data.roster || null, sessions: sortSessions(data.sessions || []), loading: false, error: null });
    } catch (err: any) {
      console.warn('Attendance unavailable:', err);
      store.set(key, { ...store.get(key)!, loading: false, error: err?.code || 'error' });
    } finally {
      inflight.delete(key);
      emit(key);
    }
  })();
  inflight.set(key, p);
  emit(key);
  return p;
};

/** Every class list and lecture this faculty has recorded, across all batches. */
export const fetchAllAttendance = async (): Promise<{ rosters: Roster[]; sessions: AttendanceSession[] }> => {
  const data = await api('GET', '?all=1');
  return { rosters: data.rosters || [], sessions: sortSessions(data.sessions || []) };
};

/** Fetch again (e.g. the Retry button). */
export const reloadAttendance = (facultyId: string, batchKey: string) => {
  const key = rosterId(facultyId, batchKey);
  const cur = store.get(key);
  if (cur) store.set(key, { ...cur, loading: !cur.roster, error: null });
  return load(facultyId, batchKey);
};

const useEntry = (facultyId: string | undefined, batchKey: string | undefined): Entry | null => {
  const key = facultyId && batchKey ? rosterId(facultyId, batchKey) : '';
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!key) return;
    const fn = () => rerender((n) => n + 1);
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key)!.add(fn);
    load(facultyId!, batchKey!); // show cached data at once, refresh in the background
    return () => {
      subs.get(key)?.delete(fn);
    };
  }, [key]);
  if (!key) return null;
  return store.get(key) || { roster: null, sessions: [], loading: true, error: null };
};

/** Human message for a failed attendance call (server messages are already written for people). */
export const attendanceErrorText = (err: any) => {
  switch (err?.code) {
    case 'permission-denied':
      return "This batch isn't linked to your faculty account.";
    case 'unauthenticated':
      return 'Your sign-in has expired. Sign in again.';
    case 'conflict':
    case 'rate-limited':
    case 'invalid':
    case 'no-roster':
    case 'not-found':
      return err.message;
    default:
      return 'Check your connection and try again.';
  }
};

/** On a version conflict the cached batch is refreshed, so the screen shows what's really saved. */
const refreshOnConflict = (facultyId: string, batchKey: string, err: any) => {
  if (err?.code === 'conflict') reloadAttendance(facultyId, batchKey);
  throw err;
};

/** Save/lock a class list. `baseVersion` = the version you edited (null when creating). */
export const saveRoster = async (r: Roster) => {
  try {
    const data = await api('POST', '', { action: 'saveRoster', batchKey: r.batchKey, roster: r, baseVersion: r.version ?? null });
    patch(rosterId(r.facultyId, r.batchKey), (e) => ({ ...e, roster: data.roster || r, error: null }));
    return (data.roster || r) as Roster;
  } catch (err) {
    return refreshOnConflict(r.facultyId, r.batchKey, err);
  }
};

/** Save one lecture. Pass the version you opened (or null for a new lecture). */
export const saveSession = async (facultyId: string, batchKey: string, s: AttendanceSession, baseVersion: number | null) => {
  try {
    const data = await api('POST', '', { action: 'saveSession', batchKey, session: s, baseVersion });
    const saved: AttendanceSession = { ...(data.session || s), batchKey };
    patch(rosterId(facultyId, batchKey), (e) => ({ ...e, sessions: sortSessions([...e.sessions.filter((x) => x.id !== saved.id), saved]) }));
    return saved;
  } catch (err) {
    return refreshOnConflict(facultyId, batchKey, err);
  }
};

/** Moves the lecture to Recently deleted (restorable). */
export const deleteSession = async (facultyId: string, batchKey: string, id: string, baseVersion?: number) => {
  try {
    await api('POST', '', { action: 'deleteSession', batchKey, id, ...(typeof baseVersion === 'number' ? { baseVersion } : {}) });
    patch(rosterId(facultyId, batchKey), (e) => ({ ...e, sessions: e.sessions.filter((x) => x.id !== id) }));
  } catch (err) {
    return refreshOnConflict(facultyId, batchKey, err);
  }
};

export interface DeletedSession extends AttendanceSession {
  deletedAt: string;
  deletedBy: string;
}

export const restoreSession = async (facultyId: string, batchKey: string, id: string) => {
  const data = await api('POST', '', { action: 'restoreSession', batchKey, id });
  const saved: AttendanceSession = { ...data.session, batchKey };
  patch(rosterId(facultyId, batchKey), (e) => ({ ...e, sessions: sortSessions([...e.sessions.filter((x) => x.id !== saved.id), saved]) }));
  return saved;
};

export const fetchTrash = async (): Promise<DeletedSession[]> => (await api('GET', '?trash=1')).items || [];

export const fetchAudit = async (batchKey: string, sessionIdFilter?: string): Promise<AuditEntry[]> =>
  (await api('GET', `?audit=1&batchKey=${encodeURIComponent(batchKey)}${sessionIdFilter ? `&sessionId=${encodeURIComponent(sessionIdFilter)}` : ''}`)).items || [];

export const useRoster = (facultyId: string | undefined, batchKey: string | undefined) => {
  const e = useEntry(facultyId, batchKey);
  return { roster: e?.roster ?? null, loading: e ? e.loading : false, error: e?.error ?? null };
};

export const useSessions = (facultyId: string | undefined, batchKey: string | undefined, _enabled = true) => {
  const e = useEntry(facultyId, batchKey);
  return e?.sessions ?? [];
};

// ---------- Excel report ----------
export interface ReportRequest {
  batchKey: string; // a batch key, or 'all'
  subject?: string;
  from?: string; // yyyy-mm-dd
  to?: string;
}

/**
 * Download the Excel report. Web: the file comes straight back and is saved.
 * App: the server issues a one-time, 2-minute link that the system browser downloads
 * (an app WebView can't save files itself).
 */
export const downloadAttendanceReport = async (req: ReportRequest) => {
  const { getAuthHeaders } = await import('./authHeaders');
  const { Capacitor } = await import('@capacitor/core');
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Asia/Kolkata';
    }
  })();
  const native = Capacitor.isNativePlatform();
  const res = await fetch('/api/attendance/report', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ ...req, tz, delivery: native ? 'link' : 'file' }),
  });
  const failWith = async () => {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data?.error || "Couldn't create the report");
    err.code = data?.code || (res.status === 401 ? 'unauthenticated' : res.status === 429 ? 'rate-limited' : 'error');
    throw err;
  };
  if (!res.ok) return failWith();

  if (native) {
    const data = await res.json();
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: new URL(data.url, window.location.origin).toString() });
    return;
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="([^"]+)"/);
  const name = m ? decodeURIComponent(m[1]) : 'Attendance.xlsx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// ---------- Batch members (from the server; users docs are owner-only) ----------
export interface MemberCandidate extends RosterStudent {
  email?: string;
}

export const fetchBatchMembers = async (batchKey: string): Promise<MemberCandidate[]> => {
  const { getAuthHeaders } = await import('./authHeaders');
  const { deduplicateBatchMembers } = await import('@/components/batch/BatchMembersModal');
  const res = await fetch(`/api/batch/members?batchKey=${encodeURIComponent(batchKey)}`, { headers: await getAuthHeaders({}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.members)) throw new Error(data.error || 'Could not load batch members');
  const unique = deduplicateBatchMembers(data.members);
  return unique
    .filter((m: any) => m?.profile?.role !== 'faculty')
    .map((m: any) => ({
      key: m.id,
      uid: m.id,
      name: (m.profile?.name || '').trim() || (m.profile?.email || '').split('@')[0] || 'Unnamed',
      roll: (m.profile?.rollNumber || '').trim().toUpperCase(),
      email: m.profile?.email,
    }))
    .sort(byRoll);
};
