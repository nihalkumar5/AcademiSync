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
    <html lang="en" className="bg-[#FAFAF8] dark:bg-[#090A0C]">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <title>Application Error — Intersemester</title>
      </head>
      <body className="min-h-screen w-full flex items-center justify-center bg-[#FAFAF8] dark:bg-[#090A0C] text-[#111111] dark:text-[#F4F4F6] p-6 font-sans antialiased selection:bg-[#96725B] selection:text-white">
        <div className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-[#111110] border border-[#E5E5E3] dark:border-[#222222] shadow-sm text-center flex flex-col items-center rounded-none">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-5 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-[10px] font-mono uppercase tracking-widest rounded-none">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-none inline-block animate-pulse" />
            System Alert
          </div>

          <h1 className="text-xl font-bold tracking-tight mb-2 text-[#111111] dark:text-[#FFFFFF]">
            Application Error
          </h1>

          <p className="text-xs sm:text-sm text-[#666666] dark:text-[#999999] mb-6 leading-relaxed">
            A critical error occurred while loading this session. You can refresh the app or reset cached data to recover immediately.
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              type="button"
              onClick={handleHardReload}
              className="w-full h-11 px-6 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer rounded-none flex items-center justify-center"
            >
              Refresh App
            </button>

            <button
              type="button"
              onClick={handleClearAndReset}
              className="w-full h-11 px-6 bg-transparent border border-[#E5E5E3] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-[#444444] dark:text-[#BBBBBB] hover:text-[#111111] dark:hover:text-white text-xs font-bold uppercase tracking-wider active:scale-[0.99] transition-all cursor-pointer rounded-none flex items-center justify-center"
            >
              Clear Cache & Restart
            </button>
          </div>

          {/* Collapsible Error Digest for Diagnostics */}
          {error?.digest && (
            <div className="mt-6 pt-4 border-t border-[#EEEEEC] dark:border-[#222222] w-full text-left">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] font-mono uppercase tracking-wider text-[#888888] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors flex items-center gap-1"
              >
                <span>{showDetails ? '▼ Hide Diagnostic Code' : '▶ Show Diagnostic Code'}</span>
              </button>
              {showDetails && (
                <pre className="mt-2 p-2.5 bg-[#F5F5F3] dark:bg-[#181817] border border-[#E5E5E3] dark:border-[#262626] text-[10px] font-mono text-[#555555] dark:text-[#999999] overflow-x-auto rounded-none whitespace-pre-wrap break-all">
                  Digest: {error.digest}
                </pre>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
