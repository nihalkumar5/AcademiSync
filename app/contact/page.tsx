'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feedback / Feature Request');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
          <MessageSquare className="w-4 h-4" />
          <span>Student Support &amp; Developer Contact</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Contact Us
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6D61] dark:text-[#9E958C]">
          Have feedback, found a bug, or need help setting up your college timetable? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Contact Info */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#1C1B19]/90 border border-[#E6DDD2] dark:border-[#2C2926] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EFEAE2] dark:bg-[#2A2724] text-[#8C6B5D] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Developer Contact</h3>
            
            <div className="flex flex-col gap-2 text-xs text-[#7A6D61] dark:text-[#9A9188]">
              <div>
                <span className="font-semibold text-[#1A1918] dark:text-[#F4F1EA] block">Email</span>
                <a
                  href="mailto:kumarnihal829@gmail.com"
                  className="font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] hover:underline"
                >
                  kumarnihal829@gmail.com
                </a>
              </div>

              <div>
                <span className="font-semibold text-[#1A1918] dark:text-[#F4F1EA] block">Phone / WhatsApp</span>
                <a
                  href="tel:+919565550673"
                  className="font-mono font-bold text-[#8C6B5D] dark:text-[#CBB5A1] hover:underline"
                >
                  +91 9565550673
                </a>
              </div>

              <div>
                <span className="font-semibold text-[#1A1918] dark:text-[#F4F1EA] block">Location</span>
                <span className="font-medium text-[#3B322C] dark:text-[#D1C7BD]">
                  IIIT Naya Raipur (IIIT NR), Chhattisgarh, India
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[#FAF6F0] dark:bg-[#1E1C1A] border border-[#E8DFC8] dark:border-[#2D2A27] flex flex-col gap-2.5 text-xs text-[#6E5643] dark:text-[#C4B7AB]">
            <span className="font-bold flex items-center gap-1.5 text-[#1A1918] dark:text-[#F4F1EA]">
              <Sparkles className="w-3.5 h-3.5 text-[#8C6B5D]" />
              Quick Support
            </span>
            <span>Reach out anytime for developer support, feature suggestions, or campus timetable onboardings.</span>
          </div>
        </div>

        {/* Right Side: Contact Form */}
        <div className="md:col-span-7 p-6 rounded-3xl bg-white/95 dark:bg-[#1C1B19]/95 border border-[#E6DDD2] dark:border-[#2C2926] shadow-sm">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-10 gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1918] dark:text-[#F4F1EA]">
                Message Sent!
              </h3>
              <p className="text-xs text-[#7A6D61] dark:text-[#9A9188] max-w-xs">
                Thank you for reaching out. Our team will review your message and reply via email shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 text-xs font-semibold text-[#8C6B5D] underline cursor-pointer"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-xs sm:text-sm font-medium focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Your Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-xs sm:text-sm font-medium focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Topic
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
                >
                  <option value="Feedback / Feature Request">Feedback / Feature Request</option>
                  <option value="Bug Report / OCR Issue">Bug Report / OCR Issue</option>
                  <option value="Timetable Help">Timetable Setup Assistance</option>
                  <option value="Account & Data Erasure">Account &amp; Data Erasure</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#5C4F44] dark:text-[#C4B7AB]">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you need help with or share your idea..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4EFE6]/60 dark:bg-[#201E1C] border border-[#DFD6CA] dark:border-[#2C2926] text-xs sm:text-sm font-medium focus:outline-none resize-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="mt-2 w-full py-3 rounded-2xl bg-[#8C6B5D] hover:bg-[#785B4E] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </motion.button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
