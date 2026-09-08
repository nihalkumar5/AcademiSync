'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Home, RotateCcw } from 'lucide-react';
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAF8] dark:bg-[#090A0C] text-[#111111] dark:text-[#FFFFFF] p-6 font-sans">
      <div className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-[#111110] border border-[#E5E5E3] dark:border-[#222222] shadow-sm text-center flex flex-col items-center rounded-none">
        <div className="w-11 h-11 rounded-none bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-center justify-center mb-5 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
        </div>

        <h1 className="text-xl font-bold tracking-tight mb-2 text-[#111111] dark:text-[#FFFFFF]">
          Something went wrong
        </h1>

        <p className="text-xs sm:text-sm text-[#666666] dark:text-[#999999] mb-6 leading-relaxed">
          An unexpected error occurred while loading this view. You can reload the page or return to home.
        </p>

        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              type="button"
              onClick={handleHardReload}
              className="flex-1 h-11 bg-[#111111] dark:bg-[#FFFFFF] text-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer rounded-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>

            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="flex-1 h-11 border border-[#D9D9D6] dark:border-[#333333] hover:border-[#111111] dark:hover:border-[#FFFFFF] text-[#111111] dark:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] transition-all cursor-pointer rounded-none"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearAndReset}
            className="w-full h-10 border border-[#E5E5E3] dark:border-[#222222] text-[#666666] dark:text-[#888888] hover:text-[#111111] dark:hover:text-white hover:border-[#CCCCCC] dark:hover:border-[#444444] text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer rounded-none"
          >
            <RotateCcw className="w-3 h-3" />
            Clear Storage & Reset
          </button>
        </div>

        {/* Collapsible Error Digest for Diagnostics */}
        {(error?.digest || error?.message) && (
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
                {error?.message ? `Error: ${error.message}\n` : ''}
                {error?.digest ? `Digest: ${error.digest}` : ''}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
