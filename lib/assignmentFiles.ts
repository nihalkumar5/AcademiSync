// Assignment files in Firebase Storage: assignments/{facultyUid}/{timestamp}_{name}
// Only the uploading faculty can write or delete under their folder (see storage.rules);
// signed-in users can read, and students open the file through its download link.
// The Storage SDK is loaded only when a faculty actually attaches a file.
import { app } from './firebase';

export const MAX_ASSIGNMENT_FILE_MB = 25;
const ACCEPT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
/** For the file input's accept attribute. */
export const ASSIGNMENT_FILE_ACCEPT = Object.keys(ACCEPT_TYPES)
  .map((e) => `.${e}`)
  .join(',');

export interface UploadedFile {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Checks a file before uploading; returns a message for the person, or null if fine. */
export const checkAssignmentFile = (file: File): string | null => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ACCEPT_TYPES[ext]) return 'Use a PDF, Word, PowerPoint, Excel, image, text or ZIP file.';
  if (file.size > MAX_ASSIGNMENT_FILE_MB * 1024 * 1024) return `That file is ${formatBytes(file.size)}. The limit is ${MAX_ASSIGNMENT_FILE_MB} MB.`;
  if (file.size === 0) return 'That file is empty.';
  return null;
};

export interface UploadHandle {
  promise: Promise<UploadedFile>;
  cancel: () => void;
}

export const uploadAssignmentFile = (uid: string, file: File, onProgress: (pct: number) => void): UploadHandle => {
  let cancelFn: () => void = () => {};
  const promise = (async () => {
    const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const type = ACCEPT_TYPES[ext] || file.type || 'application/octet-stream';
    const safe = file.name.replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_').slice(-80) || `file.${ext}`;
    const path = `assignments/${uid}/${Date.now()}_${safe}`;
    const task = uploadBytesResumable(ref(getStorage(app), path), file, {
      contentType: type,
      customMetadata: { originalName: file.name.slice(0, 200) },
    });
    cancelFn = () => task.cancel();
    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (s) => onProgress(s.totalBytes ? Math.round((s.bytesTransferred / s.totalBytes) * 100) : 0),
        reject,
        () => resolve()
      );
    });
    const url = await getDownloadURL(task.snapshot.ref);
    return { url, path, name: file.name, size: file.size, type };
  })();
  return { promise, cancel: () => cancelFn() };
};

/** Remove a file that was attached but not posted (best effort). */
export const deleteAssignmentFile = async (path: string) => {
  try {
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    await deleteObject(ref(getStorage(app), path));
  } catch {}
};

/** Human message for a failed upload. */
export const uploadErrorText = (err: any) => {
  const code = String(err?.code || '');
  if (code === 'storage/canceled') return '';
  if (code === 'storage/unauthorized') return "Upload isn't allowed yet. Storage rules need to be deployed.";
  if (code === 'storage/quota-exceeded') return 'Storage is full. Try a smaller file.';
  if (code === 'storage/retry-limit-exceeded') return 'Upload kept failing. Check your connection and try again.';
  return "Couldn't upload the file. Check your connection and try again.";
};
