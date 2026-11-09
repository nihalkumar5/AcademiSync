import { useCallback, useEffect, useState } from 'react';
import type { MyAttendance } from './attendanceStudent';

// Client side of a student's own attendance: one API call, cached for a couple of minutes so
// hopping between pages doesn't refetch. The record itself is built on the server.
const FRESH_MS = 2 * 60 * 1000;
let cache: { uid: string; at: number; data: MyAttendance } | null = null;

export const fetchMyAttendance = async (): Promise<MyAttendance> => {
  const { getAuthHeaders } = await import('./authHeaders');
  const res = await fetch('/api/attendance/student', { headers: await getAuthHeaders({}), cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false || !data?.attendance) {
    throw new Error(data?.error || "Couldn't load your attendance");
  }
  return data.attendance as MyAttendance;
};

export function useMyAttendance(uid?: string | null) {
  const cached = uid && cache && cache.uid === uid ? cache : null;
  const [state, setState] = useState<{ data: MyAttendance | null; loading: boolean; error: string | null; at: number | null }>({
    data: cached?.data || null,
    loading: !!uid && !cached,
    error: null,
    at: cached?.at || null,
  });

  const load = useCallback(
    async (force = false) => {
      if (!uid) return;
      if (!force && cache && cache.uid === uid && Date.now() - cache.at < FRESH_MS) {
        setState({ data: cache.data, loading: false, error: null, at: cache.at });
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await fetchMyAttendance();
        cache = { uid, at: Date.now(), data };
        setState({ data, loading: false, error: null, at: cache.at });
      } catch (e: any) {
        setState((s) => ({ ...s, loading: false, error: e?.message || "Couldn't load your attendance" }));
      }
    },
    [uid]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: () => load(true) };
}
