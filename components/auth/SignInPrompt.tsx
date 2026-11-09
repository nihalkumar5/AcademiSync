'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Illustration } from '@/components/ui/Illustration';
import { ArrowRight, Check } from '@/components/ui/icons';

// One sign-in ask for the whole app. Same picture, same words, same buttons everywhere,
// so a guest always knows what signing in gets them and can always say "Not now".

export interface SignInAsk {
  /** What they were trying to do, as an outcome: "Sign in to join your class" */
  title: string;
  /** One sentence on why an account is needed for this */
  body?: string;
  /** Up to 3 short gains, shown as ticks */
  perks?: string[];
  /** Runs right before leaving for the sign-in page (e.g. remember an invite code) */
  beforeSignIn?: () => void;
}

const DEFAULT_PERKS = ['Saved to your account, never lost', 'The same on your phone and laptop', 'Class updates from your CR, live'];

export const SignInPanel: React.FC<
  SignInAsk & { onCancel?: () => void; cancelLabel?: string; bare?: boolean; onNavigate?: () => void }
> = ({ title, body, perks = DEFAULT_PERKS, beforeSignIn, onCancel, cancelLabel = 'Not now', bare, onNavigate }) => {
  const router = useRouter();
  const go = () => {
    try {
      beforeSignIn?.();
    } catch {}
    onNavigate?.();
    router.push('/sign-in');
  };
  return (
    <div className={bare ? 'flex flex-col items-center text-center' : 'flex flex-col items-center text-center border border-line bg-surface px-5 py-7 sm:px-8'}>
      <Illustration name="signin" className="h-[118px] w-auto" />
      <h3 className="mt-5 text-[20px] leading-tight font-semibold tracking-tight text-fg max-w-[320px]">{title}</h3>
      {body && <p className="mt-2 text-[14px] leading-[21px] text-muted max-w-[340px]">{body}</p>}
      {perks.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 text-left">
          {perks.slice(0, 3).map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-[14px] text-fg">
              <span className="w-5 h-5 shrink-0 flex items-center justify-center bg-ink text-on-ink">
                <Check className="w-3 h-3" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 w-full max-w-[340px] flex flex-col gap-2">
        <button type="button" onClick={go} className="btn btn-primary btn-lg w-full">
          Sign in
          <ArrowRight className="w-4 h-4" />
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost w-full">
            {cancelLabel}
          </button>
        )}
      </div>
      <p className="mt-3 text-[12px] text-faint">Takes under a minute with Google.</p>
    </div>
  );
};

/** Ask a guest to sign in from anywhere: requestSignIn({ title: 'Sign in to add exams', body: '…' }) */
export const requestSignIn = (ask: SignInAsk) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<SignInAsk>('auth:request-signin', { detail: ask }));
};

/** Mount once (app/page.tsx). Shows the sign-in sheet when something calls requestSignIn. */
export const SignInPromptHost: React.FC = () => {
  const [ask, setAsk] = useState<SignInAsk | null>(null);
  useEffect(() => {
    const on = (e: Event) => setAsk((e as CustomEvent<SignInAsk>).detail);
    window.addEventListener('auth:request-signin', on);
    return () => window.removeEventListener('auth:request-signin', on);
  }, []);
  return (
    <Modal isOpen={!!ask} onClose={() => setAsk(null)} maxWidth="sm" showCloseButton={false}>
      {ask && <SignInPanel {...ask} bare onCancel={() => setAsk(null)} onNavigate={() => setAsk(null)} />}
    </Modal>
  );
};
