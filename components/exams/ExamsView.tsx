'use client';

import { requestSignIn } from '@/components/auth/SignInPrompt';
import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, Calendar, CalendarDays, BookOpen, Clock, AlertCircle, Plus, Share2, UserPlus, Edit2, Trash2, MapPin, Hourglass, ChevronDown, ChevronUp, CheckCircle2 } from '@/components/ui/icons';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { Illustration } from '../ui/Illustration';
import { ExamImportModal } from './ExamImportModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AddEditExamModal } from './AddEditExamModal';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { formatBatchDisplayName, getTodayDateString, getTomorrowDateString, isGenericExamTitle, sanitizeExamSubjectName } from '@/lib/timetableUtils';
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
      requestSignIn({ title: 'Sign in to keep your exams', body: 'Exams are saved to your account, so reminders and countdowns follow you to every device.' });
      return;
    }
    setShowImportModal(true);
  };

  const handleAddNewExam = () => {
    if (!isSignedIn) {
      requestSignIn({ title: 'Sign in to keep your exams', body: 'Exams are saved to your account, so reminders and countdowns follow you to every device.' });
      return;
    }
    setSelectedExamToEdit(null);
    setShowAddEditModal(true);
  };

  const [examToDelete, setExamToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleEditExam = (exam: Exam) => {
    setSelectedExamToEdit(exam);
    setShowAddEditModal(true);
  };

  const handleDeleteExam = (id: string, name: string) => {
    setExamToDelete({ id, name });
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      requestSignIn({ title: 'Sign in to keep your exams', body: 'Exams are saved to your account, so reminders and countdowns follow you to every device.' });
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

  const getExactExamTime = (ex: Exam) => {
    const dOnly = ex.date.split('T')[0];
    if (ex.time) {
      const match = ex.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return new Date(`${dOnly}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();
      }
    }
    return new Date(ex.date.includes('T') ? ex.date : `${dOnly}T09:30:00`).getTime();
  };

  // Completed exams stay visible on their own day, then disappear the next day
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const validExams = exams
    .filter(e => !isGenericExamTitle(e.subjectName))
    .filter(e => !e.date || e.date.split('T')[0] >= todayKey)
    .map(e => ({
      ...e,
      subjectName: sanitizeExamSubjectName(e.subjectName),
    }));

  const sortedExams = [...validExams].sort((a, b) => getExactExamTime(a) - getExactExamTime(b));
  const upcomingExams = sortedExams.filter(e => getExactExamTime(e) > now.getTime());
  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;
  const remainingExams = nextExam ? sortedExams.filter(e => e.id !== nextExam.id) : sortedExams;
  const remainingUpcoming = remainingExams.filter(e => getExactExamTime(e) > now.getTime());
  const pastExams = remainingExams.filter(e => getExactExamTime(e) <= now.getTime());

  const getCountdownParts = (targetDate: string, timeStr?: string) => {
    const dOnly = targetDate.split('T')[0];
    let exactTarget: Date;
    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        exactTarget = new Date(`${dOnly}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      } else {
        exactTarget = new Date(`${dOnly}T09:30:00`);
      }
    } else {
      exactTarget = new Date(targetDate.includes('T') ? targetDate : `${dOnly}T09:30:00`);
    }

    const diffMs = exactTarget.getTime() - now.getTime();
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

  const getExamStatusBadge = (targetDate: string, timeStr?: string) => {
    const dOnly = targetDate.split('T')[0];
    const todayStr = getTodayDateString();
    const tomorrowStr = getTomorrowDateString();

    let examDate: Date;
    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        examDate = new Date(`${dOnly}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      } else {
        examDate = new Date(`${dOnly}T09:30:00`);
      }
    } else {
      examDate = new Date(targetDate.includes('T') ? targetDate : `${dOnly}T09:30:00`);
    }

    const diffMs = examDate.getTime() - now.getTime();

    // 1. Exact Calendar Day: TODAY
    if (dOnly === todayStr) {
      if (diffMs <= 0) {
        return { label: 'COMPLETED', isPast: true, color: 'bg-zinc-500/10 text-muted border-zinc-500/20' };
      }
      const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
      return {
        label: hoursLeft <= 2 ? 'STARTS SOON' : 'TODAY',
        isPast: false,
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
      };
    }

    // 2. Exact Calendar Day: TOMORROW (Never shows TODAY!)
    if (dOnly === tomorrowStr) {
      return {
        label: 'TOMORROW',
        isPast: false,
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold',
      };
    }

    // Past date
    if (dOnly < todayStr || diffMs <= 0) {
      return { label: 'COMPLETED', isPast: true, color: 'bg-zinc-500/10 text-muted border-zinc-500/20' };
    }

    // Future days calculation based on midnight-to-midnight day difference
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const examMidnight = new Date(`${dOnly}T00:00:00`);
    const dayDiff = Math.round((examMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff <= 5) {
      return {
        label: `IN ${dayDiff} DAYS`,
        isPast: false,
        color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 font-semibold',
      };
    }

    return {
      label: `IN ${dayDiff} DAYS`,
      isPast: false,
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 font-medium',
    };
  };

  const formatExamTime = (exam: Exam) =>
    exam.time || new Date(exam.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const formatDuration = (mins?: number) => {
    if (!mins) return '';
    if (mins < 60) return `${mins} min`;
    const h = mins / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
  };

  // Sentence-case relative label for list rows ("Today", "Tomorrow", "In 5 days", "Done")
  const getRelativeLabel = (exam: Exam) => {
    const status = getExamStatusBadge(exam.date, exam.time);
    if (status.isPast) return 'Done';
    if (status.label === 'STARTS SOON') return 'Starts soon';
    if (status.label === 'TODAY') return 'Today';
    if (status.label === 'TOMORROW') return 'Tomorrow';
    return status.label.charAt(0) + status.label.slice(1).toLowerCase();
  };

  const renderExamCard = (exam: Exam) => {
    const dateObj = new Date(exam.date);
    const isPast = getExactExamTime(exam) <= now.getTime();
    const isExpanded = expandedSyllabus[exam.id];
    const relative = getRelativeLabel(exam);
    const isSoon = !isPast && (relative === 'Today' || relative === 'Tomorrow' || relative === 'Starts soon');

    return (
      <li key={exam.id} className={isPast ? 'opacity-60' : ''}>
        <div className="flex gap-4 p-4 sm:p-5">
          <span className="w-12 shrink-0 flex flex-col items-center justify-center py-1.5 border border-line-soft bg-surface-2 leading-none">
            <span className="text-[11px] font-semibold uppercase tracking-[1px] text-rose-600 dark:text-rose-300">
              {dateObj.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="mt-1 text-[20px] font-semibold text-fg tabular-nums">{dateObj.getDate()}</span>
            <span className="mt-1 text-[11px] font-medium text-muted">
              {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className={`text-[16px] font-semibold leading-snug ${isPast ? 'text-muted line-through decoration-1' : 'text-fg'}`}>
                  {exam.subjectName}
                </h4>
                <p className="mt-1 text-[13px] text-muted tabular-nums">
                  {formatExamTime(exam)}
                  {exam.durationMinutes ? ` · ${formatDuration(exam.durationMinutes)}` : ''}
                  {exam.room ? ` · ${exam.room.toLowerCase().startsWith('room') || exam.room.toLowerCase().startsWith('hall') ? exam.room : `Room ${exam.room}`}` : ''}
                </p>
              </div>
              <span className={`shrink-0 text-[12px] whitespace-nowrap ${isSoon ? 'px-2 py-0.5 font-semibold uppercase tracking-[1px] bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'text-muted'}`}>
                {relative}
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-1 -ml-2">
              {exam.syllabus && (
                <button
                  type="button"
                  onClick={() => toggleSyllabus(exam.id)}
                  aria-expanded={!!isExpanded}
                  className="h-9 px-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg hover:bg-surface-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" /> Syllabus
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={() => handleEditExam(exam)}
                className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 cursor-pointer"
                title={`Edit ${exam.subjectName}`} aria-label={`Edit ${exam.subjectName}`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteExam(exam.id, exam.subjectName)}
                className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                title={`Delete ${exam.subjectName}`} aria-label={`Delete ${exam.subjectName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {exam.syllabus && isExpanded && (
              <p className="mt-2 p-3 text-[14px] leading-relaxed whitespace-pre-wrap text-fg bg-surface-2 border border-line-soft">
                {exam.syllabus}
              </p>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full">
      <div className="mb-f5 sm:mb-f6">
        <h2 className="page-title">
          Exam,<br />
          Schedule,<br />
          Countdown
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-[280px]">
          Track your upcoming exams, syllabus, and preparation time.
        </p>

        <div className="page-actions mt-8">
          <button
            onClick={handleAddNewExam}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Exam
          </button>
          <button
            onClick={handleMagicImport}
            className="btn btn-secondary"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
          <button
            onClick={() => {
              if (!isSignedIn) { requestSignIn({ title: 'Sign in to keep your exams', body: 'Exams are saved to your account, so reminders and countdowns follow you to every device.' }); return; }
              setShowJoinModal(true);
            }}
            className="btn btn-secondary"
          >
            Join Exams
          </button>
          {exams.length > 0 && isBatchCR && (
            <button
              onClick={async () => {
                if (!isSignedIn) { requestSignIn({ title: 'Sign in to keep your exams', body: 'Exams are saved to your account, so reminders and countdowns follow you to every device.' }); return; }
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
              className="btn btn-secondary"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
      </div>

      {nextExam && (() => {
        const cd = getCountdownParts(nextExam.date, nextExam.time);
        const relative = getRelativeLabel(nextExam);
        const urgent = relative === 'Starts soon' || relative === 'Today';
        return (
          <section
            aria-label="Next exam"
            className="sheen-ink mb-f5 sm:mb-f6 w-full bg-[#111111] dark:bg-[#15171D] border border-[#111111] dark:border-white/[0.08] p-5 sm:p-6 text-left text-white"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1.4px]">
                <span className="relative flex h-2 w-2">
                  {urgent && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${urgent ? 'bg-rose-400' : 'bg-white/70'}`} />
                </span>
                <span className={urgent ? 'text-rose-300' : 'text-white/80'}>{urgent ? relative : 'Next exam'}</span>
              </span>
              <div className="flex items-center -mr-2">
                <button
                  onClick={() => handleEditExam(nextExam)}
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Edit next exam" aria-label="Edit next exam"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteExam(nextExam.id, nextExam.subjectName)}
                  className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-rose-300 hover:bg-white/10 cursor-pointer"
                  title="Delete next exam" aria-label="Delete next exam"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="mt-3 text-[28px] sm:text-[34px] font-semibold leading-tight tracking-tight">
              {nextExam.subjectName}
            </h3>
            <p className="mt-1.5 text-[14px] text-white/70 tabular-nums">
              {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {formatExamTime(nextExam)}
            </p>

            {/* Countdown */}
            <div className="mt-5 grid grid-cols-3 border border-white/[0.12] divide-x divide-white/[0.12]" aria-label={`Starts in ${cd.days} days ${cd.hours} hours ${cd.minutes} minutes`}>
              {[
                { value: cd.days, label: cd.days === 1 ? 'Day' : 'Days' },
                { value: cd.hours, label: cd.hours === 1 ? 'Hour' : 'Hours' },
                { value: cd.minutes, label: 'Min' },
              ].map((part) => (
                <div key={part.label} className="py-3 flex flex-col items-center">
                  <span className="text-[30px] sm:text-[34px] font-semibold leading-none tabular-nums">{String(part.value).padStart(2, '0')}</span>
                  <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[1.4px] text-white/60">{part.label}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 font-cursive text-[22px] leading-tight font-semibold text-white/80 -rotate-1">
              {cd.days === 0
                ? "It's today. Breathe, you've got this."
                : cd.days <= 3
                ? 'Final stretch: revise, rest, repeat.'
                : 'Plenty of time. A little every day.'}
            </p>

            {(nextExam.room || nextExam.durationMinutes || nextExam.syllabus) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {nextExam.room && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] bg-white/[0.08] border border-white/[0.12]">
                    <MapPin className="w-4 h-4 text-white/70" />
                    {nextExam.room.toLowerCase().startsWith('room') || nextExam.room.toLowerCase().startsWith('hall') ? nextExam.room : `Room ${nextExam.room}`}
                  </span>
                )}
                {nextExam.durationMinutes ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] bg-white/[0.08] border border-white/[0.12]">
                    <Hourglass className="w-4 h-4 text-white/70" />
                    {formatDuration(nextExam.durationMinutes)}
                  </span>
                ) : null}
                {nextExam.syllabus && (
                  <button
                    type="button"
                    onClick={() => toggleSyllabus(nextExam.id)}
                    aria-expanded={!!expandedSyllabus[nextExam.id]}
                    className="inline-flex items-center gap-1.5 px-3 h-9 text-[13px] bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14] cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-white/70" /> Syllabus
                    {expandedSyllabus[nextExam.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}

            {nextExam.syllabus && expandedSyllabus[nextExam.id] && (
              <p className="mt-4 pt-4 border-t border-white/[0.12] text-[14px] text-white/85 leading-relaxed whitespace-pre-wrap">
                {nextExam.syllabus}
              </p>
            )}
          </section>
        );
      })()}

      <div className="flex flex-col">
        {exams.length === 0 ? (
          <div className="py-12 border border-dashed border-line flex flex-col items-center justify-center text-center p-6">
            <Illustration name="exam" className="mb-f4 h-[180px] w-auto max-w-[260px]" />
            <h4 className="text-[17px] font-semibold text-fg">No exams scheduled</h4>
            <p className="text-[14px] text-muted mt-1 mb-5">
              Scan your exam timetable or add exams one by one.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleMagicImport}
                className="btn btn-primary"
              >
                <Sparkles className="w-4 h-4" /> Magic Import
              </button>
              <button
                onClick={handleAddNewExam}
                className="btn btn-secondary"
              >
                <Plus className="w-4 h-4" /> Add Exam
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {remainingUpcoming.length > 0 && (
              <section aria-label="Upcoming exams">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-[17px] font-semibold text-fg tracking-tight">
                    {nextExam ? 'After that' : 'Upcoming'}
                  </h3>
                  <span className="text-[13px] text-muted">{remainingUpcoming.length} {remainingUpcoming.length === 1 ? 'exam' : 'exams'}</span>
                </div>
                <ol className="border border-line bg-surface divide-y divide-line-soft">
                  {remainingUpcoming.map(renderExamCard)}
                </ol>
              </section>
            )}

            {nextExam && remainingUpcoming.length === 0 && pastExams.length === 0 && (
              <div className="border border-dashed border-line p-5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0" />
                <p className="text-[14px] text-fg">
                  That&apos;s the last exam on your list. <span className="text-muted">Nothing else is scheduled after it.</span>
                </p>
              </div>
            )}

            {pastExams.length > 0 && (
              <section aria-label="Completed exams">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-[17px] font-semibold text-fg tracking-tight">Completed</h3>
                  <span className="text-[13px] text-muted">{pastExams.length}</span>
                </div>
                <ol className="border border-line bg-surface divide-y divide-line-soft">
                  {pastExams.map(renderExamCard)}
                </ol>
              </section>
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
          <p className="text-[13px] text-muted">
            Enter the 6-character Batch Code to sync exams with your class.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g. 65SQ9K"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 border border-line-soft bg-transparent text-[14px] font-mono font-bold tracking-[2px] focus:outline-none focus:border-line-strong text-fg transition-colors uppercase"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="btn btn-primary"
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!examToDelete}
        onClose={() => setExamToDelete(null)}
        onConfirm={() => {
          if (examToDelete) deleteExam(examToDelete.id);
          setExamToDelete(null);
        }}
        title="Delete exam?"
        description="This exam will be removed from your schedule and reminders."
        highlightText={examToDelete?.name}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
