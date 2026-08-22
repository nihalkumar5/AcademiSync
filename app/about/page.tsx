import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Calendar, CheckSquare, Backpack, Bell, Shield, Heart } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Intersemester',
  description: 'About Intersemester academic assistant and timetable organizer.',
};

export default function AboutPage() {
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
          <Sparkles className="w-4 h-4" />
          <span>Student Edition v1.2.0</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          <span className="font-black">inter</span>
          <span className="font-normal opacity-85">semester</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C]">
          Your all-in-one planner to manage classes, tasks, and everyday campus life with calm and clarity.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-[#3B322C] dark:text-[#D1C7BD]">
        {/* Mission Statement */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
            Our Mission
          </h2>
          <p>
            College life is hectic: shifting lecture halls, surprise attendance quotas, group project deadlines, and bags packed with forgotten lab manuals. Traditional calendar apps are generic, while paper timetables tear and get lost.
          </p>
          <p>
            <strong>Intersemester</strong> was engineered specifically for university students. It translates complex academic batch timetables into clean, daily actionable focus cards and intelligent backpack packing lists.
          </p>
        </section>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] flex flex-col gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EFEAE2] dark:bg-[#2A2724] text-[#8C6B5D] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1918] dark:text-white">Smart Timetable Engine</h3>
            <p className="text-xs text-[#7A6D61] dark:text-[#9A9188]">
              Automated current class highlight, next lecture countdown, and 1-tap AI timetable photo scanner.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] flex flex-col gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EFEAE2] dark:bg-[#2A2724] text-[#8C6B5D] flex items-center justify-center">
              <Backpack className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1918] dark:text-white">Smart Carry Bag Assistant</h3>
            <p className="text-xs text-[#7A6D61] dark:text-[#9A9188]">
              Calculates exactly what notebooks, lab kits, drawing instruments, and assignments to pack each night.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] flex flex-col gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EFEAE2] dark:bg-[#2A2724] text-[#8C6B5D] flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1918] dark:text-white">Focus &amp; Homework Tasks</h3>
            <p className="text-xs text-[#7A6D61] dark:text-[#9A9188]">
              Tactile check-off interactions, multi-stage firework confetti celebrations, and priority sorting.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] flex flex-col gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EFEAE2] dark:bg-[#2A2724] text-[#8C6B5D] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1918] dark:text-white">Privacy First Architecture</h3>
            <p className="text-xs text-[#7A6D61] dark:text-[#9A9188]">
              Works 100% offline with zero invasive ad trackers or third-party data selling.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 flex items-center justify-between text-xs text-[#7A6D61] dark:text-[#9A9188] border-t border-[#E6DDD2] dark:border-[#2C2926]">
          <span>© 2026 Intersemester. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for students everywhere.
          </span>
        </div>
      </div>
    </div>
  );
}
