export interface ProcessedFile {
  name: string;
  base64: string;
  mimeType: string;
}

export async function processFileForAi(file: File, maxDim = 1600, quality = 0.85): Promise<ProcessedFile> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name,
          base64: (e.target?.result as string) || '',
          mimeType: 'application/pdf',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Compress and resize images via Canvas for fast upload and vision OCR
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = maxDim;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve({
            name: file.name,
            base64: compressed,
            mimeType: 'image/jpeg',
          });
        } else {
          resolve({
            name: file.name,
            base64: (e.target?.result as string) || '',
            mimeType: file.type || 'image/jpeg',
          });
        }
      };
      img.onerror = () => {
        resolve({
          name: file.name,
          base64: (e.target?.result as string) || '',
          mimeType: file.type || 'image/jpeg',
        });
      };
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => {
      resolve({
        name: file.name,
        base64: '',
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function processMultipleFilesForAi(files: File[]): Promise<ProcessedFile[]> {
  const promises = files.map((file) => processFileForAi(file));
  return Promise.all(promises);
}

// ---------- One upload path for every AI scan ----------
// Vercel takes at most 4.5 MB per request. Photos are shrunk on the phone (a 6 MB camera photo
// becomes ~400 KB, still sharp enough to read a timetable); PDFs can't be shrunk, so they count as is.
// If everything together is still too big, photos are shrunk further before giving up.

/** Base64 characters we send at most (leaves room for the rest of the JSON body) */
export const AI_UPLOAD_BUDGET = Math.floor(3.8 * 1024 * 1024);
const MAX_RAW_IMAGE_BYTES = 40 * 1024 * 1024; // phone photos are big; we shrink them anyway
const PDF_LIMIT_BYTES = Math.floor((AI_UPLOAD_BUDGET * 3) / 4); // ~2.8 MB of PDF fits in one request

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const isPdfFile = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name);

/** A problem the student can fix (shown as is) */
export class AiUploadError extends Error {}

/**
 * Turn picked files into what the AI routes take: images shrunk to JPEG, PDFs as they are,
 * everything together under the request limit. Throws AiUploadError with a plain message.
 */
export async function prepareAiUpload(files: File[], opts: { maxDim?: number; quality?: number; maxFiles?: number } = {}): Promise<ProcessedFile[]> {
  const maxFiles = opts.maxFiles ?? 10;
  if (files.length === 0) throw new AiUploadError('Pick a photo or PDF first.');
  if (files.length > maxFiles) throw new AiUploadError(`Up to ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'} at a time. Pick fewer pages.`);
  for (const f of files) {
    if (!isPdfFile(f) && !isImageFile(f)) throw new AiUploadError(`${f.name} isn't a photo or PDF.`);
    if (isPdfFile(f) && f.size > PDF_LIMIT_BYTES) throw new AiUploadError(`${f.name} is ${mb(f.size)}. Upload a PDF under ${mb(PDF_LIMIT_BYTES)}, or screenshots of the pages you need.`);
    if (!isPdfFile(f) && f.size > MAX_RAW_IMAGE_BYTES) throw new AiUploadError(`${f.name} is too large (${mb(f.size)}).`);
  }
  let dim = opts.maxDim ?? 2000;
  let quality = opts.quality ?? 0.82;
  for (let attempt = 0; attempt < 4; attempt++) {
    const out = await Promise.all(files.map((f) => processFileForAi(f, dim, quality)));
    if (out.some((f) => !f.base64)) throw new AiUploadError("Couldn't read one of the files. Try again or pick another.");
    const total = out.reduce((n, f) => n + f.base64.length, 0);
    if (total <= AI_UPLOAD_BUDGET) return out;
    const shrinkable = out.some((f) => f.mimeType === 'image/jpeg');
    if (!shrinkable) break;
    dim = Math.round(dim * 0.8);
    quality = Math.max(0.6, quality - 0.07);
  }
  const hasPdf = files.some(isPdfFile);
  throw new AiUploadError(
    hasPdf
      ? 'These files are too big to send together. Upload fewer pages, or the PDF on its own.'
      : 'These photos are too big to send together. Upload fewer pages at a time.'
  );
}

/** Read an AI route's answer; a timeout or "too large" page from the host becomes a plain message */
export async function readAiResponse(res: Response): Promise<any> {
  const fallback =
    res.status === 413
      ? 'These files are too big to send. Upload fewer pages at a time.'
      : res.status === 504 || res.status === 502 || res.status === 503
        ? 'The scan took too long. Try again, or upload fewer pages at a time.'
        : res.status === 429
          ? 'Please wait a few minutes before scanning again.'
          : 'Something went wrong while scanning. Try again.';
  try {
    const data = await res.json();
    if (data && typeof data === 'object') return res.ok || data.error ? data : { ...data, success: false, error: fallback };
  } catch {
    // not JSON (a host error page)
  }
  return { success: false, error: fallback };
}
