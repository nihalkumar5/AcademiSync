'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles, CalendarDays, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { ExamImportModal } from './ExamImportModal';
import { useClerk, useUser } from '@clerk/nextjs';

export const ExamsView: React.FC = () => {
  const { exams } = useApp();
  const { isSignedIn } = useUser();
  const clerk = useClerk();
  const [showImportModal, setShowImportModal] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const handleAIImport = () => {
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
    
    if (days > 0) return `${days} days, ${hours} hrs left`;
    return `${hours} hrs, ${minutes} mins left`;
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight">
            Exam Timetable
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
            Track your upcoming exams, syllabus, and preparation time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIImport}
            className="gap-1.5 rounded-xl border-slate-300 dark:border-zinc-700 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>AI Exam Import</span>
          </Button>
        </div>
      </div>

      {nextExam && (
        <div className="bg-gradient-to-r from-rose-500 to-orange-500 p-5 rounded-2xl text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Next Exam Countdown</span>
            </div>
            <h3 className="text-2xl font-black">{nextExam.subjectName}</h3>
            <p className="text-sm opacity-90 mt-1">
              {new Date(nextExam.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} at {new Date(nextExam.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="mt-4 bg-white/20 backdrop-blur-sm inline-flex px-4 py-2 rounded-xl font-mono text-lg font-bold">
              {getCountdown(nextExam.date)}
            </div>
          </div>
          <CalendarDays className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 opacity-10 text-white/50 -rotate-12" />
        </div>
      )}

      <div className="flex flex-col gap-4 mt-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">All Upcoming Exams</h3>
        
        {exams.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-5 h-5 text-rose-500" />}
            title="No exams scheduled"
            description="Upload your exam timetable using magic scanner or add manually."
            actionLabel="Import Timetable"
            onAction={handleAIImport}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(exam => {
              const isPast = new Date(exam.date).getTime() < now.getTime();
              return (
                <div key={exam.id} className={`p-4 rounded-xl border ${isPast ? 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 opacity-60' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100">{exam.subjectName}</h4>
                    <span className="text-xs bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded font-mono font-medium text-slate-600 dark:text-zinc-400">
                      {isPast ? 'Done' : getCountdown(exam.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400 mt-2">
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
                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-zinc-950/50 rounded-lg text-xs">
                      <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Syllabus / Topics:</span>
                      <p className="text-slate-600 dark:text-zinc-400">{exam.syllabus}</p>
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
