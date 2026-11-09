// Gets a one-time Google authorization code for the Classroom bridge. The server swaps it for long-lived,
// read-only access, so the pilot connects once and never sees a popup again.
// - Android app: native Google sign-in (Google blocks OAuth pages inside app WebViews)
// - Browser: Google Identity Services popup. It does NOT touch the Firebase login, so the app account never switches.
import { CLASSROOM_SCOPES, GOOGLE_WEB_CLIENT_ID } from '@/lib/classroomShared';

export class ConnectCancelled extends Error {}

let gisLoading: Promise<void> | null = null;
const loadGis = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'));
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisLoading = null;
        reject(new Error("Couldn't reach Google. Check your connection."));
      };
      document.head.appendChild(s);
    });
  }
  return gisLoading;
};

export async function getClassroomAuthCode(): Promise<{ code: string; platform: 'web' | 'native' }> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    await GoogleAuth.initialize({
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ['profile', 'email', ...CLASSROOM_SCOPES],
      grantOfflineAccess: true,
    });
    try {
      await GoogleAuth.signOut(); // show the account picker every time
    } catch {}
    let user: any;
    try {
      user = await GoogleAuth.signIn();
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (/cancel|12501|closed/i.test(msg)) throw new ConnectCancelled('cancelled');
      throw new Error("Google sign-in didn't finish. Try again.");
    }
    const code = user?.serverAuthCode;
    if (!code) throw new Error("Google didn't return a sign-in code. Try again.");
    return { code, platform: 'native' };
  }

  await loadGis();
  return new Promise((resolve, reject) => {
    const g = (window as any).google;
    const client = g.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: ['openid', 'email', ...CLASSROOM_SCOPES].join(' '),
      ux_mode: 'popup',
      select_account: true,
      callback: (resp: any) => {
        if (resp?.code) resolve({ code: resp.code, platform: 'web' });
        else if (resp?.error === 'access_denied') reject(new ConnectCancelled('cancelled'));
        else reject(new Error(resp?.error_description || 'Google sign-in failed. Try again.'));
      },
      error_callback: (err: any) => {
        if (err?.type === 'popup_closed') reject(new ConnectCancelled('cancelled'));
        else if (err?.type === 'popup_failed_to_open') reject(new Error('Your browser blocked the Google window. Allow popups and try again.'));
        else reject(new Error('Google sign-in failed. Try again.'));
      },
    });
    client.requestCode();
  });
}
