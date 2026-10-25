'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getTodayDateString, getTomorrowDateString, isGenericExamTitle } from '@/lib/timetableUtils';
import { Clock, MapPin, BookOpen, ChevronDown, ChevronUp, ArrowRight, Backpack, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveExamItem {
  id: string;
  subjectName: string;
  date: string;
  time?: string;
  room?: string;
  syllabus?: string;
  durationMinutes?: number;
}

export const HomeExamAlertCard: React.FC = () => {
  const { exams, events, setActiveView } = useApp();
  const [expandedSyllabusMap, setExpandedSyllabusMap] = useState<Record<string, boolean>>({});
  const [showChecklist, setShowChecklist] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    admit_card: false,
    id_card: false,
    pens: false,
    calc: false,
  });

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  // Helper: Collect and normalize all exams for a given date
  // Strictly filter out generic placeholders like "MTE", "ETE", "Mid Term Exam"
  const getExamsForDate = (dateStr: string): ActiveExamItem[] => {
    const list: ActiveExamItem[] = [];

    // 1. Specific timetable exams
    exams.forEach((ex) => {
      if (ex.date && ex.date.split('T')[0] === dateStr) {
        // Suppress generic "MTE" exam entries if they lack real subject name
        if (isGenericExamTitle(ex.subjectName)) {
          return;
        }

        list.push({
          id: ex.id,
          subjectName: ex.subjectName,
          date: ex.date,
          time: ex.time || '09:30 AM',
          room: ex.room,
          syllabus: ex.syllabus,
          durationMinutes: ex.durationMinutes,
        });
      }
    });

    // 2. Academic calendar exam entries (only if NOT generic MTE)
    events.forEach((ev) => {
      if (ev.date === dateStr && ev.type === 'exam') {
        if (isGenericExamTitle(ev.title)) {
          return; // Suppress generic "MTE" event
        }

        const isDupe = list.some(r => 
          r.subjectName.toLowerCase().includes(ev.title.toLowerCase()) || 
          ev.title.toLowerCase().includes(r.subjectName.toLowerCase())
        );
        if (!isDupe) {
          list.push({
            id: ev.id,
            subjectName: ev.title,
            date: ev.date,
            time: (ev as any).time || ev.startTime || '09:30 AM',
            room: ev.location,
            syllabus: ev.description,
          });
        }
      }
    });

    // Sort by scheduled time
    list.sort((a, b) => {
      const toMins = (t?: string) => {
        if (!t) return 0;
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!m) return 0;
        let h = parseInt(m[1], 10);
        const mins = parseInt(m[2], 10);
        const ampm = m[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + mins;
      };
      return toMins(a.time) - toMins(b.time);
    });

    return list;
  };

  const todayExams = getExamsForDate(todayStr);
  const tomorrowExams = getExamsForDate(tomorrowStr);

  const isToday = todayExams.length > 0;
  const activeExams = isToday ? todayExams : tomorrowExams;

  if (activeExams.length === 0) return null;

  // Hero Card ONLY shows the immediate recent / upcoming exam
  const recentExam = activeExams[0];
  const laterExams = activeExams.slice(1);

  // Calculate Countdown for the recent upcoming exam
  const calculateCountdown = () => {
    const dOnly = recentExam.date.split('T')[0];
    let targetDate: Date;
    const timeStr = recentExam.time;

    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        targetDate = new Date(`${dOnly}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      } else {
        targetDate = new Date(`${dOnly}T09:30:00`);
      }
    } else if (recentExam.date.includes('T')) {
      targetDate = new Date(recentExam.date);
    } else {
      targetDate = new Date(`${dOnly}T09:30:00`);
    }

    const diffMs = targetDate.getTime() - currentTime;
    if (diffMs <= 0) {
      return { isPast: true, text: isToday ? 'In Progress / Completed' : 'Starting Soon', hours: 0, mins: 0 };
    }
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isPast: false,
      text: totalHours >= 24
        ? `Starts in ${Math.floor(totalHours / 24)}d ${totalHours % 24}h`
        : `Starts in ${totalHours}h ${mins}m`,
      hours: totalHours,
      mins,
    };
  };

  const countdown = calculateCountdown();

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSyllabus = (id: string) => {
    setExpandedSyllabusMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const checklistItems = [
    { key: 'admit_card', label: 'Hall Ticket / Admit Card', desc: 'Printed hard copy' },
    { key: 'id_card', label: 'College ID Card', desc: 'Mandatory for exam hall entry' },
    { key: 'pens', label: 'Black / Blue Pens & Stationery', desc: 'In transparent exam pouch' },
    { key: 'calc', label: 'Scientific Calculator / Watch', desc: 'If permitted for subject' },
  ];

  const packedCount = Object.values(checkedItems).filter(Boolean).length;
  const isRecentSyllabusOpen = !!expandedSyllabusMap[recentExam.id];

  return (
    <div className="w-full text-left flex flex-col gap-3">
      {/* ── Primary Hero Spotlight Card (Recent Exam Only) ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        <div className="relative overflow-hidden border-2 border-black dark:border-white bg-[#FFFFFF] dark:bg-[#121318] p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.9)] flex flex-col gap-4">
          
          {/* Top Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-mono text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[1.5px] text-amber-700 dark:text-amber-400">
                {isToday ? "TODAY'S EXAMINATION" : "EXAM TOMORROW"} · CLASSES SUSPENDED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-black text-white dark:bg-white dark:text-black font-mono text-[10.5px] font-bold uppercase tracking-wider">
                {countdown.text}
              </span>
            </div>
          </div>

          {/* Main Subject & Information */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <h3 className="text-[22px] sm:text-[26px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-tight">
                {recentExam.subjectName}
              </h3>
              <p className="text-[13px] text-[#555555] dark:text-[#A1A1AA] font-medium leading-relaxed">
                Regular timetable is suspended. Campus is observing examination schedule.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('exams')}
              className="self-start px-3.5 py-2 border border-black dark:border-white bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-[#111111] dark:text-[#FFFFFF] text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>Exam Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Chips row: Time, Room, Duration */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] font-mono text-[11.5px] text-[#222222] dark:text-[#E2E8F0] font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {isToday ? 'Today' : 'Tomorrow'} · {recentExam.time || '09:30 AM'}
              {recentExam.durationMinutes ? ` (${recentExam.durationMinutes}m)` : ''}
            </span>

            {recentExam.room && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-semibold text-[11.5px]">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Room {recentExam.room}
              </span>
            )}

            {recentExam.syllabus && (
              <button
                type="button"
                onClick={() => toggleSyllabus(recentExam.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/[0.03] hover:bg-black/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] font-mono text-[11px] font-medium text-[#444444] dark:text-[#E2E8F0] transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Syllabus Peek</span>
                {isRecentSyllabusOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/[0.03] hover:bg-black/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.08] font-mono text-[11px] font-medium text-[#444444] dark:text-[#E2E8F0] transition-colors cursor-pointer"
            >
              <Backpack className="w-3.5 h-3.5 text-blue-500" />
              <span>Exam Kit ({packedCount}/4)</span>
              {showChecklist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Syllabus Drawer */}
          <AnimatePresence>
            {isRecentSyllabusOpen && recentExam.syllabus && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-2 border-t border-black/10 dark:border-white/10"
              >
                <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50 block mb-1">
                    Syllabus Breakdown
                  </span>
                  <p className="text-[12.5px] text-[#333333] dark:text-[#E2E8F0] leading-relaxed whitespace-pre-wrap font-sans">
                    {recentExam.syllabus}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsible Exam Kit Checklist Drawer */}
          <AnimatePresence>
            {showChecklist && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-2 border-t border-black/10 dark:border-white/10"
              >
                <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                      Mandatory Hall Essentials
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {packedCount} of 4 Packed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {checklistItems.map((item) => {
                      const isChecked = checkedItems[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => toggleCheck(item.key)}
                          className={`p-2.5 text-left border flex items-center justify-between transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/15 dark:border-emerald-500/30'
                              : 'bg-white dark:bg-[#16171D] border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className={`text-[12px] font-semibold truncate ${isChecked ? 'line-through text-black/50 dark:text-white/50' : 'text-[#111111] dark:text-[#F4F4F6]'}`}>
                              {item.label}
                            </span>
                            <span className="text-[10.5px] text-black/40 dark:text-white/40 truncate">
                              {item.desc}
                            </span>
                          </div>
                          {isChecked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-black/30 dark:text-white/30 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Subsequent Exams Shown Below Hero Card ── */}
      {laterExams.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {laterExams.map((exam, idx) => {
            const isLaterSyllabusOpen = !!expandedSyllabusMap[exam.id];

            return (
              <div 
                key={exam.id}
                className="p-4 sm:p-4.5 border border-black dark:border-white bg-[#FFFFFF] dark:bg-[#14151B] flex flex-col gap-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-black/[0.05] dark:bg-white/[0.08] text-black dark:text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                        Next Exam Later {isToday ? 'Today' : 'Tomorrow'} · Slot {idx + 2}
                      </span>
                      <span className="font-mono text-[11px] text-[#666666] dark:text-[#A1A1AA]">
                        {exam.time}
                      </span>
                    </div>
                    <h4 className="text-[17px] sm:text-[18px] font-bold text-[#111111] dark:text-[#FFFFFF] truncate">
                      {exam.subjectName}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {exam.syllabus && (
                      <button
                        type="button"
                        onClick={() => toggleSyllabus(exam.id)}
                        className="px-2.5 py-1 border border-black/20 dark:border-white/20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-mono text-[#333333] dark:text-[#E2E8F0] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3 text-amber-500" />
                        <span>Syllabus</span>
                        {isLaterSyllabusOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#555555] dark:text-[#CBD5E1]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    {exam.time || '02:00 PM'}
                  </span>
                  {exam.room && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      Room {exam.room}
                    </span>
                  )}
                  {exam.durationMinutes && (
                    <span>· {exam.durationMinutes}m duration</span>
                  )}
                </div>

                {isLaterSyllabusOpen && exam.syllabus && (
                  <div className="mt-1 p-3 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 text-[12px] text-[#333333] dark:text-[#E2E8F0] leading-relaxed whitespace-pre-wrap font-sans">
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50 block mb-0.5">
                      Syllabus Breakdown
                    </span>
                    {exam.syllabus}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
