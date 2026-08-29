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
  const { exams, shareTimetableWithBatch, shareExamsWithBatch, joinSharedExams, showToast } = useApp();
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
              if (!isSignedIn) { clerk.openSignIn(); return; }
              setShowJoinModal(true);
            }}
            className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
          >
            Join Exams
          </button>
          <button
            onClick={handleMagicImport}
            className="flex items-center justify-center h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold transition-colors gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Magic Import
          </button>
          {exams.length > 0 && (
            <button
              onClick={async () => {
                if (!isSignedIn) { clerk.openSignIn(); return; }
                try {
                  const key = await shareTimetableWithBatch();
                  const link = `${window.location.origin}/?invite=${key}`;
                  navigator.clipboard.writeText(link);
                  showToast('Batch Shared', 'Timetable, calendar, and exams link copied!', 'success');
                } catch (err) {}
              }}
              className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
      </div>

      {nextExam && (
        <div className="mb-12 flex flex-col p-5 bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
              <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-indigo-600 dark:text-indigo-400">
                NEXT EXAM
              </span>
            </div>
            <span className="text-[12px] font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-800/50 px-2 py-1 rounded-md">
              {getCountdown(nextExam.date)}
            </span>
          </div>
          <h3 className="text-[18px] font-bold text-indigo-950 dark:text-white mb-2">{nextExam.subjectName}</h3>
          <p className="text-[14px] font-medium text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
            {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {nextExam.time && ` • ${nextExam.time}`}
          </p>
        </div>
      )}

      <div className="flex flex-col">
        <p className="text-[10px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-4">
          ALL UPCOMING EXAMS
        </p>

        {exams.length === 0 ? (
          <div className="flex flex-col py-8">
            <p className="text-[18px] text-[#111111] dark:text-[#FFFFFF] font-medium leading-snug">
              No exams scheduled.
            </p>
            <p className="text-[14px] text-[#6F6F6F] mt-1 mb-4">
              Upload your exam timetable using magic scanner or add manually.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {exams.map((exam, idx) => {
              const dateObj = new Date(exam.date);
              const dateDay = dateObj.getDate();
              const dateMonth = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const isPast = dateObj.getTime() < now.getTime();
              
              return (
                <div key={exam.id} className={`border border-[#E5E5E5] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-5 flex flex-col md:flex-row md:items-start justify-between group rounded-none ${idx !== 0 ? 'border-t-0' : ''} ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-5 w-full">
                    <div className="flex flex-col items-center justify-center min-w-[40px]">
                      <span className="text-[14px] font-bold text-[#111111] dark:text-[#FFFFFF] leading-none">{dateDay}</span>
                      <span className="text-[10px] font-bold tracking-[1px] uppercase text-[#111111] dark:text-[#FFFFFF] mt-1">{dateMonth}</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <p className="text-[15px] text-[#111111] dark:text-[#FFFFFF] font-medium leading-relaxed">
                        {exam.subjectName}
                      </p>
                      <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6F6F6F] mt-1 mb-2">
                        {isPast ? 'COMPLETED' : getCountdown(exam.date)}
                      </p>
                      
                      {(exam.syllabus) && (
                        <div className="mt-2 pt-3 border-t border-[#E5E5E5] dark:border-[#333333] w-full">
                          <p className="text-[13px] text-[#6F6F6F] whitespace-pre-wrap leading-relaxed">{exam.syllabus}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ExamImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Join Shared Exams">
        <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
          <p className="text-[13px] text-[#6B6B6B]">
            Enter an invite code or paste an invite link to sync exams with your batch.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g., ext_..."
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="w-full px-4 py-2 border border-[#E5E5E5] dark:border-[#333333] bg-transparent text-[13px] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isJoining}
            className="h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold flex items-center justify-center disabled:opacity-50"
          >
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
