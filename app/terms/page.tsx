'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/icons';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-2 text-fg py-12 px-4 sm:px-6 max-w-2xl mx-auto font-sans">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6B6B6B] hover:text-fg transition-colors mb-12"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to App</span>
      </Link>

      <div className="flex flex-col gap-3 mb-12">
        <span className="text-[12px] font-bold text-[#6B6B6B]">
          Legal & Support
        </span>
        <h1 className="page-title font-semibold">
          Terms & Conditions
        </h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-1">
          Please read these terms carefully before using Intersemester.
        </p>
      </div>

      <div className="flex flex-col gap-12 text-fg">
        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
            01 Acceptance of Terms
          </div>
          <p className="text-[14px] leading-relaxed">
            By accessing and using Intersemester, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
            02 User Accounts
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. We encourage the use of strong passwords.</p>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
            03 Acceptable Use
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>You agree not to misuse the Intersemester service. You may not use the service to store or transmit malicious code, or to engage in any activity that interferes with or disrupts the service.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
