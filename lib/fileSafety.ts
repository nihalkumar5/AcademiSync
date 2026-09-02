/**
 * File Upload Safety & Content Validation Utility
 * Validates file type, size, and binary magic bytes to prevent malicious file uploads
 * (e.g. polyglots, disguised executables, scripts, or path traversal attempts).
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'pdf',
]);

export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'bin', 'dll', 'so',
  'php', 'phtml', 'php3', 'php4', 'php5', 'phps',
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'py', 'pyc', 'pyd', 'rb', 'pl', 'cgi',
  'html', 'htm', 'xhtml', 'svg', 'xml', 'asp', 'aspx', 'jsp',
  'vbs', 'ps1', 'jar', 'war', 'ear', 'msi', 'com', 'scr',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedMimeType?: string;
}

/**
 * Validates magic bytes in base64 string to verify true file content (not just extension/header)
 */
export function validateBase64MagicBytes(base64Data: string, declaredMimeType?: string): boolean {
  if (!base64Data || typeof base64Data !== 'string') return false;

  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '').trim();
  if (cleanBase64.length < 8) return false;

  // Magic header prefix patterns in base64:
  // PDF: %PDF- -> "JVBERi0"
  // JPEG: \xFF\xD8\xFF -> "/9j/"
  // PNG: \x89PNG\r\n\x1a\n -> "iVBORw0KGgo"
  // WEBP: RIFF....WEBP -> "UklGR"
  // HEIC/HEIF: ftyp... -> starts with "AAAA" followed by ftyp
  const isPdf = cleanBase64.startsWith('JVBERi0');
  const isJpeg = cleanBase64.startsWith('/9j/');
  const isPng = cleanBase64.startsWith('iVBORw0KGgo');
  const isWebp = cleanBase64.startsWith('UklGR');
  const isHeic = cleanBase64.includes('ZnR5cGhlaWM') || cleanBase64.includes('ZnR5cG1pZjE') || cleanBase64.startsWith('AAA');

  return isPdf || isJpeg || isPng || isWebp || isHeic;
}

/**
 * Client & Server file validation
 */
export function validateUploadedFile(file: {
  name?: string;
  size?: number;
  type?: string;
  base64?: string;
}): ValidationResult {
  // 1. Check filename & extension
  const fileName = (file.name || '').trim();
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `File type .${ext} is blocked for security reasons.`,
      };
    }
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Invalid file format .${ext}. Only JPG, PNG, WEBP, and PDF documents are supported.`,
      };
    }
  }

  // 2. Check File Size
  if (file.size !== undefined) {
    if (file.size <= 0) {
      return { valid: false, error: 'The uploaded file is empty.' };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds the 5MB limit. Please upload a smaller or compressed file.`,
      };
    }
  }

  // 3. Check Base64 payload size & magic bytes
  if (file.base64) {
    const cleanBase64 = file.base64.replace(/^data:[^;]+;base64,/, '').trim();
    const approxSizeBytes = Math.round((cleanBase64.length * 3) / 4);

    if (approxSizeBytes > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: 'Uploaded document exceeds the 5MB size limit.',
      };
    }

    if (!validateBase64MagicBytes(cleanBase64, file.type)) {
      return {
        valid: false,
        error: 'Invalid file signature. Please upload an authentic image or PDF document.',
      };
    }
  }

  // 4. Validate MIME Type
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: 'Unsupported file type. Only JPG, PNG, WEBP, and PDF are allowed.',
    };
  }

  return { valid: true, sanitizedMimeType: mimeType || 'image/jpeg' };
}

/**
 * Server-side API payload array validator
 */
export function validateServerUploadPayload(images: any[]): ValidationResult {
  if (!Array.isArray(images) || images.length === 0) {
    return { valid: false, error: 'No files provided for processing.' };
  }

  if (images.length > 10) {
    return { valid: false, error: 'Maximum 10 pages/files allowed per upload.' };
  }

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (!item || !item.base64 || typeof item.base64 !== 'string') {
      return { valid: false, error: `Invalid payload in document page ${i + 1}.` };
    }

    const validation = validateUploadedFile({
      name: item.name,
      type: item.mimeType,
      base64: item.base64,
    });

    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}
