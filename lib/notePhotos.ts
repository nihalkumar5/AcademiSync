// Lecture photos kept on the phone, not in the cloud (zero storage cost).
// IndexedDB works the same in the Android app's WebView, the browser and the iPhone PWA.
// Photos are shrunk to ~1600px WebP first, so a whiteboard shot is ~100–200 KB instead of 5 MB.

const DB = 'intersemester-notes';
const STORE = 'photos';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Resolves only once the transaction has COMMITTED (not just when the request succeeds),
// so a refresh right after saving can't lose the photo.
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
    t.onerror = () => {
      db.close();
      reject(t.error || r.error);
    };
    t.onabort = () => {
      db.close();
      reject(t.error || new Error('Could not save the photo'));
    };
  });
};

/** Ask the browser not to clear our storage when space is low (best effort). */
export const keepPhotosSafe = () => {
  try {
    (navigator as any).storage?.persist?.();
  } catch {}
};

/** Shrink a photo: longest side ≤ maxSide, WebP (JPEG where WebP can't be written). */
export const compressPhoto = (file: Blob, maxSide = 1600, quality = 0.72): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('Could not process the photo'));
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (webp) => {
          if (webp && webp.type === 'image/webp') return resolve(webp);
          canvas.toBlob((jpg) => (jpg ? resolve(jpg) : reject(new Error('Could not process the photo'))), 'image/jpeg', quality);
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a photo we can read"));
    };
    img.src = url;
  });

export const savePhoto = async (blob: Blob): Promise<string> => {
  keepPhotosSafe();
  const id = `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await tx('readwrite', (s) => s.put({ id, blob, createdAt: Date.now() }));
  keepPhotosSafe();
  return id;
};

export const getPhoto = async (id: string): Promise<Blob | null> => {
  try {
    const row: any = await tx('readonly', (s) => s.get(id));
    return row?.blob || null;
  } catch {
    return null;
  }
};

export const deletePhoto = async (id: string) => {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {}
};

export const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
