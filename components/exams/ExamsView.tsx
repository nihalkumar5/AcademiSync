'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, CalendarDays, BookOpen, Clock, AlertCircle, Plus } from 'lucide-react';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';
import { ExamImportModal } from './ExamImportModal';
import { useClerk, useUser } from '@clerk/nextjs';

export const ExamsView: React.FC = () => {
  const { exams } = useApp();
  const { isSignedIn } = useUser();
  const clerk = useClerk();
  const [showImportModal, setShowImportModal] = useState(false);
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
            className="flex items-center px-5 py-3 rounded-none border border-black dark:border-white text-black dark:text-white bg-transparent hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-sm font-medium cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Magic Import
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
    </div>
  );
};

