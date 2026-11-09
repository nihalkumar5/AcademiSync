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
} from '@/components/ui/icons';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { getTodayDateString, deduplicateAcademicEvents, isGenericExamTitle } from '@/lib/timetableUtils';
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
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

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

  // 2. Process Academic Events & Holidays
  events.forEach((ev) => {
    if (!ev.date || ev.type === 'assignment' || ev.type === 'homework') return;
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


  // Categorized counts for segmented filters
  const holidaysCount = allItems.filter(i => i.type === 'holiday').length;
  const examsCount = allItems.filter(i => i.type === 'exam').length;
  const assignmentsCount = allItems.filter(i => i.type === 'assignment' || i.type === 'homework').length;
  const campusEventsCount = allItems.filter(i => i.type === 'event').length;

  const matchesFilter = (item: UnifiedCalendarItem) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'assignment') return item.type === 'assignment' || item.type === 'homework';
    return item.type === activeFilter;
  };

  // Upcoming items across semester
  const todayStr = getTodayDateString();
  const allUpcoming = allItems
    .filter(i => i.dateStr >= todayStr)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // List only the month on screen, and skip the day already shown above it
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const filteredUpcoming = allUpcoming.filter(
    (i) => matchesFilter(i) && i.dateStr.startsWith(monthPrefix) && i.dateStr !== selectedDate
  );
  const upcomingMonthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long' });
  const UPCOMING_PREVIEW = 6;
  const visibleUpcoming = showAllUpcoming ? filteredUpcoming : filteredUpcoming.slice(0, UPCOMING_PREVIEW);
  const weekAheadStr = (() => {
    const d = new Date(`${todayStr}T00:00:00`);
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const nextHoliday = allUpcoming.find(i => i.type === 'holiday');
  const nextExam = allUpcoming.find(i => i.type === 'exam');
  const nextEventAfterSelected = allUpcoming.find(i => i.dateStr > selectedDate);

  // One semantic colour per type, shared by the legend, day cells, dots and list bars
  const getEventTypeMeta = (type: string) => {
    switch (type.toLowerCase()) {
      case 'holiday':
        return {
          label: 'Holiday',
          icon: Palmtree,
          dot: 'bg-emerald-500',
          bar: 'bg-emerald-500',
          cell: 'bg-emerald-500/[0.10] dark:bg-emerald-400/[0.12]',
          num: 'text-emerald-700 dark:text-emerald-300',
          text: 'text-emerald-700 dark:text-emerald-300',
        };
      case 'exam':
        return {
          label: 'Exam',
          icon: GraduationCap,
          dot: 'bg-rose-500',
          bar: 'bg-rose-500',
          cell: 'bg-rose-500/[0.10] dark:bg-rose-400/[0.12]',
          num: 'text-rose-700 dark:text-rose-300',
          text: 'text-rose-700 dark:text-rose-300',
        };
      case 'assignment':
      case 'homework':
      case 'deadline':
        return {
          label: 'Deadline',
          icon: AlertCircle,
          dot: 'bg-amber-500',
          bar: 'bg-amber-500',
          cell: '',
          num: '',
          text: 'text-amber-700 dark:text-amber-300',
        };
      default:
        return {
          label: 'Event',
          icon: CalendarDays,
          dot: 'bg-sky-500',
          bar: 'bg-sky-500',
          cell: '',
          num: '',
          text: 'text-sky-700 dark:text-sky-300',
        };
    }
  };

  const getRelativeDayTag = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    const target = new Date(`${dateStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays === -1) return 'Yesterday';
    return `${Math.abs(diffDays)} days ago`;
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
  const selectedItems = rawSelectedItems.filter(matchesFilter);

  return (
    <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full">
      
      {/* ── 1. Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-f4 mb-f5 sm:mb-f6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="page-title">
              Academic Calendar
            </h2>
            <p className="text-[14px] text-muted mt-1.5">
              Holidays, exams and events for your semester.
            </p>
          </div>

          <div className="page-actions">
            <button
              onClick={() => {
                if (!isSignedIn) { router.push('/sign-in'); return; }
                setShowAddEventModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Event
            </button>
            <button
              onClick={() => {
                if (!isSignedIn) { router.push('/sign-in'); return; }
                setShowImportCalendarModal(true);
              }}
              className="btn btn-secondary"
            >
              <Sparkles className="w-4 h-4" /> Import PDF
            </button>
            {dupCount > 0 && (
              <button
                onClick={() => cleanDuplicateEvents()}
                className="btn btn-secondary border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                title="Remove duplicate events" aria-label="Remove duplicate events"
              >
                Clean {dupCount}
              </button>
            )}
          </div>
        </div>

        {/* Coming up: answers "when is the next break / exam?" without scanning the grid */}
        <div className="grid grid-cols-2 border border-line-soft bg-surface divide-x divide-line-soft">
          {[
            { key: 'holiday', label: 'Holiday', item: nextHoliday, empty: 'None ahead' },
            { key: 'exam', label: 'Exam', item: nextExam, empty: 'None ahead' },
          ].map(({ key, label, item, empty }) => {
            const meta = getEventTypeMeta(key);
            return (
              <button
                key={key}
                type="button"
                disabled={!item}
                onClick={() => {
                  if (!item) return;
                  const d = new Date(`${item.dateStr}T00:00:00`);
                  setSelectedDate(item.dateStr);
                  setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                className="text-left p-3 sm:p-4 min-w-0 cursor-pointer disabled:cursor-default hover:bg-surface-2 transition-colors"
              >
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted whitespace-nowrap">
                  <span className={clsx('w-2 h-2 shrink-0', meta.dot)} />
                  {label}
                </span>
                <span className="block mt-1.5 text-[16px] sm:text-[18px] font-semibold text-fg leading-tight truncate">
                  {item ? getRelativeDayTag(item.dateStr) : empty}
                </span>
                {item && (
                  <span className="block mt-0.5 text-[12px] text-muted truncate capitalize">
                    {item.title.toLowerCase()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters double as the colour legend */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 w-max" role="tablist" aria-label="Filter calendar">
            {([
              { id: 'all', label: 'All', count: allItems.length, dot: '' },
              { id: 'holiday', label: 'Holidays', count: holidaysCount, dot: 'bg-emerald-500' },
              { id: 'exam', label: 'Exams', count: examsCount, dot: 'bg-rose-500' },
              { id: 'event', label: 'Events', count: campusEventsCount, dot: 'bg-sky-500' },
            ] as const).map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveFilter(f.id)}
                  className={clsx(
                    'h-9 px-3.5 flex items-center gap-2 border text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors',
                    active
                      ? 'bg-ink border-line-strong text-on-ink'
                      : 'bg-white dark:bg-transparent border-line text-fg hover:border-line-strong'
                  )}
                >
                  {f.dot && <span className={clsx('w-2 h-2', f.dot)} aria-hidden="true" />}
                  {f.label}
                  <span className={clsx('font-mono text-[12px]', active ? 'opacity-70' : 'text-muted')}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2. Month + agenda ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-f5 sm:gap-f6 items-start">

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="border border-line-soft bg-surface p-4 sm:p-6">

            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[19px] sm:text-[21px] font-semibold text-fg tracking-tight">
                {monthName}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={jumpToToday}
                  className="h-9 px-3 text-[13px] font-medium border border-line text-fg hover:bg-surface-2 transition-colors cursor-pointer mr-1"
                >
                  Today
                </button>
                <button
                  onClick={prevMonth}
                  className="w-9 h-9 flex items-center justify-center text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                  title="Previous month" aria-label="Previous month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="w-9 h-9 flex items-center justify-center text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                  title="Next month" aria-label="Next month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="py-1.5">
                  <span className={clsx(
                    'text-[12px] font-semibold',
                    i === 0 ? 'text-rose-600/80 dark:text-rose-300/80' : 'text-muted'
                  )}>
                    {d}
                  </span>
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell) => {
                const isSelected = selectedDate === cell.dateKey;
                const isToday = todayStr === cell.dateKey;
                const dayItems = itemsByDate.get(cell.dateKey) || [];
                const visibleItems = dayItems.filter(matchesFilter);
                const isSunday = cell.dateObj.getDay() === 0;
                // Whole-day colour for the days that change your routine: exams win over holidays
                const tintType = visibleItems.some(i => i.type === 'exam') ? 'exam'
                  : visibleItems.some(i => i.type === 'holiday') ? 'holiday' : null;
                const tint = tintType ? getEventTypeMeta(tintType) : null;
                const dotTypes = Array.from(new Set(visibleItems.map(i => (i.type === 'homework' ? 'assignment' : i.type))))
                  .filter(t => t !== tintType)
                  .slice(0, 3);
                const label = `${cell.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${visibleItems.length ? `, ${visibleItems.length} ${visibleItems.length === 1 ? 'item' : 'items'}` : ''}`;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    aria-label={label}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedDate(cell.dateKey);
                      if (!cell.isCurrentMonth) {
                        setCurrentMonth(new Date(cell.dateObj.getFullYear(), cell.dateObj.getMonth(), 1));
                      }
                    }}
                    className={clsx(
                      'relative h-12 sm:h-14 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors outline-offset-[-2px]',
                      cell.isCurrentMonth && tint ? tint.cell : 'hover:bg-surface-2',
                      isSelected && 'outline outline-2 outline-[#111111] dark:outline-[#F4F4F6]'
                    )}
                  >
                    <span className={clsx(
                      'w-8 h-8 flex items-center justify-center text-[15px] leading-none',
                      isToday && 'bg-ink text-on-ink font-semibold rounded-full',
                      !isToday && !cell.isCurrentMonth && 'text-[#C4C4C0] dark:text-white/20',
                      !isToday && cell.isCurrentMonth && tint && `font-semibold ${tint.num}`,
                      !isToday && cell.isCurrentMonth && !tint && (isSunday ? 'text-rose-600/80 dark:text-rose-300/80' : 'text-fg'),
                      isSelected && !isToday && 'font-semibold'
                    )}>
                      {cell.dayNum}
                    </span>
                    <span className="flex items-center gap-1 h-1.5" aria-hidden="true">
                      {cell.isCurrentMonth && dotTypes.map((t) => (
                        <span key={t} className={clsx('w-1.5 h-1.5 rounded-full', getEventTypeMeta(t).dot)} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Selected day */}
          <section aria-label="Selected day">
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="text-[17px] font-semibold text-fg tracking-tight">
                {selectedDateFormatted}
              </h4>
              <span className="text-[13px] text-muted">
                {getRelativeDayTag(selectedDate)}
              </span>
            </div>

            {selectedItems.length === 0 ? (
              <div className="border border-dashed border-black/[0.12] dark:border-white/[0.1] p-5 flex flex-col items-start gap-1">
                <p className="text-[14px] font-medium text-fg">Nothing scheduled</p>
                <p className="text-[13px] text-muted">No holidays, exams or events on this day.</p>
                {nextEventAfterSelected && (
                  <button
                    onClick={() => {
                      setSelectedDate(nextEventAfterSelected.dateStr);
                      const d = new Date(`${nextEventAfterSelected.dateStr}T00:00:00`);
                      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg underline underline-offset-4 decoration-black/20 dark:decoration-white/30 hover:decoration-current cursor-pointer max-w-full"
                  >
                    <span className="truncate">Next: {nextEventAfterSelected.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                )}
              </div>
            ) : (
              <ul className="flex flex-col border border-line-soft bg-surface divide-y divide-line-soft">
                {selectedItems.map((item, idx) => {
                  const meta = getEventTypeMeta(item.type);
                  return (
                    <li key={idx} className="relative flex items-start gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-[12px] font-semibold uppercase tracking-[1px]', meta.text)}>
                          {meta.label}{item.subject ? <span className="text-muted normal-case tracking-normal font-medium"> · {item.subject}</span> : null}
                        </p>
                        <h5 className="mt-1 text-[15px] font-semibold text-fg leading-snug">
                          {item.title}
                        </h5>
                        {(item.time || item.location) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                            {item.time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {item.time}
                              </span>
                            )}
                            {item.location && (
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{item.location}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {item.description && (
                          <p className="mt-2 text-[13px] text-muted whitespace-pre-wrap leading-relaxed">
                            {item.description}
                          </p>
                        )}
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
                        title={`Delete ${item.title}`} aria-label={`Delete ${item.title}`}
                        className="w-9 h-9 -mr-2 -mt-1.5 flex items-center justify-center text-muted hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Upcoming, grouped by month */}
          {filteredUpcoming.length > 0 && (
            <section aria-label="Upcoming">
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="text-[17px] font-semibold text-fg tracking-tight">Later in {upcomingMonthLabel}</h4>
                <span className="text-[13px] text-muted">{filteredUpcoming.length} {filteredUpcoming.length === 1 ? 'day' : 'days'}</span>
              </div>

              <div className="border border-line-soft bg-surface">
                {visibleUpcoming.map((item, idx) => {
                  const d = new Date(`${item.dateStr}T00:00:00`);
                  const meta = getEventTypeMeta(item.type);
                  const isSoon = item.dateStr <= weekAheadStr;

                  return (
                    <React.Fragment key={`${item.itemSource}_${item.id}_${idx}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                        }}
                        className={clsx(
                          'w-full flex items-center gap-3.5 px-4 py-3 text-left cursor-pointer hover:bg-surface-2 transition-colors',
                          idx > 0 && 'border-t border-line-soft',
                          selectedDate === item.dateStr && 'bg-surface-2'
                        )}
                      >
                        <span className="w-9 shrink-0 flex flex-col items-center leading-none">
                          <span className="text-[19px] font-semibold text-fg">{d.getDate()}</span>
                          <span className="mt-1 text-[11px] font-medium uppercase text-muted">
                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </span>
                        <span className={clsx('w-2 h-2 mt-1.5 rounded-full shrink-0 self-start', meta.bar)} aria-hidden="true" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-semibold text-fg truncate">{item.title}</span>
                          <span className="block mt-0.5 text-[12px] text-muted truncate">
                            {meta.label}{item.subject ? ` · ${item.subject}` : ''}{item.location ? ` · ${item.location}` : ''}
                          </span>
                        </span>
                        <span className={clsx(
                          'shrink-0 text-[12px] whitespace-nowrap',
                          isSoon ? 'font-semibold text-fg' : 'text-muted'
                        )}>
                          {getRelativeDayTag(item.dateStr)}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}

                {filteredUpcoming.length > UPCOMING_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAllUpcoming((v) => !v)}
                    className="w-full h-11 border-t border-line-soft text-[14px] font-semibold text-fg hover:bg-surface-2 cursor-pointer"
                  >
                    {showAllUpcoming ? 'Show less' : `Show all ${filteredUpcoming.length}`}
                  </button>
                )}
              </div>
            </section>
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
          <div className="bg-white dark:bg-[#13141A] w-full max-w-md rounded-[20px] border border-line-soft p-6 shadow-2xl relative flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-line-soft">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <h3 className="text-[16px] font-bold text-fg tracking-tight">
                  Add to Calendar
                </h3>
              </div>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1 rounded-none text-[#71717A] hover:text-fg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Category Picker */}
            <div>
              <label className="text-[12px] font-bold text-[#71717A] mb-1.5 block">
                Category
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-2 rounded-none border border-line-soft">
                {(['event', 'holiday', 'exam', 'assignment'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={clsx(
                      "py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all cursor-pointer",
                      newType === t
                        ? "bg-white dark:bg-[#1E2028] text-fg shadow-2xs font-bold"
                        : "text-[#71717A] hover:text-fg"
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
                <label className="text-[12px] font-bold text-[#71717A] mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-none px-3.5 py-2.5 text-[13px] text-fg focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Campus Placement Drive / Fest"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-[#71717A] mb-1 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-none px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#71717A] mb-1 block">
                    Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-surface-2 border border-line rounded-none px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#71717A] mb-1 block">
                  Location / Room (Optional)
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-none px-3.5 py-2 text-[13px] text-fg focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Auditorium / LT-1"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#71717A] mb-1 block">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-surface-2 border border-line rounded-none px-3.5 py-2 text-[12px] text-fg focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Event details or notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line-soft">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="px-4 h-9 rounded-none text-[13px] font-medium text-[#71717A] hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEvent}
                disabled={!newTitle.trim()}
                className="px-5 h-9 rounded-none bg-ink text-on-ink text-[13px] font-semibold disabled:opacity-50 transition-opacity cursor-pointer shadow-xs"
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