// Class-linked notes: shared model + the app's API calls.
// - My notes: text lives in the cloud (tiny), photos stay on this phone (lib/notePhotos.ts).
// - Class notes: shared with the whole batch, one copy for everyone (text + one compressed photo).

export interface NoteSlot {
  subjectId: string;
  subjectName: string;
  subjectColor?: string;
  isLab?: boolean;
  date: string; // yyyy-mm-dd
  startTime?: string;
  endTime?: string;
  room?: string;
  focus?: 'camera' | 'text';
}

export interface MyNote {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;
  startTime: string;
  text: string;
  photos: string[]; // ids of photos kept on the device that took them
  createdAt: string;
}

export interface SharedNote {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;
  startTime: string;
  text: string;
  imageUrl: string | null; // short-lived signed link
  byName: string;
  mine: boolean;
  canDelete: boolean;
  createdAt: string;
}

/** A note shared with particular friends (friend_notes/{id}). `sentTo` > 0 when I sent it. */
export interface FriendNote extends SharedNote {
  sentTo: number;
}

/** Stable key for a subject: its name, normalised. Subject ids can change (re-sync, de-dupe),
 *  names don't, so notes are matched by either. */
export const subjectKeyOf = (name: string | undefined | null) =>
  (name || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 100);

export const MAX_NOTE_CHARS = 1000;
export const MAX_SHARED_IMAGE_KB = 400;

/** Open the notes sheet for a class from anywhere in the app. */
export const openClassNotes = (slot: NoteSlot) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('classnotes:open', { detail: slot }));
};

/** Date (yyyy-mm-dd) of a weekday in the current week (Mon–Sun). */
export const dateOfWeekday = (day: string, from = new Date()) => {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const target = names.indexOf(day);
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (target < 0) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIdx = (d.getDay() + 6) % 7; // Monday = 0
  const targetIdx = (target + 6) % 7;
  d.setDate(d.getDate() + (targetIdx - todayIdx));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const notesApi = async (method: 'GET' | 'POST', query = '', body?: unknown) => {
  const { getAuthHeaders } = await import('./authHeaders');
  const res = await fetch(`/api/class-notes${query}`, {
    method,
    headers: await getAuthHeaders(),
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const err: any = new Error(data?.error || 'Something went wrong. Try again.');
    err.code = data?.code;
    throw err;
  }
  return data;
};
