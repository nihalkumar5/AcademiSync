// Files attached to an assignment (question sheet photos, PDFs). Kept on this device in IndexedDB,
// not in the cloud, so they cost nothing to store. The assignment itself only remembers id/name/type/size.
import { compressPhoto } from '@/lib/notePhotos';

export interface TaskFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

export const MAX_TASK_FILES = 6;
export const MAX_TASK_FILE_MB = 10;
const OK_TYPES = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

const DB = 'intersemester-files';
const STORE = 'files';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Resolves only after the transaction commits, so a refresh right after saving can't lose the file
const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    let result: T;
    r.onsuccess = () => (result = r.result);
    t.oncomplete = () => {
      db.close();
      resolve(result);
    };
    t.onerror = t.onabort = () => {
      db.close();
      reject(t.error || r.error || new Error('Could not save the file'));
    };
  });
};

export const isAllowedTaskFile = (f: File) => OK_TYPES.test(f.type) || /\.(pdf|jpe?g|png|webp|heic)$/i.test(f.name);

/** Save a picked file. Photos are shrunk first; PDFs are kept as they are. */
export const saveTaskFile = async (file: File): Promise<TaskFile> => {
  if (!isAllowedTaskFile(file)) throw new Error('Add a photo or a PDF');
  if (file.size > MAX_TASK_FILE_MB * 1024 * 1024) throw new Error(`Files up to ${MAX_TASK_FILE_MB} MB`);
  let blob: Blob = file;
  let type = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  if (type.startsWith('image/')) {
    try {
      blob = await compressPhoto(file, 2000, 0.8);
      type = blob.type || type;
    } catch {
      blob = file;
    }
  }
  try {
    (navigator as any).storage?.persist?.();
  } catch {}
  const id = `tf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await tx('readwrite', (s) => s.put({ id, blob, name: file.name, type, createdAt: Date.now() }));
  return { id, name: file.name.slice(0, 120), type, size: blob.size };
};

export const getTaskFile = async (id: string): Promise<Blob | null> => {
  try {
    const row: any = await tx('readonly', (s) => s.get(id));
    return row?.blob || null;
  } catch {
    return null;
  }
};

export const deleteTaskFile = async (id: string) => {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {}
};

/** Open a stored file in a new tab (PDF viewer / image). Returns false if it isn't on this device. */
export const openTaskFile = async (f: TaskFile): Promise<boolean> => {
  const blob = await getTaskFile(f.id);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
};

export const fileSizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
