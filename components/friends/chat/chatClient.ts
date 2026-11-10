import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { compressPhoto } from '@/lib/notePhotos';
import { friendsApi } from '@/components/friends/friendsClient';

// Friends chat: DMs and plan group chats, live from Firestore (firestore.rules guard who can do what).
// The server creates chats (/api/friends openChat / openPlanChat) and sends the push after a message.

export const MAX_CHAT_CHARS = 1000;
export const QUICK_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '🙏'];

const ms = (t: any): number => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : 0);

export interface ChatSummary {
  id: string;
  type: 'dm' | 'plan';
  members: string[];
  names: Record<string, string>;
  title?: string;
  planId?: string;
  at?: string;
  lastMessage: { by: string; text: string; at: number } | null;
  updatedAt: number;
  unread: boolean;
  /** uid -> when they last opened the chat / got it on their phone / were typing (ms) */
  reads: Record<string, number>;
  delivered: Record<string, number>;
  typing: Record<string, number>;
  /** uid -> when they cleared their chat history (they see only newer messages) */
  cleared: Record<string, number>;
}

const msMap = (o: any): Record<string, number> => {
  const out: Record<string, number> = {};
  if (o && typeof o === 'object') for (const k of Object.keys(o)) out[k] = ms(o[k]);
  return out;
};

export interface ChatMessage {
  id: string;
  by: string; // uid, or 'system'
  text: string;
  at: number; // 0 while the server time is pending
  reactions: Record<string, string>;
  pending: boolean;
  image?: ChatImage;
}

export interface ChatImage {
  url: string;
  path: string;
  w: number;
  h: number;
}

const imageOf = (x: any): ChatImage | undefined =>
  x && typeof x.url === 'string' && typeof x.path === 'string'
    ? { url: x.url, path: x.path, w: Number(x.w) || 1, h: Number(x.h) || 1 }
    : undefined;

/** All my chats, newest activity first, with an unread flag. */
export function useChats(uid?: string | null) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!uid) {
      setChats([]);
      setReady(true);
      return;
    }
    const q = query(collection(db, 'chats'), where('members', 'array-contains', uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const c: any = d.data({ serverTimestamps: 'estimate' });
          const last = c.lastMessage ? { by: c.lastMessage.by, text: c.lastMessage.text || '', at: ms(c.lastMessage.at) || Date.now() } : null;
          const readAt = ms(c.reads?.[uid]);
          const clearedAt = ms(c.cleared?.[uid]);
          return {
            id: d.id,
            type: c.type === 'plan' ? 'plan' : 'dm',
            members: c.members || [],
            names: c.names || {},
            title: c.title,
            planId: c.planId,
            at: c.at,
            lastMessage: last,
            updatedAt: ms(c.updatedAt) || last?.at || 0,
            unread: !!last && last.by !== uid && last.at > readAt && last.at > clearedAt,
            reads: msMap(c.reads),
            delivered: msMap(c.delivered),
            typing: msMap(c.typing),
            cleared: msMap(c.cleared),
          } as ChatSummary;
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setChats(list);
        setReady(true);
      },
      (err) => {
        console.warn('Chats unavailable:', err);
        setReady(true);
      }
    );
  }, [uid]);
  return { chats, ready, unreadCount: chats.filter((c) => c.unread).length };
}

/** The latest messages of one chat, oldest first. */
export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setMessages([]);
    setError(null);
    if (!chatId) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('at', 'desc'), limit(120));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const m: any = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              by: m.by,
              text: m.text || '',
              at: ms(m.at),
              reactions: m.reactions || {},
              pending: d.metadata.hasPendingWrites,
              image: imageOf(m.image),
            } as ChatMessage;
          })
          .reverse();
        setMessages(list);
      },
      (err) => {
        console.warn('Messages unavailable:', err);
        setError(err.code === 'permission-denied' ? 'denied' : 'offline');
      }
    );
  }, [chatId]);
  return { messages, error };
}

export async function sendMessage(chatId: string, uid: string, raw: string) {
  const text = raw.trim().slice(0, MAX_CHAT_CHARS);
  if (!text) return;
  await addDoc(collection(db, 'chats', chatId, 'messages'), { by: uid, text, at: serverTimestamp() });
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { by: uid, text: text.slice(0, 160), at: serverTimestamp() },
    updatedAt: serverTimestamp(),
    [`reads.${uid}`]: serverTimestamp(),
    [`typing.${uid}`]: deleteField(),
  }).catch(() => {});
  friendsApi('POST', { action: 'chatPing', chatId }).catch(() => {});
}

/** Delete chat history for me only: I stop seeing everything sent before now. */
export const clearChat = (chatId: string, uid: string) =>
  updateDoc(doc(db, 'chats', chatId), { [`cleared.${uid}`]: serverTimestamp(), [`reads.${uid}`]: serverTimestamp() });

/** Tell the chat I'm typing (true) or stopped (false). */
export const setTyping = (chatId: string, uid: string, on: boolean) =>
  updateDoc(doc(db, 'chats', chatId), { [`typing.${uid}`]: on ? serverTimestamp() : deleteField() }).catch(() => {});

/** App-wide: once a new message reaches this phone, mark it delivered (the sender's double tick). */
export function useMarkDelivered(uid?: string | null) {
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'chats'), where('members', 'array-contains', uid));
    return onSnapshot(
      q,
      (snap) => {
        snap.docs.forEach((d) => {
          if (d.metadata.hasPendingWrites) return;
          const c: any = d.data();
          const last = c.lastMessage;
          if (!last || last.by === uid || last.by === 'system') return;
          const at = ms(last.at);
          if (at && at > ms(c.delivered?.[uid])) {
            updateDoc(d.ref, { [`delivered.${uid}`]: serverTimestamp() }).catch(() => {});
          }
        });
      },
      () => {}
    );
  }, [uid]);
}

export const markRead = (chatId: string, uid: string) =>
  updateDoc(doc(db, 'chats', chatId), { [`reads.${uid}`]: serverTimestamp() }).catch(() => {});

/** Set my reaction on a message (same emoji again removes it). */
export const reactTo = (chatId: string, messageId: string, uid: string, emoji: string | null) =>
  updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { [`reactions.${uid}`]: emoji ? emoji : deleteField() });

export const deleteMessage = async (chatId: string, m: { id: string; image?: ChatImage }) => {
  await deleteDoc(doc(db, 'chats', chatId, 'messages', m.id));
  if (m.image?.path) {
    try {
      const { getStorage, ref, deleteObject } = await import('firebase/storage');
      await deleteObject(ref(getStorage(app), m.image.path));
    } catch {}
  }
};

const sizeOf = (blob: Blob) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ w: 1, h: 1 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

/** Shrink, upload and send a photo (with an optional caption). */
export async function sendPhoto(chatId: string, uid: string, file: Blob, caption = '', onProgress?: (pct: number) => void) {
  const small = await compressPhoto(file, 1600, 0.75);
  const { w, h } = await sizeOf(small);
  const ext = small.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `chat_photos/${chatId}/${uid}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  const task = uploadBytesResumable(ref(getStorage(app), path), small, { contentType: small.type });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', (s) => onProgress?.(s.totalBytes ? Math.round((s.bytesTransferred / s.totalBytes) * 100) : 0), reject, () => resolve());
  });
  const url = await getDownloadURL(task.snapshot.ref);
  const text = caption.trim().slice(0, MAX_CHAT_CHARS);
  await addDoc(collection(db, 'chats', chatId, 'messages'), { by: uid, text, at: serverTimestamp(), image: { url, path, w, h } });
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { by: uid, text: (text ? `📷 ${text}` : '📷 Photo').slice(0, 160), at: serverTimestamp() },
    updatedAt: serverTimestamp(),
    [`reads.${uid}`]: serverTimestamp(),
    [`typing.${uid}`]: deleteField(),
  }).catch(() => {});
  friendsApi('POST', { action: 'chatPing', chatId }).catch(() => {});
}

export const openDmChat = async (otherUid: string): Promise<string> => (await friendsApi('POST', { action: 'openChat', uid: otherUid })).chatId;
export const openPlanChat = async (planId: string): Promise<string> => (await friendsApi('POST', { action: 'openPlanChat', id: planId })).chatId;
export const reportChat = (chatId: string, messageId?: string, reason?: string) => friendsApi('POST', { action: 'reportChat', chatId, messageId, reason });
export const blockPerson = (uid: string) => friendsApi('POST', { action: 'block', uid });
