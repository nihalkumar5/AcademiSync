import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface text-fg p-6">
      <div className="max-w-md w-full p-8 bg-white dark:bg-[#181817] border border-[#E5E5E3] dark:border-[#2C2C2C] shadow-sm text-center flex flex-col items-center">
        <span className="text-4xl font-mono font-bold text-[#111111]/30 dark:text-[#FFFFFF]/30 mb-2">
          404
        </span>
        <h1 className="text-xl font-bold tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-[#666666] dark:text-[#999999] mb-6 leading-relaxed">
          The page or link you are looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="btn btn-primary"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
