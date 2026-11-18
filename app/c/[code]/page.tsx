'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useApp } from '@/context/AppContext';
import { SignInPanel } from '@/components/auth/SignInPrompt';
import { IntersemesterLogo } from '@/components/ui/IntersemesterLogo';
import { Loader2, ScanQr } from '@/components/ui/icons';
import { CheckInOutcome, CheckInScanner, PENDING_CHECKIN_KEY, useCheckIn } from '@/components/attendance/CheckIn';
import { codeFromScan } from '@/lib/attendanceLive';

// Where a phone camera lands after scanning the teacher's QR (app.intersemester.com/c/<code>).
// In the app (Android opens these links in it) and on the web alike: check in straight away.
// If the code has gone stale on the way (sign-in, slow network), the camera is right here to scan again.
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.intersemester.app';

export default function CheckInLinkPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user, isClerkLoaded } = useApp();
  const { state, submit, reset } = useCheckIn();
  const [rescan, setRescan] = useState(false);
  const [native, setNative] = useState(true);
  const sent = useRef(false);

  const code = useMemo(() => {
    try {
      return codeFromScan(decodeURIComponent(params?.code || ''));
    } catch {
      return null;
    }
  }, [params?.code]);

  useEffect(() => setNative(Capacitor.isNativePlatform()), []);

  // Signed in: send the code from the link right away (it's only good for a few seconds)
  useEffect(() => {
    if (!isClerkLoaded || !user?.id || !code || sent.current) return;
    sent.current = true;
    submit(code);
  }, [isClerkLoaded, user?.id, code, submit]);

  const home = () => router.replace('/');
  const scanAgain = () => {
    reset();
    setRescan(true);
  };

  let body: React.ReactNode;
  if (!isClerkLoaded) {
    body = (
      <div className="py-f6 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  } else if (!user?.id) {
    body = (
      <SignInPanel
        title="Sign in to check in"
        body="Use your college account. Then scan the QR on the screen again: the camera opens right after you sign in."
        perks={['Checked in from your seat', 'No roll call', 'Your attendance % in every subject']}
        beforeSignIn={() => {
          try {
            localStorage.setItem(PENDING_CHECKIN_KEY, String(Date.now()));
          } catch {}
        }}
      />
    );
  } else if (rescan && state.phase === 'idle') {
    body = (
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg text-center">Scan the QR again</h1>
        <p className="mt-1 mb-f4 text-[14px] text-muted text-center">It changes every few seconds. Point your camera at the screen.</p>
        <CheckInScanner onCode={submit} />
      </div>
    );
  } else if (!code && state.phase === 'idle') {
    body = (
      <div className="text-center">
        <ScanQr className="w-8 h-8 mx-auto text-muted" />
        <h1 className="mt-f3 text-[21px] font-semibold tracking-tight text-fg">That&apos;s not an attendance QR</h1>
        <p className="mt-1.5 text-[14px] text-muted">Scan the QR your teacher is showing.</p>
        <button type="button" onClick={scanAgain} className="btn btn-primary btn-lg mt-f5 w-full max-w-[320px]">
          <ScanQr className="w-5 h-5" /> Scan
        </button>
      </div>
    );
  } else {
    body = <CheckInOutcome state={state} onRescan={scanAgain} onRetry={submit} onDone={home} doneLabel="Open Intersemester" />;
  }

  return (
    <main className="min-h-[100dvh] bg-canvas flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <header className="h-14 px-f4 flex items-center justify-center border-b border-line-soft">
        <IntersemesterLogo size="sm" showTagline={false} />
      </header>
      <div className="flex-1 w-full max-w-md mx-auto px-f4 py-f5 flex flex-col justify-center">{body}</div>
      {!native && (
        <footer className="px-f4 pb-f4 text-center">
          <a href={PLAY_URL} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg underline underline-offset-4">
            Get the Android app: check in with one tap next time
          </a>
        </footer>
      )}
    </main>
  );
}
