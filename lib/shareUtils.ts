import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.intersemester.app';

export interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function shareLink({ title, text, url, dialogTitle = 'Share via' }: ShareOptions): Promise<'shared' | 'copied' | 'error'> {
  const resolvedUrl = url?.trim() || (!text?.includes(PLAY_STORE_URL) ? PLAY_STORE_URL : undefined);

  // 1. Capacitor Native Share Sheet
  try {
    const isCap = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNativePlatform?.());
    if (isCap) {
      await Share.share({
        title,
        text: text ? text.trim() : undefined,
        url: resolvedUrl,
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
      const sharePayload: ShareData = {
        title,
        text: text ? text.trim() : undefined,
      };
      if (resolvedUrl) {
        sharePayload.url = resolvedUrl;
      }
      await navigator.share(sharePayload);
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
      const cleanText = text?.trim() || '';
      const parts = [cleanText];
      if (resolvedUrl && !cleanText.includes(resolvedUrl)) {
        parts.push(resolvedUrl);
      }
      const copyContent = parts.filter(Boolean).join('\n\n');
      await navigator.clipboard.writeText(copyContent);
      return 'copied';
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }

  return 'error';
}
