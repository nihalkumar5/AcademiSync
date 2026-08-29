'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarImportModal } from './CalendarImportModal';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

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
    .slice(0, 2);

  const renderCalendarDays = () => {
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => <div key={`blank-${i}`} className="h-10" />);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const isSelected = selectedDate === dateKey;
      const isToday = getTodayDateString() === dateKey;
      const dayItems = itemsByDate.get(dateKey) || [];
      const hasEvents = dayItems.length > 0;

      return (
        <div
          key={dateKey}
          onClick={() => setSelectedDate(dateKey)}
          className="h-10 flex flex-col items-center justify-center relative cursor-pointer group"
        >
          <div className={clsx(
            "w-7 h-7 flex items-center justify-center text-[14px] transition-all",
            isSelected ? "border border-black dark:border-white rounded-full text-black dark:text-white font-medium" :
            isToday ? "ring-1 ring-[#D8D8D8] rounded-full text-black font-medium" : 
            "text-[#6F6F6F] group-hover:text-black"
          )}>
            {dayNum}
          </div>
          {hasEvents && (
            <span className="w-1 h-1 rounded-full bg-black dark:bg-white absolute bottom-0.5" />
          )}
        </div>
      );
    });

    return [...blanks, ...days];
  };

  const selectedDateObj = new Date(selectedDate);
  const selectedDateStr = `${selectedDateObj.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()} ${selectedDateObj.getDate()}`;

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full pb-12 pt-2 sm:pt-6">
      
      {/* Header */}
      <div>
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Academic,<br />
          Calendar
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-[280px]">
          Your semester at a glance.
        </p>
      </div>

      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => {
             if (!isSignedIn) { clerk.openSignIn(); return; }
             setShowAddEventModal(true)
          }}
          className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors gap-2"
        >
          <Plus className="w-4 h-4" /> Add event
        </button>
        <button
          onClick={() => {
             if (!isSignedIn) { clerk.openSignIn(); return; }
             setShowImportCalendarModal(true)
          }}
          className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
        >
          AI Import
        </button>
      </div>

      <div className="mt-12">
        <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-4">
          UPCOMING
        </p>
        <div className="w-full h-px bg-[#E5E5E5] dark:bg-[#333333] mb-4"></div>

        <div className="flex flex-col gap-6">
          {upcomingItems.length === 0 ? (
            <p className="text-[13px] text-[#6F6F6F]">No upcoming events</p>
          ) : (
            upcomingItems.map((item, idx) => {
              const dateObj = new Date(item.dateStr);
              const dayStr = String(dateObj.getDate()).padStart(2, '0');
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              
              return (
                <div key={idx} className="flex flex-col">
                  <p className="text-[12px] font-mono text-[#111111] dark:text-[#FFFFFF] mb-1">{dayStr} {monthStr}</p>
                  <p className="text-[14px] text-[#6F6F6F]">
                    {item.title} {item.subject && `· ${item.subject}`}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-16">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold tracking-[1px] text-[#111111] dark:text-[#FFFFFF]">
            {monthName}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors">
              <ChevronRight className="w-5 h-5 text-[#111111] dark:text-[#FFFFFF]" />
            </button>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center">
                <span className="text-[11px] font-medium text-[#A0A0A0]">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {renderCalendarDays()}
          </div>
        </div>

        {/* Selected Date Items */}
        <div className="mt-12 pt-8 border-t border-[#E5E5E5] dark:border-[#333333]">
           <p className="text-[13px] font-bold tracking-[1px] uppercase text-[#111111] dark:text-[#FFFFFF] mb-6">
              {selectedDateStr}
           </p>
           
           <div className="flex flex-col gap-6">
             {(itemsByDate.get(selectedDate) || []).length === 0 ? (
                <p className="text-[13px] text-[#6F6F6F]">No events scheduled.</p>
             ) : (
                (itemsByDate.get(selectedDate) || []).map((item, idx) => (
                  <div key={idx} className="flex gap-6 items-start">
                    <span className="text-[13px] font-mono text-[#A0A0A0] w-20 shrink-0">{item.time}</span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[14px] text-[#111111] dark:text-[#FFFFFF]">
                        {item.title} {item.subject && `• ${item.subject}`}
                      </p>
                      <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#6F6F6F]">
                        {item.type.replace('-', ' ')}
                      </p>
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
           <div className="bg-[#FFFFFF] dark:bg-[#111111] w-full max-w-sm border border-[#111111] dark:border-[#FFFFFF] p-6 shadow-2xl relative">
              <button onClick={() => setShowAddEventModal(false)} className="absolute top-4 right-4 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF]">
                 ✕
              </button>
              <h3 className="text-[16px] font-bold text-[#111111] dark:text-[#FFFFFF] mb-6">NEW EVENT</h3>
              
              <div className="flex flex-col gap-4">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Title</label>
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" placeholder="Event name" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Date</label>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Time</label>
                      <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-2 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" />
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
