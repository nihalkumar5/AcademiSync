// QR check-in ("no roll call"): the teacher's screen shows a QR that changes every few seconds and
// students scan it from their seats. This file is the pure part shared by the app and the server
// (no React, no Firebase): timing, the code format and the shapes the API returns.
//
// A code is `<liveId>-<tick>-<mac>`:
//   liveId  which lecture's check-in (8 chars)
//   tick    which 3-second slot it was shown in (base 36)
//   mac     HMAC-SHA256(secret, "<liveId>.<tick>"), first 12 hex chars. The secret never leaves the
//           server and the teacher's own device, so nobody can make a valid code for a slot that
//           hasn't been on screen, and a photo of the QR goes stale within seconds.

export const LIVE = {
  /** The QR changes this often. */
  periodMs: 3000,
  /** How many slots back a code still counts: about 12 s after it left the screen. */
  backTicks: 4,
  /** Slack for a teacher's device clock running a little ahead. */
  aheadTicks: 1,
  /** Check-in closes by itself after this long (the teacher can reopen it). */
  openMinutes: 15,
  /** How often the teacher's screen asks who has checked in. */
  pollMs: 2000,
} as const;

export const MAC_HEX = 12;
export const LIVE_ID_RE = /^[a-z0-9]{8}$/;
const CODE_RE = /^([a-z0-9]{8})-([a-z0-9]{1,10})-([0-9a-f]{12})$/;
const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;

export interface ParsedCode {
  liveId: string;
  tick: number;
  mac: string;
}

export const tickAt = (ms: number) => Math.floor(ms / LIVE.periodMs);
export const macInput = (liveId: string, tick: number) => `${liveId}.${tick}`;
export const formatCode = (liveId: string, tick: number, mac: string) => `${liveId}-${tick.toString(36)}-${mac}`;

export const parseCode = (raw: unknown): ParsedCode | null => {
  if (typeof raw !== 'string' || raw.length > 40) return null;
  const m = CODE_RE.exec(raw.trim().toLowerCase());
  if (!m) return null;
  const tick = parseInt(m[2], 36);
  if (!Number.isSafeInteger(tick) || tick < 0) return null;
  return { liveId: m[1], tick, mac: m[3] };
};

/** The link inside the QR. Any phone camera can open it; the app opens it directly. */
export const checkinUrl = (origin: string, code: string) => `${origin.replace(/\/+$/, '')}/c/${code}`;

/** Pull a check-in code out of whatever a camera read: our link (from any host) or a bare code. */
export const codeFromScan = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  let candidate = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    try {
      const m = new URL(candidate).pathname.match(/^\/c\/([^/?#]+)/);
      if (!m) return null;
      candidate = decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }
  return parseCode(candidate) ? candidate.trim().toLowerCase() : null;
};

/** Where a code's slot sits against the server's clock. */
export const codeAge = (tick: number, now: number): 'fresh' | 'stale' | 'ahead' => {
  const cur = tickAt(now);
  if (tick > cur + LIVE.aheadTicks) return 'ahead';
  if (tick < cur - LIVE.backTicks) return 'stale';
  return 'fresh';
};

export const isDeviceId = (v: unknown): v is string => typeof v === 'string' && DEVICE_RE.test(v);

// ---------- API shapes ----------

/** What the teacher's screen gets about its check-in (never includes classmates' data for students). */
export interface LiveInfo {
  id: string;
  batchKey: string;
  batchLabel: string;
  subjectName: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  expiresAt: number;
  /** Everyone on the class list */
  total: number;
  /** Of those, how many have an app account (only they can scan) */
  onApp: number;
}

export interface LiveCheckin {
  uid: string;
  key: string; // the class-list key (the student's uid)
  name: string;
  roll: string;
  at: number;
}

/** Someone who scanned but isn't on this teacher's class list. */
export interface LiveStray {
  uid: string;
  name: string;
  roll: string;
  at: number;
  /** They joined this batch in the app, so the teacher can add them to the list in one tap. */
  inBatch: boolean;
}

export interface CheckinOk {
  status: 'marked' | 'already';
  at: number;
  subjectName: string;
  facultyName: string;
  batchLabel: string;
  startTime: string;
}

export type CheckinErrorCode =
  | 'expired-code'
  | 'closed'
  | 'not-on-list'
  | 'device-used'
  | 'faculty'
  | 'invalid'
  | 'rate-limited'
  | 'unauthenticated'
  | 'error';

/** A check-in open right now for the signed-in student (for the Home prompt). */
export interface OpenCheckin {
  id: string;
  subjectName: string;
  facultyName: string;
  startTime: string;
  endTime?: string;
  checkedIn: boolean;
  at?: number;
}
