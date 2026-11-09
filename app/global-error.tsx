'use client';

import React, { useEffect, useState } from 'react';
import { logServerError } from '@/lib/errorUtils';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      logServerError('NextGlobalErrorBoundary', error);
    } catch (_) {
      console.error('Global error boundary caught:', error);
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

  return (
    <html lang="en" className="bg-surface">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <title>Application Error — Intersemester</title>
      </head>
      <body className="min-h-screen w-full flex items-center justify-center bg-surface text-fg p-6 font-sans antialiased selection:bg-[#96725B] selection:text-white">
        <div className="max-w-md w-full p-6 sm:p-8 bg-surface border border-[#E5E5E3] dark:border-[#222222] shadow-sm text-center flex flex-col items-center rounded-none">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-5 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[12px] font-mono rounded-none">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-none inline-block animate-pulse" />
            System Alert
          </div>

          <h1 className="text-xl font-bold tracking-tight mb-2 text-fg">
            Application Error
          </h1>

          <p className="text-xs sm:text-sm text-[#666666] dark:text-[#999999] mb-6 leading-relaxed">
            A critical error occurred while loading this session. You can refresh the app or reset cached data to recover immediately.
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              type="button"
              onClick={handleHardReload}
              className="btn btn-primary w-full"
            >
              Refresh App
            </button>

            <button
              type="button"
              onClick={handleClearAndReset}
              className="w-full h-11 px-6 bg-transparent border border-[#E5E5E3] dark:border-[#333333] hover:border-line-strong text-[#444444] dark:text-[#BBBBBB] hover:text-fg text-[14px] font-semibold active:scale-[0.99] transition-all cursor-pointer rounded-none flex items-center justify-center"
            >
              Clear Cache & Restart
            </button>
          </div>

          {/* Collapsible Error Digest for Diagnostics */}
          {(error?.digest || error?.message) && (
            <div className="mt-6 pt-4 border-t border-[#EEEEEC] dark:border-[#222222] w-full text-left">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[12px] font-mono text-[#888888] hover:text-fg transition-colors flex items-center gap-1"
              >
                <span>{showDetails ? '▼ Hide Diagnostic Code' : '▶ Show Diagnostic Code'}</span>
              </button>
              {showDetails && (
                <pre className="mt-2 p-2.5 bg-[#F5F5F3] dark:bg-[#181817] border border-[#E5E5E3] dark:border-[#262626] text-[11px] font-mono text-[#555555] dark:text-[#999999] overflow-x-auto rounded-none whitespace-pre-wrap break-all">
                  {error?.message ? `Error: ${error.message}\n` : ''}
                  {error?.digest ? `Digest: ${error.digest}` : ''}
                </pre>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
