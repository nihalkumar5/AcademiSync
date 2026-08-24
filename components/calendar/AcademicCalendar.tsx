'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { CalendarImportModal } from './CalendarImportModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Flag,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

export const AcademicCalendar: React.FC = () => {
  const { homework, events, addEvent, subjects } = useApp();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showImportCalendarModal, setShowImportCalendarModal] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'exam' | 'holiday' | 'event' | 'assignment'>('exam');
  const [newLocation, setNewLocation] = useState('');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Days in month calculation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Map homework and events by date string (YYYY-MM-DD)
  const itemsByDate = new Map<string, { title: string; type: string; id: string }[]>();

  // Add homework deadlines
  homework.forEach((hw) => {
    const dStr = hw.deadline.split('T')[0];
    const existing = itemsByDate.get(dStr) || [];
    const sub = subjectMap.get(hw.subjectId);
    existing.push({
      id: hw.id,
      title: `${sub ? sub.shortName + ': ' : ''}${hw.title}`,
      type: 'homework',
    });
    itemsByDate.set(dStr, existing);
  });

  // Add events
  events.forEach((ev) => {
    const existing = itemsByDate.get(ev.date) || [];
    existing.push({
      id: ev.id,
      title: ev.title,
      type: ev.type,
    });
    itemsByDate.set(ev.date, existing);
  });

  const selectedDateItems = itemsByDate.get(selectedDate) || [];

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addEvent({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      date: selectedDate,
      type: newType,
      location: newLocation.trim() || undefined,
    });

    setNewTitle('');
    setNewDesc('');
    setNewLocation('');
    setShowAddEventModal(false);
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Academic Calendar
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Unified view of homework deadlines, mid-term examinations, and institute holidays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setShowImportCalendarModal(true)}
            className="gap-1.5 rounded-none border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Import Calendar</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={() => setShowAddEventModal(true)}
            className="gap-1.5 rounded-none bg-black text-white dark:bg-white dark:text-black border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols on desktop) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
          {/* Month Header & Controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {monthName}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-400 font-mono">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank_${i}`} className="h-16 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/20" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDate === dateKey;
              const isToday = new Date().toISOString().split('T')[0] === dateKey;
              const dayItems = itemsByDate.get(dateKey) || [];

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={clsx(
                    'h-16 p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left relative',
                    isSelected
                      ? 'bg-[#8C6B5D]/5 dark:bg-[#8C6B5D]/15 border-[#8C6B5D] ring-1 ring-[#8C6B5D]/20'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        'text-xs font-mono font-semibold',
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#8C6B5D] text-white flex items-center justify-center text-[10px]'
                          : isSelected
                          ? 'text-[#8C6B5D] dark:text-[#CBB5A1]'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {dayNum}
                    </span>

                    {dayItems.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    )}
                  </div>

                  {/* Tiny Item Tags */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayItems.slice(0, 1).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] truncate font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1 py-0.2 rounded"
                      >
                        {item.title}
                      </span>
                    ))}
                    {dayItems.length > 1 && (
                      <span className="text-[8.5px] text-zinc-400 font-mono">
                        +{dayItems.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details Column */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm text-left">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <p className="text-[11px] text-zinc-400">Scheduled Items & Deadlines</p>
            </div>
            <Badge variant="neutral" size="sm">
              {selectedDateItems.length} items
            </Badge>
          </div>

          <div className="flex flex-col gap-2 min-h-[220px]">
            {selectedDateItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 text-xs">
                <CalendarIcon className="w-6 h-6 mb-2 text-zinc-300 dark:text-zinc-700" />
                <span>No deadlines or events on this date.</span>
              </div>
            ) : (
              selectedDateItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex flex-col gap-1 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </span>
                    <Badge
                      variant={
                        item.type === 'exam'
                          ? 'rose'
                          : item.type === 'homework'
                          ? 'blue'
                          : item.type === 'holiday'
                          ? 'emerald'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {item.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        title="Add Academic Event / Reminder"
        description="Schedule exam dates, presentations, club meetings, or holidays."
      >
        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 text-left">
          <Input
            label="Event Title"
            placeholder="e.g. Mid-Sem Examination: Machine Learning"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />

            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Category
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full mt-1.5 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#8C6B5D]/30 focus:border-[#8C6B5D]"
              >
                <option value="exam">Examination</option>
                <option value="assignment">Major Assignment / Review</option>
                <option value="holiday">Institute Holiday</option>
                <option value="event">Symposium / Hackathon</option>
              </select>
            </div>
          </div>

          <Input
            label="Location / Hall (Optional)"
            placeholder="e.g. LT-1, Auditorium, CC Lab"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddEventModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Calendar Import Modal */}
      <CalendarImportModal
        isOpen={showImportCalendarModal}
        onClose={() => setShowImportCalendarModal(false)}
      />
    </div>
  );
};
