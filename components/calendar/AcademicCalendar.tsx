'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarImportModal } from './CalendarImportModal';
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useClerk, useUser } from '@clerk/nextjs';
import { getTodayDateString } from '@/lib/timetableUtils';

export const AcademicCalendar: React.FC = () => {
  const { homework, events, addEvent, subjects } = useApp();
  const { isSignedIn } = useUser();
  const clerk = useClerk();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showImportCalendarModal, setShowImportCalendarModal] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayDateString());
  const [newTime, setNewTime] = useState('10:00');
  
  const handleSaveEvent = () => {
    if (!newTitle.trim()) return;
    addEvent({
      title: newTitle,
      type: 'event',
      date: newDate,
      location: ''
    });
    setNewTitle('');
    setShowAddEventModal(false);
  };

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  const itemsByDate = new Map<string, { title: string; type: string; id: string; dateStr: string; subject?: string; location?: string; time?: string }[]>();
  const allItems: any[] = [];

  homework.forEach((hw) => {
    const dStr = hw.deadline.split('T')[0];
    const sub = subjectMap.get(hw.subjectId);
    const item = {
      id: hw.id,
      title: hw.title,
      type: 'assignment',
      dateStr: dStr,
      subject: sub?.shortName,
      location: '',
      time: '11:59 PM',
    };
    allItems.push(item);
    
    const existing = itemsByDate.get(dStr) || [];
    existing.push(item);
    itemsByDate.set(dStr, existing);
  });

  events.forEach((ev) => {
    const sub = ev.subjectId ? subjectMap.get(ev.subjectId) : undefined;
    const item = {
      id: ev.id,
      title: ev.title,
      type: ev.type,
      dateStr: ev.date,
      subject: sub?.shortName,
      location: ev.location,
      time: '10:00 AM', // Default fallback
    };
    allItems.push(item);

    const existing = itemsByDate.get(ev.date) || [];
    existing.push(item);
    itemsByDate.set(ev.date, existing);
  });

  const upcomingItems = allItems
    .filter(i => i.dateStr >= getTodayDateString())
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .slice(0, 3);

  const renderCalendarDays = () => {
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => <div key={`blank-${i}`} className="h-12 border-b border-r border-[#E5E5E5] dark:border-[#333333] bg-transparent" />);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const isSelected = selectedDate === dateKey;
      const isToday = getTodayDateString() === dateKey;
      const dayItems = itemsByDate.get(dateKey) || [];

      return (
        <div
          key={dateKey}
          onClick={() => setSelectedDate(dateKey)}
          className={clsx(
            'h-12 border-b border-r border-[#E5E5E5] dark:border-[#333333] flex flex-col items-center justify-center relative cursor-pointer hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors',
            isSelected && 'bg-black text-white dark:bg-white dark:text-black',
            !isSelected && isToday && 'text-black dark:text-white font-bold'
          )}
        >
          <span className={clsx('text-[13px] font-mono', isSelected ? '' : 'text-[#6F6F6F]')}>
            {dayNum}
          </span>
          {dayItems.length > 0 && (
            <span className={clsx("w-1 h-1 rounded-full absolute bottom-2", isSelected ? 'bg-white dark:bg-black' : 'bg-black dark:bg-white')} />
          )}
        </div>
      );
    });

    return [...blanks, ...days];
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full pb-12 pt-2 sm:pt-6">
      
      {/* Header */}
      <div>
        <h2 className="text-[40px] font-normal text-black dark:text-white tracking-tight leading-[44px]">
          Academic,<br />
          Calendar
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-[280px]">
          Your semester deadlines, exams and important campus events.
        </p>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => {
             if (!isSignedIn) { clerk.openSignIn(); return; }
             setShowAddEventModal(true)
          }}
          className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-black dark:text-white text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2"
        >
          <Plus className="w-4 h-4" /> Add event
        </button>
        <button
          onClick={() => {
             if (!isSignedIn) { clerk.openSignIn(); return; }
             setShowImportCalendarModal(true)
          }}
          className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-black dark:text-white text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
        >
          Import with AI
        </button>
      </div>

      <div className="mt-12">
        <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-4">
          NEXT UP
        </p>

        <div className="flex flex-col gap-4">
          {upcomingItems.length === 0 ? (
            <div className="p-6 border border-dashed border-[#D9D9D6] dark:border-[#333333] text-center">
              <p className="text-[13px] text-[#6F6F6F]">No upcoming events</p>
            </div>
          ) : (
            upcomingItems.map((item, idx) => {
              const dateObj = new Date(item.dateStr);
              const dayStr = String(dateObj.getDate()).padStart(2, '0');
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              
              return (
                <div key={idx} className="border border-[#D8D8D8] dark:border-[#333333] bg-white dark:bg-black p-5 rounded-none flex items-center justify-between group cursor-pointer hover:border-[#111111] dark:hover:border-[#FFFFFF] transition-colors">
                  <div>
                    <p className="text-[12px] font-mono text-[#A0A0A0] mb-2">{dayStr} {monthStr}</p>
                    <h4 className="text-[12px] font-bold tracking-[1px] uppercase text-black dark:text-white mb-1">
                      {item.type.replace('-', ' ')}
                    </h4>
                    <p className="text-[15px] font-medium text-black dark:text-white leading-snug">
                      {item.title} {item.subject && `• ${item.subject}`}
                    </p>
                    <p className="text-[13px] text-[#6F6F6F] mt-2">
                      {item.time} {item.location && `· ${item.location}`}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#D8D8D8] dark:text-[#333333] group-hover:text-black dark:group-hover:text-white transition-colors" />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[14px] font-bold tracking-[1px] text-black dark:text-white">
            {monthName}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <ChevronLeft className="w-5 h-5 text-black dark:text-white" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <ChevronRight className="w-5 h-5 text-black dark:text-white" />
            </button>
          </div>
        </div>

        <div className="border-t border-l border-[#E5E5E5] dark:border-[#333333]">
          <div className="grid grid-cols-7 border-b border-[#E5E5E5] dark:border-[#333333]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="py-2 text-center border-r border-[#E5E5E5] dark:border-[#333333]">
                <span className="text-[10px] font-bold text-[#6F6F6F]">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Selected Date Items */}
        <div className="mt-8">
           <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-4">
              {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
           </p>
           <div className="flex flex-col gap-3">
             {(itemsByDate.get(selectedDate) || []).length === 0 ? (
                <p className="text-[13px] text-[#6F6F6F]">No events scheduled for this day.</p>
             ) : (
                (itemsByDate.get(selectedDate) || []).map((item, idx) => (
                  <div key={idx} className="flex gap-4 border-b border-[#D8D8D8] dark:border-[#333333] pb-3 last:border-0">
                    <span className="text-[12px] font-mono text-[#A0A0A0] w-16 shrink-0">{item.time}</span>
                    <div>
                      <p className="text-[13px] font-medium text-black dark:text-white">
                        {item.title} {item.subject && `• ${item.subject}`}
                      </p>
                      <p className="text-[12px] text-[#6F6F6F] uppercase tracking-[1px] mt-0.5">{item.type.replace('-', ' ')}</p>
                    </div>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>

      <CalendarImportModal isOpen={showImportCalendarModal} onClose={() => setShowImportCalendarModal(false)} />
      
      {/* Quick Add Modal fallback for brutalist style */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-black/40 backdrop-blur-sm">
           <div className="bg-white dark:bg-black w-full max-w-sm border border-[#111111] dark:border-[#FFFFFF] p-6 shadow-2xl relative">
              <button onClick={() => setShowAddEventModal(false)} className="absolute top-4 right-4 text-[#6F6F6F] hover:text-black dark:hover:text-white">
                 ✕
              </button>
              <h3 className="text-[16px] font-bold text-black dark:text-white mb-6">NEW EVENT</h3>
              
              <div className="flex flex-col gap-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Title</label>
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-black dark:text-white focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" placeholder="Event name" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Date</label>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-black dark:text-white focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Time</label>
                      <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-black dark:text-white focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" />
                   </div>
                 </div>
                 <button onClick={handleSaveEvent} className="w-full h-10 bg-black text-white dark:bg-white dark:text-black text-[13px] font-bold mt-4">
                    Save Event
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
