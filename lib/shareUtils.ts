import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

export async function shareLink({ title, text, url, dialogTitle = 'Share via' }: ShareOptions): Promise<'shared' | 'copied' | 'error'> {
  // 1. Capacitor Native Share Sheet
  try {
    const isCap = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNativePlatform?.());
    if (isCap) {
      // Capacitor Share on Android/iOS natively appends the `url` parameter to the shared text.
      // Passing `${text} ${url}` alongside `url` caused double link printing.
      await Share.share({
        title,
        text: text ? text.trim() : undefined,
        url,
        dialogTitle,
      });
      return 'shared';
    }
  } catch (e: any) {
    if (e?.message?.includes('canceled') || e?.message?.includes('dismissed') || e?.name === 'AbortError') {
      return 'shared';
    }
    console.warn('Capacitor Share failed, attempting fallback:', e);
  }

  // 2. Web Share API (Chrome / Mobile browsers / Web)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: text ? text.trim() : undefined,
        url,
      });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError' || e?.message?.includes('canceled')) {
        return 'shared';
      }
      console.warn('Navigator share failed, falling back to clipboard:', e);
    }
  }

  // 3. Fallback: Copy to Clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      const copyContent = text ? `${text.trim()}\n\n${url}` : url;
      await navigator.clipboard.writeText(copyContent);
      return 'copied';
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }

  return 'error';
}
