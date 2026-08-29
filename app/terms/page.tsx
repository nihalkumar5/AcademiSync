'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] py-12 px-4 sm:px-6 max-w-2xl mx-auto font-sans">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors mb-12"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to App</span>
      </Link>

      <div className="flex flex-col gap-3 mb-12">
        <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#999999]">
          Legal & Support
        </span>
        <h1 className="text-[40px] font-bold tracking-tight leading-none text-[#111111] dark:text-[#FFFFFF]">
          Terms & Conditions
        </h1>
        <p className="text-[14px] text-[#6F6F6F] leading-relaxed mt-1">
          Please read these terms carefully before using Intersemester.
        </p>
      </div>

      <div className="flex flex-col gap-12 text-[#111111] dark:text-[#FFFFFF]">
        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            01 Acceptance of Terms
          </div>
          <p className="text-[14px] leading-relaxed">
            By accessing and using Intersemester, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            02 User Accounts
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. We encourage the use of strong passwords.</p>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
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
