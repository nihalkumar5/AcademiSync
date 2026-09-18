'use client';

import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, Calendar, CalendarDays, BookOpen, Clock, AlertCircle, Plus, Share2, UserPlus, Edit2, Trash2 } from 'lucide-react';
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

      {nextExam && (
        <div className="mb-12 flex flex-col p-5 bg-[#FFFBEB] dark:bg-[#16130B] border border-[#FDE68A] dark:border-amber-900/40 rounded-none shadow-xs text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-[11px] font-mono font-bold tracking-[1.5px] uppercase text-[#B45309] dark:text-amber-400">
                NEXT EXAM
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-mono font-bold text-[#78350F] dark:text-amber-200 bg-amber-200/70 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/50 px-2.5 py-1 rounded-none uppercase tracking-wider">
                {getCountdown(nextExam.date)}
              </span>
              <button
                onClick={() => handleEditExam(nextExam)}
                className="p-1 text-[#78350F] hover:text-[#B45309] dark:text-amber-300 dark:hover:text-amber-100 hover:bg-amber-200/60 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                title="Edit Exam"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <h3 className="text-[19px] sm:text-[21px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight mb-2">
            {nextExam.subjectName}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-[13px] font-mono text-[#92400E] dark:text-[#FDE68A]/80 leading-relaxed font-medium">
            <span>
              {new Date(nextExam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' • '}
              {new Date(nextExam.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            {nextExam.room && (
              <span className="bg-amber-200/50 dark:bg-amber-900/40 px-2 py-0.5 text-[12px] font-medium text-[#78350F] dark:text-amber-200">
                Room: {nextExam.room}
              </span>
            )}
            {nextExam.durationMinutes && (
              <span className="text-[12px] text-[#92400E]/80 dark:text-[#FDE68A]/70">
                ({nextExam.durationMinutes} mins)
              </span>
            )}
          </div>
          {nextExam.syllabus && (
            <div className="mt-3 pt-3 border-t border-amber-200/80 dark:border-amber-900/50">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800/70 dark:text-amber-400/70 block mb-0.5">
                Syllabus
              </span>
              <p className="text-[12.5px] text-[#78350F] dark:text-[#FDE68A]/90 leading-relaxed">
                {nextExam.syllabus}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col">
        <p className="text-[10px] font-bold tracking-[2px] uppercase text-[#6F6F6F] dark:text-[#A1A1AA] mb-4">
          ALL UPCOMING EXAMS
        </p>

        {exams.length === 0 ? (
          <div className="py-12 border border-dashed border-[#D9D9D6] dark:border-white/[0.08] flex flex-col items-center justify-center text-center p-6">
            <Calendar className="w-8 h-8 text-[#6F6F6F] dark:text-[#A1A1AA] mb-3" />
            <h4 className="text-[16px] font-semibold text-[#111111] dark:text-[#F4F4F6]">No exams scheduled</h4>
            <p className="text-[14px] text-[#6F6F6F] dark:text-[#94A3B8] mt-1 mb-5">
              Upload your exam timetable using magic scanner or add manually.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleAddNewExam}
                className="flex items-center justify-center h-9 px-4 border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[12.5px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Exam Manually
              </button>
              <button
                onClick={handleMagicImport}
                className="flex items-center justify-center h-9 px-4 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] text-[12.5px] font-semibold transition-colors gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Magic Import
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {exams.map((exam, idx) => {
              const dateObj = new Date(exam.date);
              const dateDay = dateObj.getDate();
              const dateMonth = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const isPast = dateObj.getTime() < now.getTime();
              
              return (
                <div key={exam.id} className={`border border-[#E5E5E5] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#121317] p-5 flex flex-col md:flex-row md:items-start justify-between group rounded-none ${idx !== 0 ? 'border-t-0' : ''} ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-5 w-full">
                    <div className="flex flex-col items-center justify-center min-w-[40px]">
                      <span className="text-[14px] font-bold text-[#111111] dark:text-[#F4F4F6] leading-none">{dateDay}</span>
                      <span className="text-[10px] font-bold tracking-[1px] uppercase text-[#111111] dark:text-[#A1A1AA] mt-1">{dateMonth}</span>
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] text-[#111111] dark:text-[#F4F4F6] font-medium leading-relaxed">
                            {exam.subjectName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2.5 mt-1 mb-2">
                            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6F6F6F] dark:text-[#94A3B8]">
                              {isPast ? 'COMPLETED' : getCountdown(exam.date)}
                            </span>
                            <span className="text-[#D9D9D6] dark:text-white/[0.1]">•</span>
                            <span className="text-[11.5px] font-mono text-[#6F6F6F] dark:text-[#94A3B8] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#A1A1AA]" />
                              {new Date(exam.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              {exam.durationMinutes ? ` (${exam.durationMinutes}m)` : ''}
                            </span>
                            {exam.room && (
                              <>
                                <span className="text-[#D9D9D6] dark:text-white/[0.1]">•</span>
                                <span className="text-[11.5px] font-medium text-[#111111] dark:text-[#F4F4F6] bg-[#F7F7F5] dark:bg-white/[0.04] px-1.5 py-0.5 border border-[#E5E5E5] dark:border-white/[0.08]">
                                  Room {exam.room}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="p-1.5 text-[#6F6F6F] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white hover:bg-[#F7F7F5] dark:hover:bg-white/[0.06] border border-transparent hover:border-[#E5E5E5] dark:hover:border-white/[0.1] transition-all flex items-center gap-1 text-[12px] font-medium cursor-pointer"
                            title="Edit Exam"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id, exam.subjectName)}
                            className="p-1.5 text-[#6F6F6F] hover:text-red-600 dark:text-[#A1A1AA] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      {(exam.syllabus) && (
                        <div className="mt-2 pt-3 border-t border-[#E5E5E5] dark:border-white/[0.08] w-full">
                          <p className="text-[13px] text-[#6F6F6F] dark:text-[#94A3B8] whitespace-pre-wrap leading-relaxed">{exam.syllabus}</p>
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
