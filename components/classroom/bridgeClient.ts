'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BridgeStatus } from '@/lib/classroomShared';

export class BridgeApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

export const bridgeApi = async (method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<BridgeStatus & { result?: any }> => {
  const { getAuthHeaders } = await import('@/lib/authHeaders');
  const res = await fetch('/api/classroom', {
    method,
    headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new BridgeApiError(data.error || 'Something went wrong. Try again.', data.code);
  return data;
};

// One shared copy for the card and the sheet, refreshed at most every 2 minutes unless asked
let cache: { data: BridgeStatus; at: number } | null = null;
const listeners = new Set<(d: BridgeStatus) => void>();
const publish = (d: BridgeStatus) => {
  cache = { data: d, at: Date.now() };
  listeners.forEach((l) => l(d));
};

export function useClassroomBridge(enabled: boolean) {
  const [data, setData] = useState<BridgeStatus | null>(cache?.data || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<BridgeApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const l = (d: BridgeStatus) => alive.current && setData(d);
    listeners.add(l);
    return () => {
      alive.current = false;
      listeners.delete(l);
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (!force && cache && Date.now() - cache.at < 120_000) {
        setData(cache.data);
        return;
      }
      setLoading(true);
      try {
        publish(await bridgeApi('GET'));
        setError(null);
      } catch (e: any) {
        if (alive.current) setError(e instanceof BridgeApiError ? e : new BridgeApiError(e?.message || 'Could not load'));
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    load();
  }, [load]);

  /** Run an action; the server answers with the fresh status. */
  const act = useCallback(async (action: string, body: Record<string, unknown> = {}, tag = action) => {
    setBusy(tag);
    try {
      const d = await bridgeApi('POST', { action, ...body });
      publish(d);
      setError(null);
      return d;
    } finally {
      if (alive.current) setBusy(null);
    }
  }, []);

  return { data, loading, error, busy, load, act };
}

export const timeAgo = (iso: string | null) => {
  if (!iso) return 'not yet';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

export const dueText = (iso: string | null) => {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  return `Due ${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
};
