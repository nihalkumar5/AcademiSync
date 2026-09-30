'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTomorrowDayOfWeek,
  getCurrentDayOfWeek,
  getTodayDateString,
  getTomorrowDateString,
  timeToMinutes,
} from '@/lib/timetableUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { CarryItemRow } from './CarryItemRow';
import { AddCustomItemModal } from './AddCustomItemModal';
import { SubjectDetailModal } from './SubjectDetailModal';
import { ClassSession } from '@/lib/types';
import { EmptyState } from '../ui/EmptyState';
import { Backpack, Plus, CalendarDays, Clock, ChevronRight } from 'lucide-react';
import { Subject } from '@/lib/types';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';

export const TomorrowCarryView: React.FC = () => {
  const {
    timetable,
    subjects,
    events,
    carryItems,
    toggleCarryItemPacked,
    deleteCarryItem,
    settings,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [preselectedSubjectId, setPreselectedSubjectId] = useState<string>('');
  const [detailSession, setDetailSession] = useState<ClassSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  let limitMinutes = 18 * 60;
  if (settings?.eveningCarryReminderTime) {
    const parts = settings.eveningCarryReminderTime.trim().split(' ');
    const timeParts = parts[0].split(':');
    let h = parseInt(timeParts[0], 10);
    const m = parseInt(timeParts[1] || '0', 10);
    if (parts[1]) {
      const modifier = parts[1].toUpperCase();
      if (modifier === 'PM' && h < 12) h += 12;
      if (modifier === 'AM' && h === 12) h = 0;
    }
    if (!isNaN(h) && !isNaN(m)) {
      limitMinutes = h * 60 + m;
    }
  }

  const isAfterReminderTime = currentMinutes >= limitMinutes;
  const targetDay = isAfterReminderTime ? getTomorrowDayOfWeek() : getCurrentDayOfWeek();
  const targetDateStr = isAfterReminderTime ? getTomorrowDateString() : getTodayDateString();
  const targetHoliday = events.find((e) => e.date === targetDateStr && e.type === 'holiday');
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const rawTargetClasses = timetable
    .filter((s) => s.day === targetDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const targetClasses = targetHoliday ? [] : rawTargetClasses;

  const visibleCarryItems = carryItems.filter(i => !i.isHidden);
  const packedCount = visibleCarryItems.filter((i) => i.isPacked).length;
  const totalCount = visibleCarryItems.length;

  const targetDateObj = new Date(targetDateStr + 'T12:00:00');
  const targetFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(isNaN(targetDateObj.getTime()) ? (isAfterReminderTime ? new Date(Date.now() + 86400000) : new Date()) : targetDateObj);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl mx-auto w-full pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-2 sm:pt-6">
        <div>
          <h2 className="text-[36px] sm:text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[40px] sm:leading-[44px]">
            Bag,<br />Carry,<br />Pack
          </h2>
          <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-[6px] border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-black dark:text-white uppercase tracking-wider">
              {targetDay}
            </span>
            {targetHoliday ? (
              <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-[6px] border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Holiday: {targetHoliday.title}
              </span>
            ) : (
              <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-[6px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {packedCount}/{totalCount} PACKED
              </span>
            )}
          </div>
          <p className="text-[13.5px] font-normal text-[#6B6B6B] dark:text-[#94A3B8] leading-[20px] mt-3 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
            <span>Packing list for {isAfterReminderTime ? 'tomorrow' : 'today'} · {targetFormatted}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Things to Carry List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {totalCount === 0 && !targetHoliday ? (
            <div className="border border-black/[0.06] dark:border-white/[0.08] bg-[#FFFFFF] dark:bg-[#121317] p-6 flex flex-col items-start rounded-[16px] shadow-xs dark:shadow-md">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.4px] font-bold text-[#111111] dark:text-[#F4F4F6]">
                <Backpack className="w-[18px] h-[18px] stroke-[1.8] text-[#18A889]" />
                <span>Things to Carry</span>
              </div>
              <div className="flex flex-col mt-4 mb-5 gap-1">
                <span className="text-[15px] font-semibold text-[#111111] dark:text-[#FFFFFF]">Nothing packed yet.</span>
                <span className="text-[13.5px] text-[#6F6F6F] dark:text-[#94A3B8]">Add what you need for {isAfterReminderTime ? 'tomorrow' : 'today'}.</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-[42px] px-5 bg-[#111111] dark:bg-white text-[#FFFFFF] dark:text-[#090A0C] flex items-center justify-center gap-2 font-semibold text-[13px] hover:opacity-90 transition-opacity rounded-[10px] cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </div>
          ) : (
            <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-[16px] flex flex-col p-5 sm:p-6 bg-[#FFFFFF] dark:bg-[#121317] shadow-xs dark:shadow-md">
              <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06] dark:border-white/[0.08] mb-4">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.4px] font-bold text-[#111111] dark:text-[#F4F4F6]">
                  <Backpack className="w-[18px] h-[18px] stroke-[1.8] text-[#18A889]" />
                  <span>Things to Carry</span>
                </div>
                <div className="text-[11.5px] font-bold font-mono tracking-wider text-[#111111] dark:text-[#F4F4F6] bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full">
                  {packedCount} / {totalCount}
                </div>
              </div>

              {/* Progress bar */}
              {totalCount > 0 && (
                <div className="mb-4">
                  <div className="w-full h-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#18A889] transition-all duration-300 rounded-full"
                      style={{ width: `${(packedCount / totalCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-[#71717A] mt-1.5 flex justify-between">
                    <span>{packedCount === totalCount ? 'All items packed! 🎒' : `${totalCount - packedCount} items remaining`}</span>
                    <span>{Math.round((packedCount / totalCount) * 100)}%</span>
                  </div>
                </div>
              )}

              {visibleCarryItems.length === 0 && targetHoliday ? (
                <EmptyState
                  icon={<MonochromeIllustration type="holiday" size={48} />}
                  title="NO PACKING NEEDED — HOLIDAY!"
                  description={`${targetFormatted} is an official campus holiday (${targetHoliday.title}). Enjoy your break!`}
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {visibleCarryItems.map((item) => (
                    <CarryItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleCarryItemPacked}
                      onDelete={deleteCarryItem}
                    />
                  ))}
                </div>
              )}

              {visibleCarryItems.length > 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-[12px] border border-dashed border-black/15 dark:border-white/15 text-[13px] font-semibold text-[#52525B] dark:text-[#A1A1AA] hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all cursor-pointer mt-4"
                >
                  <Plus className="w-4 h-4 stroke-[2]" />
                  <span>Add another item</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Schedule Preview with Color Cards */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 mt-2 lg:mt-0">
          <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.4px] font-bold text-[#111111] dark:text-[#F4F4F6]">
              <Clock className="w-4 h-4 stroke-[1.8] text-[#18A889]" />
              <span>{isAfterReminderTime ? "Tomorrow's Schedule" : "Today's Schedule"}</span>
            </div>
            <div className="text-[11px] font-bold font-mono tracking-wider text-[#111111] dark:text-[#F4F4F6] bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-0.5 rounded-full">
              {targetHoliday ? '0' : targetClasses.length} {targetClasses.length === 1 ? 'CLASS' : 'CLASSES'}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {targetHoliday ? (
              <div className="py-8 text-center text-[#6F6F6F] dark:text-[#94A3B8] text-[14px] bg-black/[0.02] dark:bg-white/[0.02] rounded-[14px] border border-black/[0.06] dark:border-white/[0.06] p-6">
                No classes today. Enjoy your holiday!
              </div>
            ) : targetClasses.length === 0 ? (
              <div className="py-8 text-center text-[#6F6F6F] dark:text-[#94A3B8] text-[14px] bg-black/[0.02] dark:bg-white/[0.02] rounded-[14px] border border-black/[0.06] dark:border-white/[0.06] p-6">
                No classes scheduled for {isAfterReminderTime ? 'tomorrow' : 'today'}.
              </div>
            ) : (
              targetClasses.map((sess) => {
                const subject = subjectMap.get(sess.subjectId);
                const reqs = subject?.carryRequirements || [];
                const isLab = sess.isLab || subject?.isLab;
                const isSpecial = sess.isExtra || subject?.name?.toLowerCase().includes('elective') || sess.notes?.toLowerCase().includes('elective');

                const theme = getSubjectCardTheme({
                  subjectName: subject?.name,
                  subjectCode: subject?.code,
                  subjectColor: subject?.color,
                  isLab,
                  isSpecial,
                });

                return (
                  <button
                    key={sess.id}
                    onClick={() => setDetailSession(sess)}
                    className="relative w-full rounded-[14px] p-4 sm:p-[18px] border transition-all text-left group overflow-hidden shadow-xs hover:shadow-md cursor-pointer border-black/[0.06] dark:border-[color:var(--card-accent-border)] hover:scale-[1.008] duration-200"
                    style={{
                      ['--card-accent-border' as any]: `${theme.accent}45`,
                    }}
                  >
                    {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                    <div 
                      className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[13px]"
                      style={{ backgroundColor: theme.bg }}
                    />
                    <div 
                      className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[13px]"
                      style={{ 
                        background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                      }}
                    />

                    <div className="relative z-10 flex flex-col gap-2.5">
                      {/* Top Row: Subject Name + Lab Badge + Chevron */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h4 className="text-[16px] sm:text-[17px] font-bold text-[#151515] dark:text-[#FFFFFF] leading-snug tracking-tight truncate">
                            {subject?.name || 'Class Session'}
                          </h4>
                          {isLab && (
                            <span 
                              className="text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded-[3px] uppercase font-mono shrink-0"
                              style={{
                                color: theme.badgeText,
                                backgroundColor: theme.badgeBg,
                              }}
                            >
                              LAB
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-[#808080] dark:text-[#A1A1AA] group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {/* Carry Requirements Highlight Badge */}
                      {reqs.length > 0 ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white/80 dark:bg-white/[0.08] border border-black/5 dark:border-white/10 backdrop-blur-xs text-[12.5px] font-semibold text-[#18181B] dark:text-[#F4F4F6]">
                          <Backpack className="w-3.5 h-3.5 text-[#18A889] shrink-0 stroke-[2.2]" />
                          <span className="truncate">Bring: {reqs.join(', ')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                          <span>No specific items required</span>
                          <span className="text-[11px] opacity-60">· Tap to add</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>

      <SubjectDetailModal
        isOpen={!!detailSession}
        onClose={() => setDetailSession(null)}
        session={detailSession}
        onOpenAdd={() => {
          if (detailSession) setPreselectedSubjectId(detailSession.subjectId);
          setShowAddModal(true);
        }}
      />

      <AddCustomItemModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setPreselectedSubjectId('');
        }}
        preselectedSubjectId={preselectedSubjectId}
      />
    </div>
  );
};
