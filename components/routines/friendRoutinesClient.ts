import { useCallback, useEffect, useState } from 'react';
import type { RoutineSharesData } from '@/lib/friends';
import type { Routine } from '@/lib/types';
import { friendsApi } from '@/components/friends/friendsClient';

// Routines shared with particular friends. Everything goes through /api/friends so the server
// checks that each person really is an accepted friend.

const EMPTY: RoutineSharesData = { friends: [], incoming: [], outgoing: {} };

export function useFriendRoutines(uid?: string | null) {
  const [data, setData] = useState<RoutineSharesData>(EMPTY);
  const [loading, setLoading] = useState(!!uid);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await friendsApi('POST', { action: 'routineShares' });
      setData({ ...EMPTY, ...(d.data || {}) });
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'offline');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  /** Share this routine with exactly these friends ([] stops sharing). */
  const share = async (routine: Routine, to: string[]) => {
    const { id, title, category, notes, time, durationMinutes, repeat, days, date, remindBefore } = routine;
    const res = await friendsApi('POST', {
      action: 'shareRoutine',
      routine: { id, title, category, notes, time, durationMinutes, repeat, days, date, remindBefore },
      to,
    });
    const recipients: string[] = res.recipients || [];
    setData((d) => {
      const outgoing = { ...d.outgoing };
      if (recipients.length) outgoing[routine.id] = recipients;
      else delete outgoing[routine.id];
      return { ...d, outgoing };
    });
    return recipients;
  };

  /** I added it to my routines, or I don't want it. Removes it from the incoming list. */
  const mark = async (id: string, answer: 'added' | 'dismissed') => {
    setData((d) => ({ ...d, incoming: d.incoming.filter((x) => x.id !== id) }));
    try {
      await friendsApi('POST', { action: 'markRoutine', id, answer });
    } catch {
      load();
    }
  };

  return { ...data, loading, error, reload: load, share, mark };
}
