'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Clock, Loader2, RefreshCw, ScanQr, Smartphone, Users } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { QrScanner } from '@/components/ui/QrScanner';
import { haptic } from '@/lib/haptics';
import { formatTime12Hour } from '@/lib/timetableUtils';
import { CheckinOk, checkIn, checkinErrorCode, codeFromScan } from '@/lib/attendanceLive';

// The student's side of QR check-in: scan the teacher's QR (in the app, or with any phone camera
// through the link inside it) and get a clear answer either way.

export type CheckInState =
  | { phase: 'idle' }
  | { phase: 'sending'; code: string }
  | { phase: 'done'; result: CheckinOk }
  | { phase: 'error'; code: ReturnType<typeof checkinErrorCode>; message: string; lastCode: string };

// Phones only allow vibration after a tap; a check-in opened from a camera link has had none
const buzz = (kind: 'success' | 'error') => {
  if ((navigator as any).userActivation?.hasBeenActive === false) return;
  haptic(kind);
};

/** Pending sign-in from a scanned link: Home opens the scanner once they're back. */
export const PENDING_CHECKIN_KEY = 'pending_checkin';

export const useCheckIn = () => {
  const [state, setState] = useState<CheckInState>({ phase: 'idle' });
  const busy = useRef(false);
  const submit = useCallback(async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    setState({ phase: 'sending', code });
    try {
      const result = await checkIn(code);
      buzz('success');
      setState({ phase: 'done', result });
      window.dispatchEvent(new CustomEvent('checkin:done'));
    } catch (e: any) {
      buzz('error');
      setState({ phase: 'error', code: checkinErrorCode(e), message: e?.message || 'Something went wrong. Try again.', lastCode: code });
    } finally {
      busy.current = false;
    }
  }, []);
  const reset = useCallback(() => setState({ phase: 'idle' }), []);
  return { state, submit, reset };
};

const at12 = (ms: number) => {
  const d = new Date(ms);
  return formatTime12Hour(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
};

const ERR: Record<string, { title: string; body?: string; icon: React.ReactNode; rescan?: boolean; retry?: boolean }> = {
  'expired-code': {
    title: 'That code just changed',
    body: 'The QR on the screen changes every 3 seconds, so each code works only for a moment. Scan it again.',
    icon: <Clock className="w-6 h-6" />,
    rescan: true,
  },
  closed: { title: 'Check-in has closed', icon: <Clock className="w-6 h-6" /> },
  'not-on-list': { title: "You're not on this class list", icon: <Users className="w-6 h-6" /> },
  'device-used': { title: 'This phone was already used', icon: <Smartphone className="w-6 h-6" /> },
  faculty: { title: "You're signed in as a teacher", icon: <Users className="w-6 h-6" /> },
  invalid: { title: "That's not an attendance QR", body: 'Scan the QR your teacher is showing on the screen.', icon: <ScanQr className="w-6 h-6" />, rescan: true },
  'rate-limited': { title: 'Too many tries', icon: <AlertTriangle className="w-6 h-6" /> },
  unauthenticated: { title: 'Sign in again', icon: <AlertTriangle className="w-6 h-6" /> },
  offline: { title: "You're offline", icon: <AlertTriangle className="w-6 h-6" />, retry: true },
  error: { title: "Couldn't check you in", icon: <AlertTriangle className="w-6 h-6" />, retry: true },
};

/** The answer after a scan: present (big tick) or exactly what went wrong and what to do. */
export const CheckInOutcome: React.FC<{
  state: CheckInState;
  onRescan?: () => void;
  onRetry?: (code: string) => void;
  onDone?: () => void;
  doneLabel?: string;
}> = ({ state, onRescan, onRetry, onDone, doneLabel = 'Done' }) => {
  if (state.phase === 'sending' || state.phase === 'idle') {
    return (
      <div className="py-f6 flex flex-col items-center gap-3 text-[15px] text-muted" role="status">
        <Loader2 className="w-7 h-7 animate-spin text-fg" /> Checking you in…
      </div>
    );
  }
  if (state.phase === 'done') {
    const r = state.result;
    const fresh = r.status === 'marked';
    return (
      <div className="flex flex-col items-center text-center pt-f3" role="status" aria-live="polite">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="w-[88px] h-[88px] rounded-full bg-[#18A889] text-white flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(24,168,137,0.6)]"
        >
          <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.12, type: 'spring', stiffness: 420, damping: 14 }}>
            <Check className="w-11 h-11" strokeWidth={2.6} />
          </motion.span>
        </motion.div>
        <h3 className="mt-f4 text-[24px] leading-tight font-semibold tracking-tight text-fg">{fresh ? "You're checked in" : 'Already checked in'}</h3>
        <p className="mt-1.5 text-[15px] text-fg">{r.subjectName}</p>
        <p className="text-[14px] text-muted">{[r.facultyName, r.startTime ? formatTime12Hour(r.startTime) : ''].filter(Boolean).join(' · ')}</p>
        <p className="rounded-tile mt-f4 px-3 py-2 bg-surface-2 text-[13px] text-muted max-w-[320px]">
          Checked in at {at12(r.at)}. It counts once {r.facultyName.startsWith('Your') ? 'your teacher' : r.facultyName} saves the register.
        </p>
        {onDone && (
          <button type="button" onClick={onDone} className="btn btn-primary btn-lg mt-f5 w-full max-w-[320px]">
            {doneLabel}
          </button>
        )}
      </div>
    );
  }
  const e = ERR[state.code] || ERR.error;
  return (
    <div className="flex flex-col items-center text-center pt-f3" role="alert">
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 flex items-center justify-center">{e.icon}</div>
      <h3 className="mt-f4 text-[21px] leading-tight font-semibold tracking-tight text-fg">{e.title}</h3>
      <p className="mt-2 text-[14px] leading-[21px] text-muted max-w-[330px]">{e.body || state.message}</p>
      <div className="mt-f5 w-full max-w-[320px] flex flex-col gap-2">
        {e.rescan && onRescan && (
          <button type="button" onClick={onRescan} className="btn btn-primary btn-lg w-full">
            <ScanQr className="w-5 h-5" /> Scan again
          </button>
        )}
        {e.retry && onRetry && (
          <button type="button" onClick={() => onRetry(state.lastCode)} className="btn btn-primary btn-lg w-full">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        )}
        {onDone && (
          <button type="button" onClick={onDone} className={`btn btn-lg w-full ${e.rescan || e.retry ? 'btn-secondary' : 'btn-primary'}`}>
            {doneLabel}
          </button>
        )}
      </div>
    </div>
  );
};

/** Camera that only accepts attendance QRs, and sends the first one it reads. */
export const CheckInScanner: React.FC<{ onCode: (code: string) => void; paused?: boolean }> = ({ onCode, paused }) => {
  const [wrong, setWrong] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <div>
      <QrScanner
        paused={paused}
        hint={wrong ? "That's not an attendance QR" : 'Point at the QR on the screen'}
        onRead={(raw) => {
          const code = codeFromScan(raw);
          if (code) {
            onCode(code);
            return true;
          }
          setWrong(true);
          clearTimeout(wrongTimer.current);
          wrongTimer.current = setTimeout(() => setWrong(false), 1800);
        }}
        fallback={(why) => (
          <div className="rounded-card border border-line bg-surface px-f4 py-f5 text-center">
            <ScanQr className="w-7 h-7 mx-auto text-muted" />
            <p className="mt-3 text-[15px] font-semibold text-fg">{why === 'denied' ? 'Camera is blocked' : "Can't open the camera here"}</p>
            <p className="mt-1 text-[13px] leading-[19px] text-muted">
              {why === 'denied' ? 'Allow camera access for Intersemester in your phone settings. Or ' : ''}
              {why === 'denied' ? 'open' : 'Open'} your phone&apos;s camera app, point it at the QR and tap the link. It checks you in the same way.
            </p>
          </div>
        )}
      />
    </div>
  );
};

/** Scan → result, in a sheet. Used from Home and the Attendance page. */
export const ScanAttendanceSheet: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { state, submit, reset } = useCheckIn();
  const close = () => {
    onClose();
    setTimeout(reset, 300);
  };
  return (
    <Modal isOpen={isOpen} onClose={close} title={state.phase === 'idle' ? 'Scan attendance QR' : 'Attendance'} description={state.phase === 'idle' ? 'Point your camera at the QR your teacher is showing.' : undefined}>
      {isOpen && state.phase === 'idle' && <CheckInScanner onCode={submit} />}
      {state.phase !== 'idle' && <CheckInOutcome state={state} onRescan={reset} onRetry={submit} onDone={close} />}
    </Modal>
  );
};
