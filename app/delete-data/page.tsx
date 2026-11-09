'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/icons';

// Account & data deletion request page (Google Play "web link resource" for account deletion).
// Reachable without the app at https://app.intersemester.com/delete-data and from
// Settings → Help & legal → Request data deletion. Requests go through /api/contact, so they
// land in the admin Messages inbox and the support email.

const SUPPORT_EMAIL = 'nihal88758@gmail.com';

export default function DeleteDataPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorText('');

    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || cleanEmail,
          email: cleanEmail,
          subject: 'Account deletion request',
          message: [
            'ACCOUNT DELETION REQUEST — Intersemester',
            `Account email: ${cleanEmail}`,
            `Requested at: ${new Date().toISOString()}`,
            reason.trim() ? `Reason: ${reason.trim()}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Request failed');
      }
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setErrorText(
        err?.message && err.message !== 'Request failed'
          ? err.message
          : 'We could not send your request right now.'
      );
    }
  };

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
        <h1 className="page-title font-semibold">Delete your Intersemester account</h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mt-1">
          Request deletion of your Intersemester account and the data linked to it. You don&apos;t need the app
          installed to do this.
        </p>
      </div>

      <div className="flex flex-col gap-12 text-fg">
        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">How it works</div>
          <ol className="text-[14px] leading-relaxed flex flex-col gap-2 list-decimal pl-5">
            <li>Enter the email address you use to sign in to Intersemester and send the request below.</li>
            <li>We may email you to confirm the request came from you.</li>
            <li>We delete your account and data within 7 days and email you when it&apos;s done.</li>
          </ol>
          <p className="text-[13px] text-[#6B6B6B] leading-relaxed mt-4">
            In the app, you can open this page from Settings → Help &amp; legal → Request data deletion. You can also
            email {SUPPORT_EMAIL} with the subject &quot;Account deletion request&quot;.
          </p>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">What gets deleted</div>
          <ul className="text-[14px] leading-relaxed flex flex-col gap-2 list-disc pl-5">
            <li>Your sign-in account (email, name and profile photo)</li>
            <li>Your profile: college, branch, semester, section and roll number</li>
            <li>Your timetable, subjects, tasks, exams, routines, reminders, notifications and settings</li>
            <li>Your batch membership and the device token used for push notifications</li>
            <li>Your AI scan usage counters</li>
          </ul>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-fg pb-3 border-b border-line mb-6">What may be kept</div>
          <ul className="text-[14px] leading-relaxed flex flex-col gap-2 list-disc pl-5">
            <li>
              Content you shared with your batch (for example a timetable or a task you posted) stays available to
              your batch, without your account attached to it.
            </li>
            <li>
              Attendance records your faculty took for a class are part of your faculty&apos;s class records and are
              managed by them.
            </li>
            <li>This deletion request itself, kept only as long as needed to show it was completed.</li>
          </ul>
        </section>

        <section className="flex flex-col">
          <div className="text-[12px] font-bold text-red-600 dark:text-red-500 pb-3 border-b border-line mb-6">
            Request deletion
          </div>

          {status === 'sent' ? (
            <div className="bg-surface border border-red-600 dark:border-red-500 p-6 flex flex-col items-center justify-center text-center gap-4">
              <h3 className="text-[18px] font-bold text-red-600 dark:text-red-500">Request received</h3>
              <p className="text-[14px] text-[#6B6B6B]">
                We&apos;ll delete your account and data within 7 days and email you at {email.trim().toLowerCase()}{' '}
                once it&apos;s done. Deletion is permanent and can&apos;t be undone.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <p className="text-[14px] leading-relaxed">
                Deleting your account is permanent. Your data can&apos;t be recovered afterwards.
              </p>

              <div className="flex flex-col gap-2">
                <label htmlFor="delete-email" className="text-[12px] font-bold text-fg">
                  Email you sign in with
                </label>
                <input
                  id="delete-email"
                  type="email"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-line text-[14px] focus:outline-none focus:border-line-strong transition-colors rounded-none placeholder:text-[#999999]"
                  placeholder="name@university.edu"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="delete-name" className="text-[12px] font-bold text-fg">
                  Name (optional)
                </label>
                <input
                  id="delete-name"
                  type="text"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-line text-[14px] focus:outline-none focus:border-line-strong transition-colors rounded-none placeholder:text-[#999999]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="delete-reason" className="text-[12px] font-bold text-fg">
                  Anything we should know? (optional)
                </label>
                <textarea
                  id="delete-reason"
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-line text-[14px] focus:outline-none focus:border-line-strong transition-colors rounded-none placeholder:text-[#999999] resize-none"
                />
              </div>

              {status === 'error' && (
                <p className="text-[13px] text-red-600 dark:text-red-500 leading-relaxed">
                  {errorText} Please try again, or email {SUPPORT_EMAIL} with the subject &quot;Account deletion
                  request&quot;.
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-4 mt-2 bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-colors rounded-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Sending…' : 'Request account deletion'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
