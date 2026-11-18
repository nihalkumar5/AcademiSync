// Client side of QR check-in: API calls, this phone's id, and the rotating code on the teacher's screen.
// The rules and shapes live in ./attendanceLiveShared (also used by the server).
import {
  CheckinErrorCode,
  CheckinOk,
  LIVE,
  LiveCheckin,
  LiveInfo,
  LiveStray,
  OpenCheckin,
  checkinUrl,
  formatCode,
  macInput,
  MAC_HEX,
  tickAt,
} from './attendanceLiveShared';

export * from './attendanceLiveShared';

export class LiveError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const call = async (url: string, method: 'GET' | 'POST', body?: unknown) => {
  const { getAuthHeaders } = await import('./authHeaders');
  let res: Response;
  try {
    res = await fetch(url, { method, cache: 'no-store', headers: await getAuthHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch {
    throw new LiveError('offline', "You're offline. Check your internet and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const code = data?.code || (res.status === 401 ? 'unauthenticated' : res.status === 429 ? 'rate-limited' : 'error');
    throw new LiveError(code, data?.error || 'Something went wrong. Try again.');
  }
  return data;
};

// ---------- Teacher ----------
export interface LiveState {
  live: LiveInfo;
  serverNow: number;
  checkins: LiveCheckin[];
  strays: LiveStray[];
}
export interface OpenedLive extends LiveState {
  secret: string;
}

export const openLive = (input: { batchKey: string; batchLabel: string; subjectName: string; date: string; startTime: string; endTime?: string }): Promise<OpenedLive> =>
  call('/api/attendance/live', 'POST', { action: 'open', ...input });

export const pollLive = (id: string, since: number): Promise<LiveState> => call(`/api/attendance/live?id=${encodeURIComponent(id)}&since=${Math.max(0, Math.floor(since))}`, 'GET');

export const closeLive = (id: string): Promise<LiveState> => call('/api/attendance/live', 'POST', { action: 'close', id });

const b64urlToBytes = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

/**
 * Makes the QR's code for any 3-second slot on the teacher's own device, so the QR keeps changing
 * on time even if the network is slow. `offset` keeps it on the server's clock, not the device's.
 */
export const makeCodeClock = (liveId: string, secret: string) => {
  let key: Promise<CryptoKey> | null = null;
  const cache = new Map<number, string>();
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined;
  return {
    available: !!subtle,
    async code(tick: number): Promise<string> {
      const hit = cache.get(tick);
      if (hit) return hit;
      if (!subtle) throw new Error('No WebCrypto');
      key ||= subtle.importKey('raw', b64urlToBytes(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = new Uint8Array(await subtle.sign('HMAC', await key, new TextEncoder().encode(macInput(liveId, tick))));
      const mac = Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, MAC_HEX);
      const code = formatCode(liveId, tick, mac);
      cache.set(tick, code);
      if (cache.size > 8) cache.delete(cache.keys().next().value as number);
      return code;
    },
  };
};

/** Server time = device time + offset, measured from each reply (half the round trip either way). */
export const clockOffset = (serverNow: number, sentAt: number, gotAt: number) => serverNow - (sentAt + gotAt) / 2;

export const currentTick = (offset: number) => tickAt(Date.now() + offset);
/** 0 → 1 through the current 3-second slot (for the little countdown under the QR). */
export const slotProgress = (offset: number) => ((Date.now() + offset) % LIVE.periodMs) / LIVE.periodMs;

export const qrLink = (code: string) => checkinUrl(typeof window !== 'undefined' ? window.location.origin : 'https://app.intersemester.com', code);

// ---------- Student ----------
const DEVICE_KEY = 'is_device_v1';
let memoryDevice = '';
/** A random id for this phone/browser, so one phone checks in one student per lecture. */
export const deviceId = () => {
  const make = () => {
    const b = new Uint8Array(18);
    crypto.getRandomValues(b);
    return btoa(Array.from(b, (c) => String.fromCharCode(c)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  try {
    let v = localStorage.getItem(DEVICE_KEY);
    if (!v || !/^[A-Za-z0-9_-]{16,64}$/.test(v)) {
      v = make();
      localStorage.setItem(DEVICE_KEY, v);
    }
    return v;
  } catch {
    return (memoryDevice ||= make());
  }
};

export const checkIn = (code: string): Promise<CheckinOk> => call('/api/attendance/checkin', 'POST', { code, device: deviceId() });

export const fetchOpenCheckins = async (): Promise<OpenCheckin[]> => (await call('/api/attendance/checkin', 'GET')).open || [];

/** Error codes a student can see after scanning. */
export const checkinErrorCode = (err: unknown): CheckinErrorCode | 'offline' => {
  const c = (err as any)?.code;
  return (
    ['expired-code', 'closed', 'not-on-list', 'device-used', 'faculty', 'invalid', 'rate-limited', 'unauthenticated', 'offline'].includes(c) ? c : 'error'
  ) as CheckinErrorCode | 'offline';
};
