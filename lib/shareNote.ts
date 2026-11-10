import { Capacitor, registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { blobToBase64 } from './notePhotos';

// Send a note (text + its photo) out through the phone's share sheet: WhatsApp, Telegram, Drive…
// The photo goes phone-to-phone, so nothing is uploaded to our servers.
//
// - Browser / iPhone Home Screen app: Web Share with files.
// - Android app: Capacitor Share needs a file on disk, written with the Filesystem plugin. That plugin
//   is only in APKs built after `npm i @capacitor/filesystem && npx cap sync android`; older APKs
//   share the text alone.
// - Nothing else available: open WhatsApp with the text.

export type ShareResult = 'shared' | 'text-only' | 'cancelled' | 'error';

type FilesystemPlugin = {
  writeFile(o: { path: string; data: string; directory: string }): Promise<{ uri: string }>;
};
// Registered on first use: on the server (SSR) @capacitor/core is stubbed out, so this must not run at import
let filesystem: FilesystemPlugin | null = null;
const getFilesystem = () => (filesystem ??= registerPlugin<FilesystemPlugin>('Filesystem'));

const isCancel = (e: any) => e?.name === 'AbortError' || /cancel|dismiss/i.test(String(e?.message || ''));

export async function shareNoteExternally(opts: { title: string; text: string; photo?: Blob | null }): Promise<ShareResult> {
  const { title, text, photo } = opts;
  const native = Capacitor.isNativePlatform();

  if (native) {
    try {
      if (photo && Capacitor.isPluginAvailable('Filesystem')) {
        const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
        const data = (await blobToBase64(photo)).replace(/^data:[^,]+,/, '');
        const { uri } = await getFilesystem().writeFile({ path: `note-${Date.now()}.${ext}`, data, directory: 'CACHE' });
        await Share.share({ title, text, files: [uri], dialogTitle: 'Share note' });
        return 'shared';
      }
      await Share.share({ title, text, dialogTitle: 'Share note' });
      return photo ? 'text-only' : 'shared';
    } catch (e) {
      if (isCancel(e)) return 'cancelled';
      console.warn('Native note share failed:', e);
      return 'error';
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (photo) {
        const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
        const file = new File([photo], `note.${ext}`, { type: photo.type || 'image/jpeg' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title, text, files: [file] });
          return 'shared';
        }
      }
      await navigator.share({ title, text });
      return photo ? 'text-only' : 'shared';
    } catch (e) {
      if (isCancel(e)) return 'cancelled';
      console.warn('Web note share failed:', e);
    }
  }

  // Desktop browsers without a share sheet: open WhatsApp with the text
  try {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    return photo ? 'text-only' : 'shared';
  } catch {
    return 'error';
  }
}

/** The text that goes out with a shared note. */
export const noteShareText = (n: { subjectName: string; date: string; text: string }) => {
  const d = new Date(`${n.date}T00:00:00`);
  const when = isNaN(d.getTime()) ? n.date : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return [`📚 ${n.subjectName || 'Class'} · ${when}`, n.text?.trim(), '— shared from Intersemester'].filter(Boolean).join('\n\n');
};
