'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarImportModal } from './CalendarImportModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Trash2, 
  CalendarDays, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Palmtree, 
  GraduationCap, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  X,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { getTodayDateString, deduplicateAcademicEvents } from '@/lib/timetableUtils';
import { CalendarEventType } from '@/lib/types';

interface UnifiedCalendarItem {
  id: string;
  title: string;
  type: string;
  dateStr: string;
  subject?: string;
  location?: string;
  time?: string;
  description?: string;
  itemSource: 'homework' | 'event' | 'exam';
}

export const AcademicCalendar: React.FC = () => {
  const { 
    homework, 
    events, 
    exams = [], 
    addEvent, 
    deleteEvent, 
    deleteHomework, 
    deleteExam, 
    cleanDuplicateEvents, 
    subjects, 
    user 
  } = useApp();
  
  const router = useRouter();
  const isSignedIn = !!user;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showImportCalendarModal, setShowImportCalendarModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'holiday' | 'exam' | 'assignment' | 'event'>('all');

  // Form states for manual add
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newTime, setNewTime] = useState('10:00');
  const [newType, setNewType] = useState<CalendarEventType>('event');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const dupCount = deduplicateAcademicEvents(events).removedCount;

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const jumpToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(getTodayDateString());
  };

  const handleSaveEvent = () => {
    if (!newTitle.trim()) return;
    addEvent({
      title: newTitle.trim(),
      type: newType,
      date: newDate,
      startTime: newTime,
      location: newLocation.trim() || undefined,
      description: newDescription.trim() || undefined,
    });
    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    setShowAddEventModal(false);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Unified Data & Deduplication (MTE vs Exam) ───────────────────────
  const datesWithSpecificExams = new Set<string>();
  const allItems: UnifiedCalendarItem[] = [];
  const itemsByDate = new Map<string, UnifiedCalendarItem[]>();

  // 1. Process Exams First (Highest specificity: contains subject, room, time, syllabus)
  exams.forEach((ex) => {
    if (!ex.date) return;
    const dStr = ex.date.split('T')[0];
    datesWithSpecificExams.add(dStr);

    const item: UnifiedCalendarItem = {
      id: ex.id,
      title: ex.subjectName ? `Exam: ${ex.subjectName}` : 'Examination',
      type: 'exam',
      dateStr: dStr,
      subject: ex.subjectName,
      location: ex.room ? `Room ${ex.room}` : 'Exam Hall',
      time: ex.time || '09:30 AM',
      description: ex.syllabus ? `Syllabus: ${ex.syllabus}` : undefined,
      itemSource: 'exam',
    };
    allItems.push(item);
    const existing = itemsByDate.get(dStr) || [];
    existing.push(item);
    itemsByDate.set(dStr, existing);
  });

  // Helper: detect if an event is a generic placeholder (e.g. "MTE", "Mid Term Exam", "Finals")
  const isGenericExamTitle = (t: string) => {
    const clean = t.trim().toLowerCase();
    return /^(mte|ete|mid[\s-]?term|end[\s-]?term|exam|exams|examination|examinations|mid[\s-]?sem|end[\s-]?sem|mid[\s-]?semester|end[\s-]?semester)(\s*(exam|exams|examination|examinations|week|slot))?$/i.test(clean);
  };

  // 2. Process Academic Events & Holidays
  events.forEach((ev) => {
    if (!ev.date) return;
    const dStr = ev.date;

    // DEDUPLICATION: If a specific exam exists on this date, suppress generic "MTE" / "Exam" events!
    const isExamLike = ev.type === 'exam' || isGenericExamTitle(ev.title);
    if (isExamLike && datesWithSpecificExams.has(dStr)) {
      return; // Suppress duplicate MTE event
    }

    const sub = ev.subjectId ? subjectMap.get(ev.subjectId) : undefined;
    const item: UnifiedCalendarItem = {
      id: ev.id,
      title: ev.title,
      type: ev.type || 'event',
      dateStr: ev.date,
      subject: sub?.name || sub?.shortName,
      location: ev.location,
      time: ev.startTime || '10:00 AM',
      description: ev.description,
      itemSource: 'event',
    };
    allItems.push(item);
    const existing = itemsByDate.get(ev.date) || [];
    existing.push(item);
    itemsByDate.set(ev.date, existing);
  });

  // 3. Process Homework / Assignment Deadlines
  homework.forEach((hw) => {
    if (!hw.deadline) return;
    const dStr = hw.deadline.split('T')[0];
    const sub = subjectMap.get(hw.subjectId);
    const item: UnifiedCalendarItem = {
      id: hw.id,
      title: hw.title,
      type: 'assignment',
      dateStr: dStr,
      subject: sub?.name || sub?.shortName,
      location: '',
      time: '11:59 PM',
      description: hw.description,
      itemSource: 'homework',
    };
    allItems.push(item);
    const existing = itemsByDate.get(dStr) || [];
    existing.push(item);
    itemsByDate.set(dStr, existing);
  });

  // Categorized counts for segmented filters
  const holidaysCount = allItems.filter(i => i.type === 'holiday').length;
  const examsCount = allItems.filter(i => i.type === 'exam').length;
  const assignmentsCount = allItems.filter(i => i.type === 'assignment' || i.type === 'homework').length;
  const campusEventsCount = allItems.filter(i => i.type === 'event').length;

  // Upcoming items across semester
  const todayStr = getTodayDateString();
  const allUpcoming = allItems
    .filter(i => i.dateStr >= todayStr)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  const upcomingSpotlight = allUpcoming.slice(0, 3);
  const nextEventAfterSelected = allUpcoming.find(i => i.dateStr > selectedDate);

  // Type styling metadata
  const getEventTypeMeta = (type: string) => {
    switch (type.toLowerCase()) {
      case 'holiday':
        return {
          label: 'HOLIDAY',
          icon: Palmtree,
          badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
          dotColor: 'bg-emerald-500',
        };
      case 'exam':
        return {
          label: 'EXAM',
          icon: GraduationCap,
          badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
          dotColor: 'bg-rose-500',
        };
      case 'assignment':
      case 'homework':
      case 'deadline':
        return {
          label: 'DEADLINE',
          icon: AlertCircle,
          badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
          dotColor: 'bg-amber-500',
        };
      default:
        return {
          label: 'CAMPUS EVENT',
          icon: CalendarDays,
          badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
          dotColor: 'bg-sky-500',
        };
    }
  };

  const getRelativeDayTag = (dateStr: string) => {
    if (dateStr === todayStr) return 'TODAY';
    const target = new Date(`${dateStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'TOMORROW';
    if (diffDays > 1) return `IN ${diffDays} DAYS`;
    return 'PAST';
  };

  // Build rectangular 35 or 42 grid cells
  interface CalendarDayCell {
    dateKey: string;
    dayNum: number;
    isCurrentMonth: boolean;
    dateObj: Date;
  }

  const calendarCells: CalendarDayCell[] = [];

  // Previous month overflow days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dNum);
    const dateKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    calendarCells.push({
      dateKey,
      dayNum: dNum,
      isCurrentMonth: false,
      dateObj: prevDate,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateKey,
      dayNum: d,
      isCurrentMonth: true,
      dateObj: new Date(year, month, d),
    });
  }

  // Next month overflow days (to complete 35 or 42 cells)
  const totalGridCells = calendarCells.length <= 35 ? 35 : 42;
  const remainingCells = totalGridCells - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, month + 1, d);
    const dateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dateKey,
      dayNum: d,
      isCurrentMonth: false,
      dateObj: nextDate,
    });
  }

  // Selected date data
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
  const selectedDateFormatted = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const rawSelectedItems = itemsByDate.get(selectedDate) || [];
  const selectedItems = rawSelectedItems.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'holiday') return item.type === 'holiday';
    if (activeFilter === 'exam') return item.type === 'exam';
    if (activeFilter === 'assignment') return item.type === 'assignment' || item.type === 'homework';
    if (activeFilter === 'event') return item.type === 'event';
    return true;
  });

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full pt-2 sm:pt-6 pb-20">
      
      {/* ── 1. Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-[26px] sm:text-[32px] font-black text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-tight">
              Academic Calendar
            </h2>
            <p className="text-[13px] text-[#71717A] dark:text-[#94A3B8] mt-0.5">
              Semester deadlines, examination periods & campus holidays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!isSignedIn) { router.push('/sign-in'); return; }
                setShowImportCalendarModal(true);
              }}
              className="flex items-center justify-center h-9 px-3.5 rounded-lg border border-[#D9D9D6] dark:border-white/[0.08] text-[#111111] dark:text-[#F4F4F6] text-[12.5px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-white/[0.04] transition-colors gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Magic Import
            </button>
            <button
              onClick={() => {
                if (!isSignedIn) { router.push('/sign-in'); return; }
                setShowAddEventModal(true);
              }}
              className="flex items-center justify-center h-9 px-3.5 rounded-lg bg-[#111111] dark:bg-white text-white dark:text-[#090A0C] text-[12.5px] font-semibold transition-colors gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Event
            </button>
            {dupCount > 0 && (
              <button
                onClick={() => cleanDuplicateEvents()}
                className="flex items-center justify-center h-9 px-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-[11px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors gap-1 cursor-pointer"
                title="Clean duplicate events"
              >
                <Sparkles className="w-3 h-3" /> Clean ({dupCount})
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-black/[0.04] dark:border-white/[0.06] w-fit">
          <button
            onClick={() => setActiveFilter('all')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer",
              activeFilter === 'all'
                ? "bg-white dark:bg-[#1E2028] text-[#111111] dark:text-white shadow-2xs font-bold"
                : "text-[#71717A] hover:text-[#111111] dark:hover:text-white"
            )}
          >
            All ({allItems.length})
          </button>
          <button
            onClick={() => setActiveFilter('holiday')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              activeFilter === 'holiday'
                ? "bg-white dark:bg-[#1E2028] text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold"
                : "text-[#71717A] hover:text-[#111111] dark:hover:text-white"
            )}
          >
            <Palmtree className="w-3.5 h-3.5 text-emerald-600" />
            Holidays ({holidaysCount})
          </button>
          <button
            onClick={() => setActiveFilter('exam')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              activeFilter === 'exam'
                ? "bg-white dark:bg-[#1E2028] text-rose-700 dark:text-rose-400 shadow-2xs font-bold"
                : "text-[#71717A] hover:text-[#111111] dark:hover:text-white"
            )}
          >
            <GraduationCap className="w-3.5 h-3.5 text-rose-600" />
            Exams ({examsCount})
          </button>
          <button
            onClick={() => setActiveFilter('assignment')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              activeFilter === 'assignment'
                ? "bg-white dark:bg-[#1E2028] text-amber-700 dark:text-amber-400 shadow-2xs font-bold"
                : "text-[#71717A] hover:text-[#111111] dark:hover:text-white"
            )}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Deadlines ({assignmentsCount})
          </button>
          {campusEventsCount > 0 && (
            <button
              onClick={() => setActiveFilter('event')}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                activeFilter === 'event'
                  ? "bg-white dark:bg-[#1E2028] text-sky-700 dark:text-sky-400 shadow-2xs font-bold"
                  : "text-[#71717A] hover:text-[#111111] dark:hover:text-white"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
              Events ({campusEventsCount})
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Dual-Pane Pro Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Calendar Card (~58% width) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121318] p-5 sm:p-6 shadow-xs">
            
            {/* Month Header & Controls */}
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[17px] sm:text-[19px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight">
                  {monthName}
                </h3>
                <button
                  onClick={jumpToToday}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-[#71717A] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg text-[#71717A] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Row */}
            <div className="grid grid-cols-7 mb-2 text-center">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                <div key={i} className="py-1">
                  <span className="text-[10.5px] font-mono font-bold tracking-wider text-[#A1A1AA] dark:text-[#71717A]">
                    {d}
                  </span>
                </div>
              ))}
            </div>

            {/* 35/42 Cell Rectangular Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((cell) => {
                const isSelected = selectedDate === cell.dateKey;
                const isToday = todayStr === cell.dateKey;
                const dayItems = itemsByDate.get(cell.dateKey) || [];
                
                const activeFilterItems = activeFilter === 'all'
                  ? dayItems
                  : dayItems.filter(item => {
                      if (activeFilter === 'holiday') return item.type === 'holiday';
                      if (activeFilter === 'exam') return item.type === 'exam';
                      if (activeFilter === 'assignment') return item.type === 'assignment' || item.type === 'homework';
                      if (activeFilter === 'event') return item.type === 'event';
                      return true;
                    });

                const hasActiveEvents = activeFilterItems.length > 0;
                const hasHoliday = dayItems.some(i => i.type === 'holiday');
                const hasExam = dayItems.some(i => i.type === 'exam');

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cell.dateKey);
                      if (!cell.isCurrentMonth) {
                        setCurrentMonth(new Date(cell.dateObj.getFullYear(), cell.dateObj.getMonth(), 1));
                      }
                    }}
                    className={clsx(
                      "h-13 sm:h-15 rounded-xl flex flex-col items-center justify-between p-1.5 transition-all duration-150 cursor-pointer relative group",
                      !cell.isCurrentMonth && "opacity-30 hover:opacity-60",
                      isSelected && "bg-[#111111] text-white dark:bg-white dark:text-[#111111] shadow-sm",
                      !isSelected && isToday && "ring-2 ring-amber-500/70 bg-amber-500/[0.04] text-[#111111] dark:text-white font-bold",
                      !isSelected && !isToday && "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[#333333] dark:text-[#E2E8F0]"
                    )}
                  >
                    <span className={clsx(
                      "text-[13px] sm:text-[14px] leading-none transition-colors mt-0.5",
                      isSelected ? "font-bold text-white dark:text-[#111111]" : isToday ? "font-bold text-amber-600 dark:text-amber-400" : "font-medium"
                    )}>
                      {cell.dayNum}
                    </span>

                    {/* Event Dots */}
                    {hasActiveEvents ? (
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        {activeFilterItems.slice(0, 3).map((item, idx) => {
                          const meta = getEventTypeMeta(item.type);
                          return (
                            <span
                              key={idx}
                              className={clsx(
                                "w-1.5 h-1.5 rounded-full",
                                isSelected ? "bg-white/80 dark:bg-black/80" : meta.dotColor
                              )}
                            />
                          );
                        })}
                        {activeFilterItems.length > 3 && (
                          <span className={clsx(
                            "text-[8px] font-mono leading-none font-bold",
                            isSelected ? "text-white/80 dark:text-black/80" : "text-[#71717A]"
                          )}>
                            +
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-1.5 mb-0.5" />
                    )}

                    {/* Corner Indicators */}
                    {hasHoliday && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Holiday" />
                    )}
                    {hasExam && !hasHoliday && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" title="Exam" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Day Agenda & Upcoming Spotlight (~42% width) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Selected Date Agenda Card */}
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121318] p-5 shadow-xs flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#71717A]">
                  AGENDA FOR
                </p>
                <h4 className="text-[16px] font-bold text-[#111111] dark:text-white tracking-tight">
                  {selectedDateFormatted}
                </h4>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {getRelativeDayTag(selectedDate)}
              </span>
            </div>

            {/* Event Items List */}
            {selectedItems.length === 0 ? (
              <div className="py-8 px-4 rounded-xl border border-dashed border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1.5 opacity-80" />
                <p className="text-[13px] font-semibold text-[#111111] dark:text-[#F4F4F6]">
                  No items on this date
                </p>
                <p className="text-[11.5px] text-[#71717A] mt-0.5 max-w-[240px]">
                  No classes, exams or assignment deadlines.
                </p>

                {nextEventAfterSelected && (
                  <button
                    onClick={() => {
                      setSelectedDate(nextEventAfterSelected.dateStr);
                      const d = new Date(`${nextEventAfterSelected.dateStr}T00:00:00`);
                      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                    }}
                    className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-black/[0.04] dark:border-white/[0.06] transition-colors cursor-pointer"
                  >
                    <span>Jump to Next: {nextEventAfterSelected.title.slice(0, 22)}...</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedItems.map((item, idx) => {
                  const meta = getEventTypeMeta(item.type);
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.02] p-3.5 flex items-start justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5",
                          meta.badgeColor
                        )}>
                          <meta.icon className="w-4 h-4" />
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold tracking-wider border ${meta.badgeColor}`}>
                              {meta.label}
                            </span>
                            {item.subject && (
                              <span className="text-[11.5px] font-semibold text-amber-700 dark:text-amber-400 truncate">
                                {item.subject}
                              </span>
                            )}
                          </div>

                          <h5 className="text-[14px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight leading-snug">
                            {item.title}
                          </h5>

                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[#71717A] mt-1.5">
                            {item.time && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {item.time}
                              </span>
                            )}
                            {item.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                {item.location}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-[11.5px] text-[#555555] dark:text-[#94A3B8] mt-2 bg-black/[0.02] dark:bg-white/[0.03] p-2 rounded-lg border border-black/[0.04] dark:border-white/[0.06] whitespace-pre-wrap leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (item.itemSource === 'homework') {
                            deleteHomework(item.id);
                          } else if (item.itemSource === 'exam') {
                            if (deleteExam) deleteExam(item.id);
                          } else {
                            deleteEvent(item.id);
                          }
                        }}
                        title="Delete item"
                        className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Semester Upcoming Spotlight Strip */}
          {upcomingSpotlight.length > 0 && (
            <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121318] p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#71717A] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" /> NEXT ON SEMESTER TIMELINE
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {upcomingSpotlight.map((item, idx) => {
                  const d = new Date(`${item.dateStr}T00:00:00`);
                  const monthShort = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const dayNum = d.getDate();
                  const meta = getEventTypeMeta(item.type);
                  const relTag = getRelativeDayTag(item.dateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(item.dateStr);
                        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      }}
                      className="p-2.5 rounded-xl border border-black/[0.05] dark:border-white/[0.06] hover:border-black/20 dark:hover:border-white/20 bg-black/[0.01] dark:bg-white/[0.02] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-10 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex flex-col items-center justify-center shrink-0">
                          <span className="text-[7.5px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 leading-none">
                            {monthShort}
                          </span>
                          <span className="text-[14px] font-black text-[#111111] dark:text-white leading-tight mt-0.5">
                            {dayNum}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-[12.5px] font-bold text-[#111111] dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10.5px] text-[#71717A] truncate">
                            {item.subject || meta.label} {item.location && `· ${item.location}`}
                          </span>
                        </div>
                      </div>

                      <span className="shrink-0 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {relTag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Import Modal ─────────────────────────────────────────── */}
      <CalendarImportModal 
        isOpen={showImportCalendarModal} 
        onClose={() => setShowImportCalendarModal(false)} 
      />

      {/* ── 4. Quick Add Event Modal ─────────────────────────────────── */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#13141A] w-full max-w-md rounded-[20px] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl relative flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight">
                  Add to Calendar
                </h3>
              </div>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Category Picker */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-1.5 block">
                Category
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                {(['event', 'holiday', 'exam', 'assignment'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={clsx(
                      "py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all cursor-pointer",
                      newType === t
                        ? "bg-white dark:bg-[#1E2028] text-[#111111] dark:text-white shadow-2xs font-bold"
                        : "text-[#71717A] hover:text-[#111111] dark:hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#F7F7F5] dark:bg-[#0A0B0E] border border-[#D9D9D6] dark:border-white/[0.1] rounded-xl px-3.5 py-2.5 text-[13px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Campus Placement Drive / Fest"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-1 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#F7F7F5] dark:bg-[#0A0B0E] border border-[#D9D9D6] dark:border-white/[0.1] rounded-xl px-3 py-2 text-[12.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-1 block">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#F7F7F5] dark:bg-[#0A0B0E] border border-[#D9D9D6] dark:border-white/[0.1] rounded-xl px-3 py-2 text-[12.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-1 block">
                  Location / Room (Optional)
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-[#F7F7F5] dark:bg-[#0A0B0E] border border-[#D9D9D6] dark:border-white/[0.1] rounded-xl px-3.5 py-2 text-[12.5px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Auditorium / LT-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#71717A] mb-1 block">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#F7F7F5] dark:bg-[#0A0B0E] border border-[#D9D9D6] dark:border-white/[0.1] rounded-xl px-3.5 py-2 text-[12px] text-[#111111] dark:text-[#F4F4F6] focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Event details or notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="px-4 py-2 rounded-xl text-[12.5px] font-medium text-[#71717A] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEvent}
                disabled={!newTitle.trim()}
                className="px-5 py-2 rounded-xl bg-[#111111] dark:bg-white text-white dark:text-[#090A0C] text-[12.5px] font-semibold disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};