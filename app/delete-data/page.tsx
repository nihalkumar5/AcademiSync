'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function DeleteDataPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
      setEmail('');
    }, 500);
  };

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
          Data Deletion
        </h1>
        <p className="text-[14px] text-[#6F6F6F] leading-relaxed mt-1">
          Request complete erasure of your account and data.
        </p>
      </div>

      <div className="flex flex-col gap-12 text-[#111111] dark:text-[#FFFFFF]">
        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-red-600 dark:text-red-500 pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            Warning
          </div>
          <p className="text-[14px] leading-relaxed">
            Submitting a data deletion request will permanently remove your account, timetables, and all associated personal information from our servers. This action cannot be undone.
          </p>
        </section>

        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            Submit Request
          </div>
          
          {submitted ? (
            <div className="bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-red-600 dark:border-red-500 p-6 flex flex-col items-center justify-center text-center gap-4">
              <h3 className="text-[18px] font-bold text-red-600 dark:text-red-500">Request Received</h3>
              <p className="text-[14px] text-[#6F6F6F]">We will process your data deletion request within 48 hours. You will receive an email confirmation once completed.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Confirm your email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                  placeholder="name@university.edu"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 bg-red-600 text-white text-[13px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors rounded-none"
              >
                Request Deletion
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
