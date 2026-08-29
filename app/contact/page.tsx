'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback / Feature Request');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
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
          Support
        </span>
        <h1 className="text-[40px] font-bold tracking-tight leading-none text-[#111111] dark:text-[#FFFFFF]">
          Contact Us
        </h1>
        <p className="text-[14px] text-[#6F6F6F] leading-relaxed mt-1">
          Found a bug, need help, or have a suggestion? We're here to help.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {/* Developer Contact Section */}
        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            Developer Contact
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">Email</span>
              <a href="mailto:kumarnihal829@gmail.com" className="text-[14px] text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] hover:underline underline-offset-4 transition-colors">
                kumarnihal829@gmail.com
              </a>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">Phone / WhatsApp</span>
              <span className="text-[14px] text-[#6F6F6F]">+91 9565550673</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF]">Location</span>
              <span className="text-[14px] text-[#6F6F6F]">IIIT Naya Raipur, Chhattisgarh, India</span>
            </div>
          </div>
        </section>

        {/* Send a Message Section */}
        <section className="flex flex-col">
          <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333] mb-6">
            Send a Message
          </div>
          
          {submitted ? (
            <div className="bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] p-6 flex flex-col items-center justify-center text-center gap-4">
              <h3 className="text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF]">Message Sent</h3>
              <p className="text-[14px] text-[#6F6F6F]">We'll get back to you as soon as possible.</p>
              <button onClick={() => setSubmitted(false)} className="text-[13px] font-bold underline underline-offset-4 hover:text-[#6F6F6F]">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Your name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                  placeholder="Rahul Sharma"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Your email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none placeholder:text-[#999999]"
                  placeholder="name@university.edu"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Topic</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none appearance-none"
                >
                  <option value="Feedback / Feature Request">Feedback / Feature Request</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Timetable Help">Timetable Help</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF]">Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] text-[14px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors rounded-none resize-none placeholder:text-[#999999]"
                  placeholder="Tell us what you need help with..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity rounded-none"
              >
                Send message
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
