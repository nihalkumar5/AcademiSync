'use client';

import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, Calendar, CalendarDays, BookOpen, Clock, AlertCircle, Plus, Share2, UserPlus, Edit2, Trash2, MapPin, Hourglass, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { ExamImportModal } from './ExamImportModal';
import { AddEditExamModal } from './AddEditExamModal';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { formatBatchDisplayName } from '@/lib/timetableUtils';
import { Exam } from '@/lib/types';

export const ExamsView: React.FC = () => {
  const { exams, deleteExam, isBatchCR, shareTimetableWithBatch, shareExamsWithBatch, joinSharedExams, showToast, user, profile, currentBatchData } = useApp();
  const router = useRouter();
  const isSignedIn = !!user;
  const [showImportModal, setShowImportModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedExamToEdit, setSelectedExamToEdit] = useState<Exam | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [now, setNow] = useState(new Date());
  const [expandedSyllabus, setExpandedSyllabus] = useState<Record<string, boolean>>({});

  const toggleSyllabus = (id: string) => {
    setExpandedSyllabus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleMagicImport = () => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setShowImportModal(true);
  };

  const handleAddNewExam = () => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    setSelectedExamToEdit(null);
    setShowAddEditModal(true);
  };

  const handleEditExam = (exam: Exam) => {
    setSelectedExamToEdit(exam);
    setShowAddEditModal(true);
  };

  const handleDeleteExam = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the exam for "${name}"?`)) {
      deleteExam(id);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    const input = inviteInput.trim();
    if (!input) return;

    setIsJoining(true);
    let inviteKey = input;

    try {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const url = new URL(input);
        const inviteParam = url.searchParams.get('exams_invite');
        if (inviteParam) {
          inviteKey = inviteParam;
        }
      }
    } catch (err) {
      console.error('Failed to parse exams URL:', err);
    }

    try {
      await joinSharedExams(inviteKey);
      setShowJoinModal(false);
      setInviteInput('');
    } catch (err) {
      console.error('Failed to join exams:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const upcomingExams = exams.filter(e => new Date(e.date).getTime() > now.getTime());
  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;
  const remainingExams = nextExam ? exams.filter(e => e.id !== nextExam.id) : exams;
  const remainingUpcoming = remainingExams.filter(e => new Date(e.date).getTime() > now.getTime());
  const pastExams = remainingExams.filter(e => new Date(e.date).getTime() <= now.getTime());

  const getCountdownParts = (targetDate: string) => {
    const diffMs = new Date(targetDate).getTime() - now.getTime();
    if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, isPast: true };
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, isPast: false };
  };

  const getCountdown = (targetDate: string) => {
    const diffMs = new Date(targetDate).getTime() - now.getTime();
    if (diffMs <= 0) return 'Ongoing or finished';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${minutes}m left`;
  };

  const getExamStatusBadge = (targetDate: string) => {
    const diffMs = new Date(targetDate).getTime() - now.getTime();
    if (diffMs <= 0) {
      return { label: 'COMPLETED', isPast: true, color: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20' };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days === 0) {
      return {
        label: hours <= 2 ? 'STARTS SOON' : 'TODAY',
        isPast: false,
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
      };
    }
    if (days === 1) {
      return {
        label: 'TOMORROW',
        isPast: false,
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold',
      };
    }
    if (days <= 5) {
      return {
        label: `IN ${days} DAYS`,
        isPast: false,
        color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 font-semibold',
      };
    }
    return {
      label: `IN ${days} DAYS`,
      isPast: false,
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 font-medium',
    };
  };

  const renderExamCard = (exam: Exam) => {
    const dateObj = new Date(exam.date);
    const dateDay = dateObj.getDate();
    const dateMonth = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dateWeekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const isPast = dateObj.getTime() < now.getTime();
    const status = getExamStatusBadge(exam.date);
    const isExpanded = expandedSyllabus[exam.id];

    return (
      <div
        key={exam.id}
        className={`group relative rounded-[14px] border transition-all duration-200 p-4 sm:p-4.5 flex flex-col gap-3 ${
          isPast
            ? 'bg-[#F9F9F8] dark:bg-[#101115] border-black/[0.05] dark:border-white/[0.05] opacity-60'
            : 'bg-white dark:bg-[#14151B] border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 shadow-xs hover:shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Left Calendar Date Ticket Stamp */}
          <div className="w-[52px] h-[56px] sm:w-[56px] sm:h-[60px] rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-amber-500/40 transition-colors">
            <span className="text-[9.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none">
              {dateMonth}
            </span>
            <span className="text-[20px] sm:text-[22px] font-black text-[#111111] dark:text-[#FFFFFF] leading-tight mt-0.5">
              {dateDay}
            </span>
            <span className="text-[9px] font-medium text-[#737373] dark:text-[#94A3B8] leading-none">
              {dateWeekday}
            </span>
          </div>

          {/* Center Content */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-[15.5px] sm:text-[16.5px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate sm:whitespace-normal">
                {exam.subjectName}
              </h4>
            </div>

            {/* Badges and metadata row */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* Status Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold tracking-wider border ${status.color}`}>
                {status.label}
              </span>

              {/* Time Pill */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-[11px] font-mono text-[#555555] dark:text-[#CBD5E1]">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                {exam.time || dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {exam.durationMinutes ? ` (${exam.durationMinutes}m)` : ''}
              </span>

              {/* Room Badge */}
              {exam.room && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Room {exam.room}
                </span>
              )}

              {/* Syllabus Toggle Button */}
              {exam.syllabus && (
                <button
                  type="button"
                  onClick={() => toggleSyllabus(exam.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[10.5px] font-medium text-[#6B6B6B] dark:text-[#94A3B8] transition-colors cursor-pointer border border-black/[0.04] dark:border-white/[0.06]"
                >
                  <BookOpen className="w-3 h-3 text-blue-500 shrink-0" />
                  <span>Syllabus</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 shrink-0 self-start">
            <button
              onClick={() => handleEditExam(exam)}
              className="p-1.5 rounded-[6px] text-[#737373] hover:text-[#111111] dark:text-[#94A3B8] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Edit Exam"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteExam(exam.id, exam.subjectName)}
              className="p-1.5 rounded-[6px] text-[#737373] hover:text-rose-600 dark:text-[#94A3B8] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Delete Exam"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Syllabus Drawer */}
        {exam.syllabus && isExpanded && (
          <div className="mt-1 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[12.5px] text-[#444444] dark:text-[#CBD5E1] bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] dark:text-[#94A3B8] mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-amber-500" /> Syllabus Breakdown
            </div>
            {exam.syllabus}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full pt-2 sm:pt-6 pb-16">
      <div className="mb-12">
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Exam,<br />
          Schedule,<br />
          Countdown
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-[280px]">
          Track your upcoming exams, syllabus, and preparation time.
        </p>

        <div className="flex flex-wrap items-center gap-3 mt-8">
          <button
            onClick={() => {
              if (!isSignedIn) { router.push('/sign-in'); return; }
              setShowJoinModal(true);
            }}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            Join Exams
          </button>
          <button
            onClick={handleMagicImport}
            className="flex items-center justify-center h-10 px-4 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[13px] font-semibold transition-colors gap-2 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
          <button
            onClick={handleAddNewExam}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Exam
          </button>
          {exams.length > 0 && isBatchCR && (
            <button
              onClick={async () => {
                if (!isSignedIn) { router.push('/sign-in'); return; }
                try {
                  const key = await shareTimetableWithBatch();
                  const code = currentBatchData?.inviteCode || (profile?.batchKey && profile.batchKey.length <= 8 ? profile.batchKey : key);
                  const batchTitle = formatBatchDisplayName(profile.branch, profile.semester, profile.section);
                  const shareText = `🔥 *Join our official ${batchTitle} Exam Schedule & Timetable on Intersemester!*

🔑 *Batch Code:* ${code}

⚡ Realtime Class Cancellation & Reschedule Alerts
📅 Live Exam Schedule, Room Numbers & Lab Sessions

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

👉 Open Intersemester App → Tap *Connect Batch* → Enter Code: *${code}*`;

                  const res = await shareLink({
                    title: 'Join our Class Timetable & Exam Schedule',
                    text: shareText,
                    dialogTitle: 'Share Batch Code via',
                  });
                  if (res === 'copied') showToast('Code Copied', `Batch code copied: ${code}`, 'success');
                } catch (err) {}
              }}
              className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
      </div>

      {nextExam && (() => {
        const cd = getCountdownParts(nextExam.date);
        return (
          <div className="relative mb-10 overflow-hidden rounded-[20px] border border-black/[0.08] dark:border-amber-500/25 bg-white dark:bg-[#121318] p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(245,158,11,0.05)] text-left transition-all">
            {/* Top Ambient Glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-400/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar: Badge & Action Cluster */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-mono font-bold tracking-wider uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 dark:bg-amber-400"></span>
                  </span>
                  UP NEXT
                </div>
                <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-mono hidden sm:inline-block">
                  · Target Date: {new Date(nextExam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleEditExam(nextExam)}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Edit Next Exam"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteExam(nextExam.id, nextExam.subjectName)}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-600 dark:text-[#A1A1AA] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Delete Next Exam"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Middle Row: Title & Digital Countdown Counter */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-5 pb-5 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex flex-col min-w-0">
                <h3 className="text-[24px] sm:text-[28px] font-black text-[#111111] dark:text-white tracking-tight leading-tight">
                  {nextExam.subjectName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[12.5px] text-[#71717A]">
                  <span className="inline-flex items-center gap-1 font-medium text-[#111111] dark:text-[#E2E8F0]">
                    <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                    {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[#111111] dark:text-[#E2E8F0]">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {nextExam.time || new Date(nextExam.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Digital Flight-Board Countdown Timer */}
              <div className="flex items-center gap-2 shrink-0 bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-2xl border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1A1B22] border border-black/[0.06] dark:border-white/[0.08] rounded-xl w-14 sm:w-16 h-14 shadow-2xs">
                  <span className="text-[20px] sm:text-[22px] font-black font-mono leading-none text-[#111111] dark:text-white">
                    {String(cd.days).padStart(2, '0')}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold uppercase text-[#71717A] tracking-wider mt-1">
                    DAYS
                  </span>
                </div>
                <span className="text-amber-500 font-bold text-lg font-mono leading-none">:</span>
                <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1A1B22] border border-black/[0.06] dark:border-white/[0.08] rounded-xl w-14 sm:w-16 h-14 shadow-2xs">
                  <span className="text-[20px] sm:text-[22px] font-black font-mono leading-none text-[#111111] dark:text-white">
                    {String(cd.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold uppercase text-[#71717A] tracking-wider mt-1">
                    HOURS
                  </span>
                </div>
                <span className="text-amber-500 font-bold text-lg font-mono leading-none">:</span>
                <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1A1B22] border border-black/[0.06] dark:border-white/[0.08] rounded-xl w-14 sm:w-16 h-14 shadow-2xs">
                  <span className="text-[20px] sm:text-[22px] font-black font-mono leading-none text-[#111111] dark:text-white">
                    {String(cd.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[8.5px] font-mono font-bold uppercase text-[#71717A] tracking-wider mt-1">
                    MINS
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              {nextExam.room && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[11.5px] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Room {nextExam.room}
                </span>
              )}

              {nextExam.durationMinutes && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 text-blue-800 dark:text-blue-300 font-mono text-[11.5px]">
                  <Hourglass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {nextExam.durationMinutes >= 60
                    ? `${(nextExam.durationMinutes / 60).toFixed(nextExam.durationMinutes % 60 === 0 ? 0 : 1)} Hours Duration`
                    : `${nextExam.durationMinutes} Mins Duration`}
                </span>
              )}

              {nextExam.syllabus && (
                <button
                  type="button"
                  onClick={() => toggleSyllabus(nextExam.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[11.5px] font-medium text-[#444444] dark:text-[#E2E8F0] border border-black/[0.06] dark:border-white/[0.08] transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Syllabus Breakdown</span>
                  {expandedSyllabus[nextExam.id] ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              )}
            </div>

            {/* Syllabus Box */}
            {nextExam.syllabus && expandedSyllabus[nextExam.id] && (
              <div className="mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-1.5">
                <p className="text-[12.5px] text-[#333333] dark:text-[#E2E8F0] leading-relaxed bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06] whitespace-pre-wrap font-sans">
                  {nextExam.syllabus}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex flex-col">
        {exams.length === 0 ? (
          <div className="py-12 border border-dashed border-[#D9D9D6] dark:border-white/[0.08] rounded-[16px] flex flex-col items-center justify-center text-center p-6 bg-[#F7F7F5]/30 dark:bg-white/[0.01]">
            <Calendar className="w-8 h-8 text-[#6F6F6F] dark:text-[#A1A1AA] mb-3" />
            <h4 className="text-[16px] font-semibold text-[#111111] dark:text-[#F4F4F6]">No exams scheduled</h4>
            <p className="text-[14px] text-[#6F6F6F] dark:text-[#94A3B8] mt-1 mb-5">
              Upload your exam timetable using magic scanner or add manually.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleAddNewExam}
                className="flex items-center justify-center h-9 px-4 border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[12.5px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors gap-1.5 cursor-pointer rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Add Exam Manually
              </button>
              <button
                onClick={handleMagicImport}
                className="flex items-center justify-center h-9 px-4 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[12.5px] font-semibold transition-colors gap-1.5 cursor-pointer shadow-xs rounded-lg"
              >
                <Sparkles className="w-3.5 h-3.5" /> Magic Import
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* 1. Other upcoming exams (excluding nextExam to eliminate redundancy) */}
            {remainingUpcoming.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] dark:text-[#A1A1AA]">
                    {nextExam ? `LATER UPCOMING EXAMS (${remainingUpcoming.length})` : `UPCOMING EXAMS (${remainingUpcoming.length})`}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {remainingUpcoming.map(renderExamCard)}
                </div>
              </div>
            )}

            {/* 2. When only nextExam is scheduled, avoid duplicate card */}
            {nextExam && remainingUpcoming.length === 0 && pastExams.length === 0 && (
              <div className="rounded-[14px] border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] p-6 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5" />
                <p className="text-[13.5px] font-semibold text-[#111111] dark:text-[#F4F4F6]">
                  All clear after this!
                </p>
                <p className="text-[12px] text-[#6F6F6F] dark:text-[#94A3B8] mt-0.5">
                  Your upcoming exam is featured in the spotlight card above.
                </p>
              </div>
            )}

            {/* 3. Past / completed exams */}
            {pastExams.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] dark:text-[#A1A1AA]">
                    COMPLETED EXAMS ({pastExams.length})
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {pastExams.map(renderExamCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ExamImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
      <AddEditExamModal
        isOpen={showAddEditModal}
        onClose={() => {
          setShowAddEditModal(false);
          setSelectedExamToEdit(null);
        }}
        examToEdit={selectedExamToEdit}
      />

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Shared Exams">
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
          <p className="text-[13px] text-[#6B6B6B] dark:text-[#94A3B8]">
            Enter the 6-character Batch Code to sync exams with your class.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g. 65SQ9K"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 border border-[#E5E5E5] dark:border-white/[0.1] bg-transparent text-[14px] font-mono font-bold tracking-[2px] focus:outline-none focus:border-[#111111] dark:focus:border-white/30 text-[#111111] dark:text-[#F4F4F6] transition-colors uppercase"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="h-10 px-4 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[13px] font-semibold flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
