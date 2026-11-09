import { useCallback, useEffect, useState } from 'react';
import type { FriendsData } from '@/lib/friends';

// One fetch for the Friends page and the Home card, cached for a minute.
let cache: { uid: string; at: number; data: FriendsData } | null = null;
const listeners = new Set<() => void>();

export const friendsApi = async (method: 'GET' | 'POST', body?: unknown) => {
  const { getAuthHeaders } = await import('@/lib/authHeaders');
  const res = await fetch('/api/friends', { method, headers: await getAuthHeaders(), cache: 'no-store', ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const err: any = new Error(data?.error || 'Something went wrong. Try again.');
    err.code = data?.code;
    throw err;
  }
  return data;
};

export function useFriends(uid?: string | null) {
  const fresh = uid && cache && cache.uid === uid ? cache : null;
  const [data, setData] = useState<FriendsData | null>(fresh?.data || null);
  const [loading, setLoading] = useState(!!uid && !fresh);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!uid) return;
      if (!force && cache && cache.uid === uid && Date.now() - cache.at < 60_000) {
        setData(cache.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const d = await friendsApi('GET');
        cache = { uid, at: Date.now(), data: d.data };
        setData(d.data);
        setError(null);
        listeners.forEach((f) => f());
      } catch (e: any) {
        setError({ message: e.message, code: e.code });
      } finally {
        setLoading(false);
      }
    },
    [uid]
  );

  useEffect(() => {
    load();
    const sync = () => cache && cache.uid === uid && setData(cache.data);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [load, uid]);

  return { data, loading, error, reload: () => load(true) };
}
