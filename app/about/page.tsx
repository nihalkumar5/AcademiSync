'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/icons';

export default function AboutPage() {
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
          About Intersemester
        </h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-1">
          Version 1.2.0 • Built for students, by students.
        </p>
      </div>

      <div className="flex flex-col gap-12 text-fg">
        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
            01 The Story
          </div>
          <p className="text-[14px] leading-relaxed">
            Intersemester was born out of the frustration of dealing with scattered WhatsApp groups, confusing PDF timetables, and forgotten assignments. We wanted a single, unified source of truth for academic life that felt fast, modern, and completely frictionless.
          </p>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
            02 The Tech
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>Intersemester is built on a modern stack featuring Next.js, React, and Firebase. It uses advanced edge computing and real-time database sync to ensure your timetable is always up-to-date across all your devices.</p>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
            03 Open Source & Community
          </div>
          <div className="text-[14px] leading-relaxed flex flex-col gap-4">
            <p>We believe in building in public and listening to the community. Have an idea for a feature? We'd love to hear from you in our Support section.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
