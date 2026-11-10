'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { canUseWebPush, enableWebPush, isIOSDevice, webPushPermission } from '@/lib/webPush';

// Asks web / PWA users to turn on notifications with a real tap (required on iPhone).
// Shown to signed-in users while permission is still "default"; dismissing hides it for a week.
const DISMISS_KEY = 'web_push_prompt_dismissed_at';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export const WebPushPrompt: React.FC = () => {
  const { user, showToast } = useApp();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !canUseWebPush() || webPushPermission() !== 'default') return;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {}
    if (Date.now() - dismissedAt < WEEK) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [user?.id]);

  if (!show || !user?.id) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShow(false);
  };

  const turnOn = async () => {
    setBusy(true);
    const { result, reason } = await enableWebPush(user.id);
    setBusy(false);
    if (result === 'granted') {
      showToast('Notifications on', "You'll get class changes and batch alerts on this device.", 'success');
      setShow(false);
    } else if (result === 'denied') {
      showToast(
        'Notifications blocked',
        isIOSDevice() ? 'Turn them on in Settings → Notifications → Intersemester.' : 'Allow notifications for this site in your browser settings.',
        'info'
      );
      setShow(false);
    } else if (result === 'error') {
      showToast('Could not turn on notifications', `Please try again in a moment.${reason ? ` (${reason})` : ''}`, 'error');
    } else {
      setShow(false);
    }
  };

  return (
    <div className="fixed left-3 right-3 md:left-auto md:right-6 md:w-[380px] bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] md:bottom-6 z-[60] bg-surface border border-line shadow-[0_24px_60px_-20px_rgba(17,17,17,0.35)] dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.75)] p-4 animate-[menuIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-muted hover:text-fg cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="w-10 h-10 shrink-0 flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20">
          <Bell className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-fg leading-snug">Turn on notifications</p>
          <p className="mt-0.5 text-[13px] text-muted leading-snug">Get cancelled classes, room changes and batch alerts the moment they happen.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={turnOn} disabled={busy} className="btn btn-primary flex-1">
          {busy ? 'Turning on…' : 'Turn on'}
        </button>
        <button type="button" onClick={dismiss} className="btn btn-secondary">
          Not now
        </button>
      </div>
    </div>
  );
};
