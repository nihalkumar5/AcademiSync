import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, ShieldCheck, CheckCircle2, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Request — Intersemester',
  description: 'Request deletion of your Intersemester account and data.',
};

export default function DeleteDataPage() {
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
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
          <Trash2 className="w-4 h-4" />
          <span>Google Play Data Safety Disclosure</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Account &amp; Data Deletion
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C]">
          How to erase your academic records, timetable information, and account data from Intersemester.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-[#3B322C] dark:text-[#D1C7BD]">
        {/* Method 1 */}
        <section className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-sm flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] uppercase">
            Option 1 (Instant In-App Deletion)
          </span>
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            Wipe All Local and Cloud Academic Data
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C]">
            You can instantly and permanently purge all stored timetable slots, homework entries, attendance logs, and student identity credentials:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm">
            <li>Open the Intersemester application on your device.</li>
            <li>Navigate to the <strong>Profile / Settings</strong> tab.</li>
            <li>Scroll down to the <strong>Data &amp; Storage</strong> section.</li>
            <li>Tap <strong>Reset to Sample Curriculum</strong> and press &amp; hold the confirmation button for 2.5 seconds.</li>
            <li>All your local browser and cloud stored records are immediately purged permanently.</li>
          </ol>
        </section>

        {/* Method 2 */}
        <section className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-sm flex flex-col gap-3">
          <span className="text-xs font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] uppercase">
            Option 2 (Full Account Erasure Request)
          </span>
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            Request Complete Identity &amp; Auth Erasure
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C]">
            If you created an account with Google or Email via Clerk and want your authentication profile permanently deleted from our database:
          </p>
          <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8E0D5] dark:border-[#2C2926] flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#1A1918] dark:text-white">Email Subject: Data Deletion Request</span>
              <span className="text-[11px] text-[#7A6D61] dark:text-[#9E958C]">Send from your registered account email</span>
            </div>
            <a
              href="mailto:kumarnihal829@gmail.com?subject=Account%20and%20Data%20Deletion%20Request"
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0"
            >
              Email Developer
            </a>
          </div>
          <p className="text-xs text-[#7A6D61] dark:text-[#9A9188] pt-1">
            We will process your complete data erasure within 48 business hours and send a written confirmation once completed.
          </p>
        </section>
      </div>
    </div>
  );
}
