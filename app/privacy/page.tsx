'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/icons';

const SUPPORT_EMAIL = 'nihal88758@gmail.com';

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">
        {n} {title}
      </div>
      <div className="text-[14px] leading-relaxed flex flex-col gap-4">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
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
        <span className="text-[12px] font-bold text-[#6B6B6B]">Legal & Support</span>
        <h1 className="page-title font-semibold">Privacy Policy</h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-1">Last updated: 9 November 2026</p>
      </div>

      <div className="flex flex-col gap-12 text-fg">
        <Section n="01" title="Overview">
          <p>
            Intersemester helps college students and faculty manage timetables, tasks, exams and campus life. This
            policy explains what we collect, who can see it, which services process it, and how to delete it. We do
            not sell, rent or trade your personal information, and we do not show third-party ads.
          </p>
        </Section>

        <Section n="02" title="Data We Collect">
          <p>
            <strong>Account:</strong> When you sign in with Google or with an email and password, we store your
            email address, name and profile photo using Google Firebase Authentication.
          </p>
          <p>
            <strong>Profile:</strong> Your college, programme, branch, semester, section, roll number and role
            (student, batch pilot or faculty).
          </p>
          <p>
            <strong>Academic data:</strong> Your timetable, subjects, tasks, exams, calendar events, routines, carry
            items, reminders, notifications and settings. These are saved on your device and, when you are signed
            in, in your account so they sync across devices.
          </p>
          <p>
            <strong>Faculty features:</strong> Faculty who link your batch can take attendance (names, roll numbers
            and present/absent marks), post assignments and files, and see who has opened an assignment (name, roll
            number and time).
          </p>
          <p>
            <strong>Files you scan:</strong> Photos or PDFs you choose to scan (timetables, exam schedules, calendars,
            mess menus, homework) are processed to read their contents. We count how many scans you make to prevent
            abuse.
          </p>
          <p>
            <strong>Device and usage:</strong> A push-notification token for your device, and anonymous page-view
            statistics. In-app campus announcements count total views and taps, not who viewed them.
          </p>
          <p>
            <strong>Support messages:</strong> If you contact us, your name, email address and message.
          </p>
          <p>
            <strong>Without an account:</strong> If you use the app without signing in, your data stays on your
            device.
          </p>
        </Section>

        <Section n="03" title="Who Can See Your Data">
          <p>
            <strong>Your batch:</strong> Classmates in the same batch, its batch pilots and faculty linked to it can
            see your name, email address, roll number, profile photo, college, branch, semester and section, along
            with anything you share with the batch.
          </p>
          <p>
            <strong>Anyone looking for their batch:</strong> Batch details (college, branch, semester, timetable,
            batch code and the name and email of the batch pilots), shared mess menus, academic calendars and exam
            schedules can be found by other users, including before they sign in.
          </p>
          <p>
            <strong>Faculty at your college:</strong> Faculty names, titles, departments, office rooms and email
            addresses are shown to students of the same college.
          </p>
          <p>
            <strong>Your college&apos;s campus admin:</strong> A campus admin appointed by Intersemester for your
            college can see the profile details above for students of that college, the college&apos;s batches, and
            batch pilot requests, and can post notices to students of that college.
          </p>
          <p>Everything else in your account is private to you.</p>
        </Section>

        <Section n="04" title="Services That Process Your Data">
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              <strong>Google Firebase</strong> — sign-in, database, file storage for assignments, and push
              notifications.
            </li>
            <li>
              <strong>Vercel</strong> — hosting the app and anonymous page-view analytics.
            </li>
            <li>
              <strong>Google Gemini and OpenAI</strong> — files you choose to scan are sent to them to read the text.
              We don&apos;t keep the file after the scan; only the result is saved to your account.
            </li>
            <li>
              <strong>FormSubmit</strong> — forwards support and deletion requests to our email.
            </li>
          </ul>
        </Section>

        <Section n="05" title="How We Use Your Data">
          <p>
            We use your data only to run Intersemester: syncing your schedule and tasks, sharing with your batch,
            sending class and deadline reminders, answering support requests and preventing abuse.
          </p>
        </Section>

        <Section n="06" title="Retention & Data Deletion">
          <p>We keep your account data for as long as your account exists.</p>
          <p>
            <strong>Clear your data:</strong> Settings → Erase everything removes your app data from this device and
            from your account straight away.
          </p>
          <p>
            <strong>Delete your account:</strong> Open Settings → Help &amp; legal → Request data deletion, or visit{' '}
            <Link href="/delete-data" className="underline font-semibold">
              app.intersemester.com/delete-data
            </Link>{' '}
            (no app needed), or email {SUPPORT_EMAIL}. We delete your account and its data within 7 days and confirm
            by email.
          </p>
          <p>
            Content you shared with your batch stays available to the batch without your account attached, and
            attendance records taken by your faculty remain part of their class records.
          </p>
        </Section>

        <Section n="07" title="Security">
          <p>
            Data is sent over HTTPS and stored with Google Firebase. Access rules limit each account to its own data
            and to the batches it belongs to; attendance can only be read and changed through our server.
          </p>
        </Section>

        <Section n="08" title="Children">
          <p>Intersemester is made for college students and faculty and is not intended for children under 13.</p>
        </Section>

        <Section n="09" title="Contact">
          <p>
            Questions about this policy? Email {SUPPORT_EMAIL} or use{' '}
            <Link href="/contact" className="underline font-semibold">
              Contact support
            </Link>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
