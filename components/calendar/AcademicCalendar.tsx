'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarImportModal } from './CalendarImportModal';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ArrowRight, 
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
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build unified items list across events, homework, and exams
  const itemsByDate = new Map<string, UnifiedCalendarItem[]>();
  const allItems: UnifiedCalendarItem[] = [];

  // 1. Homework / Assignment Deadlines
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

  // 2. Academic Calendar Events & Holidays
  events.forEach((ev) => {
    if (!ev.date) return;
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

  // 3. Exams
  exams.forEach((ex) => {
    if (!ex.date) return;
    const dStr = ex.date.split('T')[0];
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

  // Counts for Bento Counter Strip
  const holidaysCount = allItems.filter(i => i.type === 'holiday').length;
  const examsCount = allItems.filter(i => i.type === 'exam').length;
  const assignmentsCount = allItems.filter(i => i.type === 'assignment' || i.type === 'homework').length;

  // Next upcoming items in the next 14 days
  const todayStr = getTodayDateString();
  const allUpcoming = allItems
    .filter(i => i.dateStr >= todayStr)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // Pick up to 3 upcoming spotlight items
  const upcomingSpotlight = allUpcoming.slice(0, 3);

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
          label: 'EVENT',
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

  // Render Calendar Grid
  const renderCalendarDays = () => {
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => (
      <div key={`blank-${i}`} className="min-h-[58px] sm:min-h-[64px] border border-transparent" />
    ));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const isSelected = selectedDate === dateKey;
      const isToday = todayStr === dateKey;
      const dayItems = itemsByDate.get(dateKey) || [];
      const hasEvents = dayItems.length > 0;
      const hasHoliday = dayItems.some(item => item.type === 'holiday');
      const hasExam = dayItems.some(item => item.type === 'exam');

      return (
        <button
          key={dateKey}
          type="button"
          onClick={() => setSelectedDate(dateKey)}
          className={clsx(
            "min-h-[58px] sm:min-h-[64px] p-1.5 sm:p-2 rounded-[12px] flex flex-col items-center justify-between transition-all duration-150 cursor-pointer text-left relative group",
            isSelected 
              ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-sm" 
              : isToday
                ? "border border-amber-500/40 bg-amber-500/[0.04] text-[#111111] dark:text-white"
                : "border border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[#333333] dark:text-[#E2E8F0]"
          )}
        >
          {/* Day Number */}
          <span className={clsx(
            "text-[13px] sm:text-[14px] leading-none transition-colors",
            isSelected ? "font-bold text-white dark:text-[#111111]" : isToday ? "font-bold text-amber-600 dark:text-amber-400" : "font-medium"
          )}>
            {dayNum}
          </span>

          {/* Indicator Dot Strip */}
          {hasEvents && (
            <div className="flex items-center justify-center gap-1 mt-auto pt-1">
              {dayItems.slice(0, 3).map((item, idx) => {
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
              {dayItems.length > 3 && (
                <span className={clsx(
                  "text-[8px] font-mono leading-none font-bold",
                  isSelected ? "text-white/80 dark:text-black/80" : "text-[#71717A]"
                )}>
                  +{dayItems.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Subtle Corner Badge for Holidays / Exams */}
          {hasHoliday && !isSelected && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Campus Holiday" />
          )}
          {hasExam && !hasHoliday && !isSelected && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" title="Exam Scheduled" />
          )}
        </button>
      );
    });

    return [...blanks, ...days];
  };

  // Selected date details
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
  const selectedDateFormatted = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
    <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full pt-2 sm:pt-6 pb-20">
      
      {/* ── 1. Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-tight">
              Academic Calendar
            </h2>
            <p className="text-[13.5px] text-[#6B6B6B] dark:text-[#94A3B8] mt-1">
              Semester timeline, exam schedules, deadlines & campus holidays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
                className="flex items-center justify-center h-9 px-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-[11.5px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors gap-1 cursor-pointer"
                title="Clean duplicate events"
              >
                <Sparkles className="w-3 h-3" /> Clean ({dupCount})
              </button>
            )}
          </div>
        </div>

        {/* Bento Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#71717A]">Total Events</span>
              <span className="text-[15px] font-bold text-[#111111] dark:text-white leading-tight">{allItems.length}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Palmtree className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#71717A]">Holidays</span>
              <span className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{holidaysCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#71717A]">Exams</span>
              <span className="text-[15px] font-bold text-rose-600 dark:text-rose-400 leading-tight">{examsCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#71717A]">Deadlines</span>
              <span className="text-[15px] font-bold text-amber-600 dark:text-amber-400 leading-tight">{assignmentsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Upcoming Spotlight Bento ──────────────────────────────── */}
      {upcomingSpotlight.length > 0 && (
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> UPCOMING SPOTLIGHT
            </p>
            <span className="text-[11px] text-[#71717A] font-mono">Next 14 Days</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingSpotlight.map((item, idx) => {
              const d = new Date(`${item.dateStr}T00:00:00`);
              const monthStr = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const dayNum = d.getDate();
              const weekdayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
              const meta = getEventTypeMeta(item.type);
              const relativeTag = getRelativeDayTag(item.dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(item.dateStr);
                    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  }}
                  className="rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#14151B] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold tracking-wider border ${meta.badgeColor}`}>
                      <meta.icon className="w-3 h-3" />
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {relativeTag}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-11 h-12 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex flex-col items-center justify-center shrink-0 group-hover:border-amber-500/40 transition-colors">
                      <span className="text-[8.5px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 leading-none">
                        {monthStr}
                      </span>
                      <span className="text-[17px] font-black text-[#111111] dark:text-white leading-tight mt-0.5">
                        {dayNum}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <h4 className="text-[13.5px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight leading-snug truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] mt-1 truncate">
                        {item.subject && <span>{item.subject}</span>}
                        {item.subject && item.location && <span>·</span>}
                        {item.location && <span>{item.location}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Main Interactive Calendar Card ────────────────────────── */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121318] p-4 sm:p-6 shadow-xs mb-8">
        
        {/* Month Header & Jump Bar */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight">
              {monthName}
            </h3>
            <button
              onClick={jumpToToday}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.1] text-[#71717A] hover:text-[#111111] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-1.5">
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

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
            <div key={i} className="py-1">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#A1A1AA] dark:text-[#71717A]">
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {renderCalendarDays()}
        </div>
      </div>

      {/* ── 4. Day Agenda & Event Details ────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#71717A] dark:text-[#A1A1AA]">
              AGENDA FOR {selectedDateFormatted.toUpperCase()}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-black/[0.04] dark:bg-white/[0.06] text-[#71717A] dark:text-[#A1A1AA]">
              {rawSelectedItems.length} {rawSelectedItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Filter Pills */}
          {rawSelectedItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'holiday', 'exam', 'assignment', 'event'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setActiveFilter(filterKey)}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer",
                    activeFilter === filterKey
                      ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-semibold"
                      : "text-[#71717A] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  )}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedItems.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#D9D9D6] dark:border-white/[0.08] bg-[#F7F7F5]/30 dark:bg-white/[0.01] p-8 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2 opacity-80" />
            <h4 className="text-[14.5px] font-semibold text-[#111111] dark:text-[#F4F4F6]">
              All clear for this date
            </h4>
            <p className="text-[12.5px] text-[#6F6F6F] dark:text-[#94A3B8] mt-0.5">
              No classes, exam alerts, or deadlines scheduled for {selectedDateFormatted}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedItems.map((item, idx) => {
              const meta = getEventTypeMeta(item.type);
              return (
                <div
                  key={idx}
                  className="rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#14151B] p-4 sm:p-4.5 flex items-start justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Category Icon Bubble */}
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      meta.badgeColor
                    )}>
                      <meta.icon className="w-5 h-5" />
                    </div>

                    {/* Content Details */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9.5px] font-mono font-bold tracking-wider border ${meta.badgeColor}`}>
                          {meta.label}
                        </span>
                        {item.subject && (
                          <span className="text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                            {item.subject}
                          </span>
                        )}
                      </div>

                      <h4 className="text-[15px] font-bold text-[#111111] dark:text-[#F4F4F6] tracking-tight leading-snug">
                        {item.title}
                      </h4>

                      {/* Location & Time Tags */}
                      <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#71717A] mt-2">
                        {item.time && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            {item.time}
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            {item.location}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-[12px] text-[#555555] dark:text-[#94A3B8] mt-2 bg-black/[0.02] dark:bg-white/[0.03] p-2.5 rounded-lg border border-black/[0.04] dark:border-white/[0.06] whitespace-pre-wrap leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
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
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. Import Modal ─────────────────────────────────────────── */}
      <CalendarImportModal 
        isOpen={showImportCalendarModal} 
        onClose={() => setShowImportCalendarModal(false)} 
      />

      {/* ── 6. Modern Quick Add Event Modal ──────────────────────────── */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#13141A] w-full max-w-md rounded-[20px] border border-black/[0.08] dark:border-white/[0.1] p-6 shadow-2xl relative flex flex-col gap-4">
            
            {/* Header */}
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

            {/* Event Category Segmented Picker */}
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
                  placeholder="e.g. Mid-Term Examination / Tech Fest"
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
                  placeholder="Additional syllabus or event details..."
                />
              </div>
            </div>

            {/* Action Buttons */}
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