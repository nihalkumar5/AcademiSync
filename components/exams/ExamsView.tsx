'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, CalendarDays, BookOpen, Clock, AlertCircle, Plus, Share2, UserPlus } from 'lucide-react';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { ExamImportModal } from './ExamImportModal';
import { useClerk, useUser } from '@clerk/nextjs';
import { Modal } from '@/components/ui/Modal';

export const ExamsView: React.FC = () => {
  const { exams, shareExamsWithBatch, joinSharedExams, showToast } = useApp();
  const { isSignedIn } = useUser();
  const clerk = useClerk();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleMagicImport = () => {
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    setShowImportModal(true);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      clerk.openSignIn();
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

  const getCountdown = (targetDate: string) => {
    const diffMs = new Date(targetDate).getTime() - now.getTime();
    if (diffMs <= 0) return 'Ongoing or finished';
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${minutes}m left`;
  };

  return (
    <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full pb-10">

      {/* Editorial stacked header — matches Tasks page */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <h1 className="text-[clamp(3rem,12vw,5.5rem)] font-medium tracking-tight leading-none text-black dark:text-white">
            Exam,<br />Schedule,<br />Countdown
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-none border border-black dark:border-white text-black dark:text-white">
              {upcomingExams.length} upcoming
            </span>
          </div>
          <p className="text-sm text-black/60 dark:text-white/60 mt-2 font-medium max-w-md">
            Track your upcoming exams, syllabus, and preparation time.
          </p>
        </div>

        {/* Action buttons — same style as Tasks */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleMagicImport}
            className="flex items-center px-4 py-2.5 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-bold uppercase cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Magic Import
          </button>

          <button
            onClick={async () => {
              if (!isSignedIn) {
                clerk.openSignIn();
                return;
              }
              try {
                const key = await shareExamsWithBatch();
                const link = `${window.location.origin}/?exams_invite=${key}`;
                navigator.clipboard.writeText(link);
                showToast('Exams Shared', 'Invite link copied to clipboard!', 'success');
              } catch (err) {}
            }}
            className="flex items-center px-4 py-2.5 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-bold uppercase cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 mr-2" />
            Share Exams
          </button>

          <button
            onClick={() => {
              if (!isSignedIn) {
                clerk.openSignIn();
                return;
              }
              setShowJoinModal(true);
            }}
            className="flex items-center px-4 py-2.5 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-bold uppercase cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 mr-2" />
            Join Exams
          </button>
        </div>
      </div>

      {/* Next Exam Countdown — flat brutalist card */}
      {nextExam && (
        <div className="glass-card p-5 text-left border border-black dark:border-white">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
            <AlertCircle className="w-3.5 h-3.5" />
            Next Exam Countdown
          </div>
          <h3 className="text-2xl font-black text-black dark:text-white">{nextExam.subjectName}</h3>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">
            {new Date(nextExam.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            {' '}at{' '}
            {new Date(nextExam.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="mt-3 inline-flex px-3 py-1 border border-black dark:border-white font-mono text-sm font-bold text-black dark:text-white">
            {getCountdown(nextExam.date)}
          </div>
        </div>
      )}

      {/* Exams list */}
      <div className="flex flex-col gap-3 mt-1">
        <h3 className="text-xs font-bold tracking-widest uppercase text-black/50 dark:text-white/50">
          All Upcoming Exams
        </h3>

        {exams.length === 0 ? (
          <EmptyState
            icon={<MonochromeIllustration type="exam" size={48} />}
            title="No exams scheduled"
            description="Upload your exam timetable using magic scanner or add manually."
            actionLabel="Import Timetable"
            onAction={handleMagicImport}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {exams.map(exam => {
              const isPast = new Date(exam.date).getTime() < now.getTime();
              return (
                <div
                  key={exam.id}
                  className={`glass-card p-4 text-left border ${isPast ? 'opacity-50 border-black/20 dark:border-white/20' : 'border-black dark:border-white'}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="font-bold text-black dark:text-white text-base">{exam.subjectName}</h4>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 border border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 shrink-0">
                      {isPast ? 'Done' : getCountdown(exam.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-black/50 dark:text-white/50 mt-2">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {new Date(exam.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(exam.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {exam.syllabus && (
                    <div className="mt-3 p-2.5 bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 text-xs">
                      <span className="font-bold text-black dark:text-white block mb-1 uppercase tracking-wider text-[10px]">Syllabus</span>
                      <p className="text-black/60 dark:text-white/60 leading-relaxed">{exam.syllabus}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ExamImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      <Modal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setInviteInput('');
        }}
        title="Join Shared Exam Schedule"
        description="Paste the exam invite link or code shared by your classmate to import upcoming exams."
      >
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 mt-3 text-left">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">
              Exam Link / Code
            </label>
            <div className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-950 border border-black dark:border-white">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="e.g. https://academi-sync-chi.vercel.app/?exams_invite=..."
                required
                className="w-full bg-transparent text-sm font-medium text-black dark:text-white focus:outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="flex gap-2.5 justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                setShowJoinModal(false);
                setInviteInput('');
              }}
              className="px-4 py-2 border border-black dark:border-white text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining}
              className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white text-xs font-bold uppercase hover:bg-transparent hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-none disabled:opacity-50"
            >
              {isJoining ? 'Syncing...' : 'Sync & Import'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

