'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Home, RotateCcw, ChevronDown, Copy } from '@/components/ui/icons';
import { logServerError } from '@/lib/errorUtils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log complete error details server/console side only
    try {
      logServerError('NextRootErrorBoundary', error);
    } catch (_) {
      console.error('Root error boundary caught:', error);
    }
  }, [error]);

  const handleHardReload = () => {
    try {
      if (typeof window !== 'undefined') {
        window.location.reload();
      } else {
        reset();
      }
    } catch (_) {
      reset();
    }
  };

  const handleClearAndReset = () => {
    try {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch (_) {}
        window.location.href = '/';
      } else {
        reset();
      }
    } catch (_) {
      reset();
    }
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const detail = [error?.message ? `Error: ${error.message}` : '', error?.digest ? `Digest: ${error.digest}` : '']
    .filter(Boolean)
    .join('\n');

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-surface text-fg px-4 py-10 font-sans">
      <div className="w-full max-w-[400px]">
        <div className="relative border border-line bg-surface">
          <div className="px-5 pt-6 pb-5">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              Error
            </span>
            <h1 className="mt-3 text-[24px] font-semibold tracking-tight leading-tight">Something went wrong</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              This screen couldn&apos;t load. Your data is safe. Try again, or go back to home.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleHardReload}
                className="h-12 inline-flex items-center justify-center gap-2 bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                className="h-12 inline-flex items-center justify-center gap-2 border border-line text-[14px] font-semibold hover:border-line-strong active:scale-[0.99] transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Go home
              </button>
            </div>
          </div>

          {detail && (
            <div className="border-t border-line-soft">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
                className="w-full flex items-center justify-between pl-6 pr-5 h-12 text-[14px] text-muted hover:text-fg transition-colors cursor-pointer"
              >
                Technical details
                <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>
              {showDetails && (
                <div className="pl-6 pr-5 pb-5">
                  <pre className="p-3 bg-[#F7F7F5] dark:bg-black/30 border border-line-soft text-[12px] font-mono text-muted whitespace-pre-wrap break-all max-h-40 overflow-auto">
                    {detail}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      try { navigator.clipboard.writeText(detail); } catch (_) {}
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg hover:underline underline-offset-4 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy details
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Last resort: wipes local data, so it asks first */}
        <div className="mt-5 text-center">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Still broken? Reset app data
            </button>
          ) : (
            <div className="border border-rose-200 dark:border-rose-500/25 bg-rose-50/60 dark:bg-rose-500/[0.06] p-4 text-left">
              <p className="text-[14px] font-semibold">Reset app data on this device?</p>
              <p className="mt-1 text-[13px] text-muted">
                Local timetable, tasks and settings will be cleared. Anything synced to your account comes back after sign-in.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleClearAndReset}
                  className="h-11 px-4 bg-rose-600 text-white text-[14px] font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="h-11 px-4 text-[14px] font-semibold hover:underline underline-offset-4 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
