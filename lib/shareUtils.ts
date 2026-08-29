import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

/**
 * Universal Share Helper:
 * 1. Opens native Android/iOS share sheet via @capacitor/share
 * 2. Falls back to Web Share API (navigator.share) on supported browsers
 * 3. Falls back to clipboard copy if share is not supported
 * Returns: 'shared' | 'copied' | 'error'
 */
export async function shareLink({ title, text, url, dialogTitle = 'Share via' }: ShareOptions): Promise<'shared' | 'copied' | 'error'> {
  // 1. Capacitor Native Share Sheet
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text: text ? `${text}\n${url}` : url,
        url,
        dialogTitle,
      });
      return 'shared';
    } catch (e: any) {
      if (e?.message?.includes('canceled') || e?.message?.includes('dismissed')) {
        return 'shared';
      }
      console.warn('Capacitor Share failed, attempting fallback:', e);
    }
  }

  // 2. Web Share API (Chrome, Safari on Mobile & Desktop)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: text ? `${text}\n${url}` : url,
        url,
      });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return 'shared';
      }
      console.warn('Navigator share failed, falling back to clipboard:', e);
    }
  }

  // 3. Fallback: Copy to Clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }

  return 'error';
}
