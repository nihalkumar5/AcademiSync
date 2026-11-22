'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from '@/components/ui/icons';

// Live camera QR scanner. Uses the phone's built-in barcode detector where there is one (Android
// Chrome) and a small JS decoder everywhere else (iPhone, desktop), so scanning works on every phone.
type State = 'starting' | 'on' | 'unsupported' | 'denied';

type Decode = (video: HTMLVideoElement) => Promise<string | null>;

const makeDecoder = async (): Promise<Decode> => {
  const BD = (window as any).BarcodeDetector;
  if (BD) {
    try {
      const formats: string[] = (await BD.getSupportedFormats?.()) || ['qr_code'];
      if (formats.includes('qr_code')) {
        const detector = new BD({ formats: ['qr_code'] });
        return async (video) => {
          const found = await detector.detect(video);
          return found?.[0]?.rawValue || null;
        };
      }
    } catch {}
  }
  const jsQR = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!ctx || !video.videoWidth) return null;
    // A projected QR from the back row is small in the frame: keep enough pixels to read it
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    return jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' })?.data || null;
  };
};

export const QrScanner: React.FC<{
  /** Called with each QR read. Return true once it's the one you wanted, to stop scanning. */
  onRead: (raw: string) => boolean | void;
  /** Keep the camera on but stop reading (e.g. while a check-in is being sent). */
  paused?: boolean;
  hint?: string;
  /** What to show when the camera can't be used here. */
  fallback?: (state: 'unsupported' | 'denied') => React.ReactNode;
  className?: string;
}> = ({ onRead, paused = false, hint, fallback, className = '' }) => {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>('starting');
  const readRef = useRef(onRead);
  readRef.current = onRead;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => {});
        const decode = await makeDecoder();
        if (stopped) return;
        setState('on');
        const tick = async () => {
          if (stopped) return;
          if (!pausedRef.current && v.readyState >= 2) {
            try {
              const raw = await decode(v);
              if (raw && readRef.current(raw) === true) {
                stopped = true;
                return;
              }
            } catch {}
          }
          timer = setTimeout(tick, 180);
        };
        tick();
      } catch (e: any) {
        if (!stopped) setState(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied' : 'unsupported');
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (state === 'unsupported' || state === 'denied') {
    return (
      <>
        {fallback ? (
          fallback(state)
        ) : (
          <div className="rounded-card border border-line px-f4 py-f5 text-center">
            <Camera className="w-6 h-6 mx-auto text-muted" />
            <p className="mt-3 text-[15px] font-semibold text-fg">{state === 'denied' ? 'Camera is blocked' : "This phone can't scan here"}</p>
            <p className="mt-1 text-[13px] text-muted">
              {state === 'denied' ? 'Allow camera access for Intersemester in your phone settings, then try again.' : "Use your phone's camera app to scan instead."}
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`relative aspect-square w-full max-w-[340px] mx-auto bg-black overflow-hidden ${className}`}>
      <video ref={video} playsInline muted autoPlay className="w-full h-full object-cover" />
      {/* Viewfinder: four corners and a moving line */}
      <div className="absolute inset-[14%]" aria-hidden="true">
        {['top-0 left-0 border-t-[3px] border-l-[3px]', 'top-0 right-0 border-t-[3px] border-r-[3px]', 'bottom-0 left-0 border-b-[3px] border-l-[3px]', 'bottom-0 right-0 border-b-[3px] border-r-[3px]'].map((c) => (
          <span key={c} className={`absolute w-8 h-8 border-white ${c}`} />
        ))}
        {state === 'on' && !paused && <span className="ai-scanline" />}
      </div>
      {state === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}
      {hint && <p className="absolute bottom-3 inset-x-3 text-center text-[13px] font-medium text-white drop-shadow">{hint}</p>}
    </div>
  );
};
