import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert, Scale, HelpCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Intersemester',
  description: 'Terms of service and user agreement for Intersemester.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#111110] text-[#1A1918] dark:text-[#F4F1EA] py-10 px-4 sm:px-6 max-w-3xl mx-auto font-sans">
      {/* Top Back Navigation */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C6B5D] hover:text-[#6E4F36] dark:text-[#CBB5A1] transition-colors bg-white/80 dark:bg-[#1E1C1A] border border-[#E6DDD2] dark:border-[#2C2926] px-3.5 py-2 rounded-2xl shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to App</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 pb-6 border-b border-[#E6DDD2] dark:border-[#2C2926]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          <span>User Agreement</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-xs text-[#7A6D61] dark:text-[#9E958C] font-mono">
          Effective Date: August 2026
        </p>
      </div>

      {/* Content */}
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-[#3B322C] dark:text-[#D1C7BD]">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#8C6B5D]" />
            1. Acceptance of Terms
          </h2>
          <p>
            By downloading, installing, accessing, or using <strong>Intersemester</strong>, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use the application.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            2. License &amp; Permitted Use
          </h2>
          <p>
            Intersemester grants you a personal, non-exclusive, non-transferable, revocable license to use the app for personal academic management, subject schedule organization, assignment tracking, and campus planning.
          </p>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>Reverse engineer, decompile, or attempt to extract the source code of the application.</li>
            <li>Use the platform for any unlawful purpose or to distribute malicious software.</li>
            <li>Abuse AI extraction endpoints with spam or non-academic payloads.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#8C6B5D]" />
            3. Disclaimer &amp; Academic Responsibility
          </h2>
          <p>
            While Intersemester strives for accuracy in timetable calculations, attendance metrics, and AI scanning, the ultimate responsibility for attending classes, submitting academic assignments on time, and meeting institute requirements rests solely with the student.
          </p>
          <p>
            Intersemester is provided on an <strong>&quot;AS IS&quot; and &quot;AS AVAILABLE&quot;</strong> basis without warranties of any kind, whether express or implied.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            4. AI OCR &amp; Scanning Feature
          </h2>
          <p>
            The timetable and assignment scanner uses optical character recognition and multimodal intelligence. While highly reliable, users are encouraged to verify extracted slots before confirming their semester schedule.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            5. Modifications to the Service
          </h2>
          <p>
            We reserve the right to modify, enhance, or discontinue any feature of the application with or without prior notice.
          </p>
        </section>

        <section className="flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-[#1E1C1A] border border-[#E6DDD2] dark:border-[#2C2926]">
          <h2 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#8C6B5D]" />
            6. Questions &amp; Support
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C]">
            For inquiries regarding these Terms &amp; Conditions, please contact:
          </p>
          <div className="font-mono text-xs font-bold text-[#8C6B5D] dark:text-[#CBB5A1]">
            kumarnihal829@gmail.com
          </div>
        </section>
      </div>
    </div>
  );
}
