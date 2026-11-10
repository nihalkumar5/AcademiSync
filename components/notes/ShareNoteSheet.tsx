'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { FriendPicker } from '@/components/friends/FriendPicker';
import { friendsApi } from '@/components/friends/friendsClient';
import type { PersonLite } from '@/lib/friends';
import { MAX_SHARED_IMAGE_KB, MyNote, notesApi } from '@/lib/classNotes';
import { blobToBase64, compressPhoto, getPhoto } from '@/lib/notePhotos';
import { Loader2, Lock } from '@/components/ui/icons';

// Share one of my notes with particular friends. Text goes as is; the first photo (kept on this
// phone) is compressed and sent along, since friends can't see photos stored on my device.
export const ShareNoteSheet: React.FC<{
  note: MyNote | null;
  onClose: () => void;
  onShared: (count: number) => void;
  onFindFriends: () => void;
}> = ({ note, onClose, onShared, onFindFriends }) => {
  const [friends, setFriends] = useState<PersonLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!note) return;
    setPicked([]);
    setError('');
    let alive = true;
    setLoading(true);
    friendsApi('POST', { action: 'listFriends' })
      .then((d) => alive && setFriends(d.friends || []))
      .catch((e) => alive && setError(e?.message || "Couldn't load your friends"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [note?.id]);

  if (!note) return null;
  const photoCount = note.photos.length;

  const share = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    setError('');
    try {
      let image: string | undefined;
      if (note.photos[0]) {
        let blob = await getPhoto(note.photos[0]);
        if (blob) {
          if (blob.size > (MAX_SHARED_IMAGE_KB - 20) * 1024) blob = await compressPhoto(blob, 1280, 0.6);
          if (blob.size > (MAX_SHARED_IMAGE_KB - 20) * 1024) blob = await compressPhoto(blob, 1024, 0.5);
          if (blob.size <= (MAX_SHARED_IMAGE_KB - 20) * 1024) image = await blobToBase64(blob);
        }
      }
      if (!note.text.trim() && !image) throw new Error("This note's photo isn't on this phone, and there's no text to send");
      const res = await notesApi('POST', '', {
        action: 'shareFriends',
        subjectId: note.subjectId,
        subjectName: note.subjectName,
        date: note.date,
        startTime: note.startTime,
        text: note.text,
        ...(image ? { image } : {}),
        to: picked,
      });
      onShared(res?.recipients || picked.length);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Couldn't share. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={!!note} onClose={onClose} title="Share with friends">
      <div className="flex flex-col gap-f4">
        <div className="p-f3 border border-line">
          <p className="text-[13px] font-semibold text-muted">{note.subjectName}</p>
          {note.text ? (
            <p className="mt-1 text-[14px] text-fg whitespace-pre-wrap break-words line-clamp-3">{note.text}</p>
          ) : (
            <p className="mt-1 text-[14px] text-muted">Photo note</p>
          )}
          {photoCount > 0 && <p className="mt-1.5 text-[12px] text-faint">{photoCount > 1 ? `The first of ${photoCount} photos is sent` : '1 photo is sent'}</p>}
        </div>

        <FriendPicker friends={friends} loading={loading} picked={picked} onChange={setPicked} onFindFriends={onFindFriends} />

        <p className="flex items-start gap-2 text-[13px] text-muted">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Only the friends you pick can see it. They get a notification, and you can unshare it any time.
        </p>

        {error && <p className="text-[13px] text-rose-600 dark:text-rose-400">{error}</p>}

        <button
          type="button"
          disabled={!picked.length || busy}
          onClick={share}
          className="h-12 inline-flex items-center justify-center gap-2 bg-ink text-on-ink text-[15px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {picked.length ? `Share with ${picked.length} ${picked.length === 1 ? 'friend' : 'friends'}` : 'Pick friends to share with'}
        </button>
      </div>
    </Modal>
  );
};
