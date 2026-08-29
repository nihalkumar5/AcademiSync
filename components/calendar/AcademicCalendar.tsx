'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarImportModal } from './CalendarImportModal';
import { ChevronLeft, ChevronRight, Plus, ArrowRight } from 'lucide-react';
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
      const hasImportantEvent = dayItems.some(i => i.type === 'assignment' || i.type === 'exam' || i.type === 'deadline');

      return (
        <div
          key={dateKey}
          onClick={() => setSelectedDate(dateKey)}
          className="h-12 flex flex-col items-center justify-center relative cursor-pointer group"
        >
          <div className={clsx(
            "w-8 h-8 flex items-center justify-center text-[15px] transition-all rounded-full",
            isSelected ? "bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] font-bold" :
            isToday ? "border border-[#111111] dark:border-[#FFFFFF] text-[#111111] dark:text-[#FFFFFF] font-semibold" : 
            "text-[#6F6F6F] group-hover:text-[#111111] dark:group-hover:text-[#FFFFFF] font-medium"
          )}>
            {dayNum}
          </div>
          {hasEvents && (
            <span className={clsx("w-[5px] h-[5px] rounded-full absolute bottom-0.5", hasImportantEvent ? "bg-[#E55B4B]" : "bg-[#111111] dark:bg-[#FFFFFF]")} />
          )}
        </div>
      );
    });

    return [...blanks, ...days];
  };

  const selectedDateObj = new Date(selectedDate);
  const selectedDateStr = `${selectedDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${selectedDateObj.getDate()}`;
  const selectedItems = itemsByDate.get(selectedDate) || [];

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full pb-16 pt-2 sm:pt-6">
      
      {/* Hero Header */}
      <div className="mb-12">
        <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
          Academic,<br />
          Calendar,<br />
          Semester,<br />
          Events
        </h2>
        <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 max-w-[280px]">
          Your semester deadlines, exams and important campus events.
        </p>
        <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => {
             if (!isSignedIn) { clerk.openSignIn(); return; }
             setShowImportCalendarModal(true)
          }}
          className="flex items-center justify-center h-10 px-4 border border-[#D9D9D6] dark:border-[#333333] text-[#111111] dark:text-[#FFFFFF] text-[13px] font-semibold hover:bg-[#F7F7F5] dark:hover:bg-[#1A1A1A] transition-colors"
        >
          AI Import
        </button>
        <button
          onClick={() => {
             if (!isSignedIn) { clerk.openSignIn(); return; }
             setShowAddEventModal(true)
          }}
          className="flex items-center justify-center h-10 px-4 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] text-[13px] font-semibold transition-colors gap-2"
        >
          <Plus className="w-4 h-4" /> Add event
        </button>
      </div>
      </div>

      {/* YOUR SEMESTER (UP NEXT) */}
      <div className="mb-12">
        <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#6F6F6F] mb-6">
          YOUR SEMESTER
        </p>

        {upcomingItems.length > 0 ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
               <p className="text-[11px] font-bold tracking-[1px] uppercase text-[#E55B4B] mb-2">
                 {(() => {
                   const d = new Date(upcomingItems[0].dateStr);
                   return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`;
                 })()}
               </p>
               <h2 className="text-[28px] font-normal text-[#111111] dark:text-[#FFFFFF] leading-tight tracking-tight">
                 {upcomingItems[0].title}
               </h2>
               {upcomingItems[0].subject && (
                 <p className="text-[14px] text-[#6F6F6F] mt-1">
                   {upcomingItems[0].subject}
                 </p>
               )}
            </div>
            
            {upcomingItems.length > 1 && (
              <div className="flex items-center justify-between border-t border-[#E5E5E5] dark:border-[#333333] pt-5 mt-1 cursor-pointer group">
                <div className="flex flex-col">
                   <p className="text-[11px] font-bold tracking-[1px] uppercase text-[#111111] dark:text-[#FFFFFF] mb-1">
                     {(() => {
                       const d = new Date(upcomingItems[1].dateStr);
                       return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`;
                     })()}
                   </p>
                   <p className="text-[14px] text-[#6F6F6F] group-hover:text-[#111111] dark:group-hover:text-[#FFFFFF] transition-colors">
                     {upcomingItems[1].title} {upcomingItems[1].subject && `· ${upcomingItems[1].subject}`}
                   </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#A0A0A0] group-hover:text-[#111111] dark:group-hover:text-[#FFFFFF] transition-colors" />
              </div>
            )}
          </div>
        ) : (
          <h2 className="text-[28px] font-normal text-[#111111] dark:text-[#FFFFFF] leading-tight tracking-tight">
            You're all caught up.
          </h2>
        )}
      </div>

      <div className="w-full h-px bg-[#E5E5E5] dark:bg-[#333333] mb-10"></div>

      {/* CALENDAR */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[14px] font-bold tracking-[1.5px] uppercase text-[#111111] dark:text-[#FFFFFF]">
            {monthName}
          </h3>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center">
                <span className="text-[11px] font-bold text-[#A0A0A0]">{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-3">
            {renderCalendarDays()}
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-[#E5E5E5] dark:bg-[#333333] mt-10 mb-8"></div>

      {/* DETAILS PANEL */}
      <div>
         <p className="text-[12px] font-bold tracking-[1px] uppercase text-[#6F6F6F] mb-6">
            {selectedDateStr}
         </p>
         
         <div className="flex flex-col gap-6">
           {selectedItems.length === 0 ? (
              <div className="flex flex-col">
                 <p className="text-[18px] text-[#111111] dark:text-[#FFFFFF] font-medium leading-snug">
                   You're all clear.
                 </p>
                 <p className="text-[14px] text-[#6F6F6F] mt-1 mb-4">
                   No classes, deadlines or events today.
                 </p>
                 <a href="/" className="text-[12px] font-bold text-[#111111] dark:text-[#FFFFFF] hover:text-[#E55B4B] transition-colors uppercase tracking-[1px] inline-flex items-center gap-1">
                   View timetable <span>→</span>
                 </a>
              </div>
           ) : (
              <>
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <p className="text-[18px] text-[#111111] dark:text-[#FFFFFF] font-medium leading-tight">
                      {item.title} {item.subject && `• ${item.subject}`}
                    </p>
                    <p className="text-[11px] font-bold tracking-[1.5px] uppercase text-[#6F6F6F]">
                      {item.type.replace('-', ' ')}
                    </p>
                  </div>
                ))}
                <div className="mt-2">
                  <p className="text-[13px] text-[#6F6F6F]">No classes scheduled.</p>
                </div>
              </>
           )}
         </div>
      </div>

      <CalendarImportModal isOpen={showImportCalendarModal} onClose={() => setShowImportCalendarModal(false)} />
      
      {/* Quick Add Modal */}
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
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-3 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" placeholder="Event name" />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Date</label>
                      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-3 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold uppercase tracking-[1px] text-[#6F6F6F] mb-1.5 block">Time</label>
                      <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-[#F7F7F5] dark:bg-[#1A1A1A] border border-[#D8D8D8] dark:border-[#333333] px-3 py-3 text-[13px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF]" />
                   </div>
                 </div>
                 <button onClick={handleSaveEvent} className="w-full h-12 bg-black text-white dark:bg-white dark:text-black text-[12px] font-bold tracking-[1px] uppercase mt-4">
                    Save Event
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
