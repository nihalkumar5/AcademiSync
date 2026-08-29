'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-[14px] text-[#6F6F6F] leading-relaxed mt-1">
          Last updated: August 2026 • Compliant with Google Play Data Safety
        </p>
      </div>

      <div className="flex flex-col gap-12 text-[#111111] dark:text-[#FFFFFF]">
        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            01 Overview
          </div>
          <p className="text-[14px] leading-relaxed">
            At Intersemester, we respect your privacy and believe academic tools should never exploit student data. We build our app with a privacy-first architecture, meaning the vast majority of your academic data (timetables, task lists, and attendance records) is stored locally on your device or in your secure private account.
          </p>
        </section>

        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            02 Data We Collect
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p><strong>Account Information:</strong> If you sign in, we securely store your email address and basic profile info (name, avatar) through Clerk Authentication.</p>
            <p><strong>Academic Data:</strong> Your timetable structure, subjects, assignments, and carry items are stored to make the app function across your devices. If you join a batch, this data is securely synced so classmates can collaborate.</p>
            <p><strong>Local-First:</strong> If you use the app without an account, all data remains strictly on your local device storage.</p>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            03 How We Use Your Data
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>We use your data solely to provide and improve the Intersemester service. We do not sell, rent, or trade your personal information with third parties. Your timetable and tasks are yours.</p>
          </div>
        </section>
        
        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            04 Data Deletion
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>You have the right to request the complete deletion of your account and all associated data at any time. You can do this directly from the App Settings &gt; Legal & Support &gt; Data Deletion Request.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
