import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, EyeOff, Database, Mail, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Intersemester',
  description: 'Intersemester privacy policy and student data safety disclosures.',
};

export default function PrivacyPage() {
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
          <Shield className="w-4 h-4" />
          <span>Official Legal Disclosure</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-[#7A6D61] dark:text-[#9E958C] font-mono">
          Last updated: August 2026 • Compliant with Google Play Data Safety
        </p>
      </div>

      {/* Content */}
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-[#3B322C] dark:text-[#D1C7BD]">
        {/* Section 1 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#8C6B5D]" />
            1. Overview & Commitment to Student Privacy
          </h2>
          <p>
            At <strong>Intersemester</strong>, we respect your privacy and believe academic tools should never exploit student data. We build our app with a <em>privacy-first architecture</em>, meaning the vast majority of your academic data (timetables, task lists, and attendance records) is stored locally on your device or in your secure private account.
          </p>
        </section>

        {/* Section 2 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#8C6B5D]" />
            2. What Data We Collect
          </h2>
          <p>We only collect the minimum information required to deliver core application functionality:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>
              <strong>Academic Information:</strong> Class timetable schedule, course codes, room numbers, professor names, homework tasks, and exam dates you manually enter or scan.
            </li>
            <li>
              <strong>Authentication Information:</strong> If you choose to sign in via Google or Email, our authentication provider (Clerk) provides your name, email address, and profile photo to identify your account and sync your devices.
            </li>
            <li>
              <strong>Device & Storage Data:</strong> Local client storage on your browser/phone to keep the app working instantly offline without constant internet requests.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-[#8C6B5D]" />
            3. What We Never Do
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1C1A] border border-[#E6DDD2] dark:border-[#2C2926] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs font-medium">We NEVER sell your personal data or timetable to third-party advertisers.</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1C1A] border border-[#E6DDD2] dark:border-[#2C2926] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs font-medium">We NEVER track your location or read device contacts or background files.</span>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            4. Third-Party Service Providers
          </h2>
          <p>We work with industry-standard, secure infrastructure providers to provide seamless performance:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
            <li><strong>Clerk:</strong> Secure user authentication, OAuth sign-in, and session protection.</li>
            <li><strong>Google Gemini AI:</strong> When you use AI Smart Scan to extract a timetable or assignment from a photo, the image is securely processed via Google Gemini API solely for text extraction and is not stored or used to train public models.</li>
            <li><strong>Vercel & Cloudflare:</strong> Secure high-speed hosting and SSL encrypted content delivery.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            5. Data Deletion & Retention
          </h2>
          <p>
            You have complete sovereignty over your data. You can delete all your schedules, homework, and profile records at any time directly in the app via <em>Settings &gt; Reset Data</em> or request complete account erasure by visiting our <Link href="/delete-data" className="text-[#8C6B5D] underline font-semibold">Data Deletion Page</Link>.
          </p>
        </section>

        {/* Section 6 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            6. Children&apos;s Privacy
          </h2>
          <p>
            Intersemester is intended for college and university students. We do not knowingly collect personal identifiable information from children under the age of 13.
          </p>
        </section>

        {/* Section 7 */}
        <section className="flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-[#1E1C1A] border border-[#E6DDD2] dark:border-[#2C2926]">
          <h2 className="text-base font-bold text-[#1A1918] dark:text-[#F4F1EA] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#8C6B5D]" />
            7. Contact Us
          </h2>
          <p className="text-xs sm:text-sm">
            If you have any questions, concerns, or privacy requests regarding this Privacy Policy, please contact our support team at:
          </p>
          <div className="font-mono text-xs font-bold text-[#8C6B5D] dark:text-[#CBB5A1]">
            support@intersemester.app
          </div>
        </section>
      </div>
    </div>
  );
}
