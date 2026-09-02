'use client';

import React, { useEffect } from 'react';
import { logServerError } from '@/lib/errorUtils';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logServerError('NextGlobalErrorBoundary', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen w-full flex items-center justify-center bg-[#FAFAF8] text-[#111111] p-6 font-sans">
        <div className="max-w-md w-full p-8 bg-white border border-[#E5E5E3] shadow-sm text-center flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-tight mb-2">
            Application Error
          </h1>
          <p className="text-sm text-[#666666] mb-6 leading-relaxed">
            A critical error occurred. Please refresh or try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="h-11 px-6 bg-[#111111] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Refresh App
          </button>
        </div>
      </body>
    </html>
  );
}
