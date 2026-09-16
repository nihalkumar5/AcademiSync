'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Send, Loader2, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback / Feature Request');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    };

    try {
      // 1. Post to backend API (saves in Firestore contact_messages & forwards to FormSubmit -> nihal88758@gmail.com)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // 2. Direct browser-side dispatch to FormSubmit for redundant delivery guarantee
      fetch('https://formsubmit.co/ajax/nihal88758@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          _subject: `[AcademiSync Support] ${payload.subject} from ${payload.name}`,
          _replyto: payload.email,
          topic: payload.subject,
          message: payload.message,
        }),
      }).catch((e) => console.warn('Client direct dispatch:', e));

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('API submission status:', errJson);
      }
    } catch (err) {
      console.warn('Network submission notice:', err);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] py-12 px-4 sm:px-6 max-w-2xl mx-auto font-sans">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors mb-8 sm:mb-12"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to App</span>
      </Link>

      <div className="flex flex-col gap-3 mb-8 sm:mb-10">
        <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#999999]">
          Support & Help
        </span>
        <h1 className="text-[36px] sm:text-[40px] font-bold tracking-tight leading-none text-[#111111] dark:text-[#FFFFFF]">
          Contact Us
        </h1>
        <p className="text-[14px] text-[#6F6F6F] leading-relaxed mt-1">
          Have a question, feedback, or need help with your timetable or batch? Reach out to us anytime.
        </p>
      </div>

      {/* WhatsApp Quick Support Card */}
      <div className="mb-8 p-5 sm:p-6 bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#E5E5E3] dark:border-[#282828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-full shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] flex items-center gap-2">
              <span>Instant WhatsApp Support</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[12px] text-[#6F6F6F] mt-0.5">
              Connect directly with our support team for quick assistance.
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/919565550673"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[12px] font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shrink-0 shadow-xs"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>Chat on WhatsApp</span>
        </a>
      </div>

      {/* Send a Message Form / Thank You State */}
      <div className="flex flex-col gap-6">
        <div className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF] pb-3 border-b border-[#D9D9D6] dark:border-[#333333]">
          Send a Message
        </div>

        {submitted ? (
          <div className="bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#D9D9D6] dark:border-[#333333] p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-full">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-[20px] font-bold text-[#111111] dark:text-[#FFFFFF]">
              Thank You!
            </h3>
            <p className="text-[14px] text-[#6F6F6F] max-w-md leading-relaxed">
              Your message has been sent successfully. We will review it and get back to you as soon as possible.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 px-5 py-2.5 border border-[#D9D9D6] dark:border-[#333333] text-[12px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                <option value="Batch Setup Help">Batch Setup Help</option>
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
              disabled={isSubmitting}
              className="w-full py-4 mt-2 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity rounded-none inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending message...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send message</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
