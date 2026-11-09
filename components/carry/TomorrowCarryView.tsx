'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTomorrowDayOfWeek,
  getCurrentDayOfWeek,
  getTodayDateString,
  getTomorrowDateString,
  timeToMinutes,
  isGenericExamTitle,
} from '@/lib/timetableUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { CarryItemRow } from './CarryItemRow';
import { AddCustomItemModal } from './AddCustomItemModal';
import { SubjectDetailModal } from './SubjectDetailModal';
import { ClassSession } from '@/lib/types';
import { EmptyState } from '../ui/EmptyState';
import { Backpack, Plus, CalendarDays, Clock, ChevronRight, PartyPopper } from '@/components/ui/icons';
import { Subject } from '@/lib/types';
import { surelyMine } from '@/lib/electives';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';

export const TomorrowCarryView: React.FC = () => {
  const {
    myTimetable,
    subjects,
    events,
    exams,
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
  const targetExam = exams.find((e) => e.date && e.date.split('T')[0] === targetDateStr && !isGenericExamTitle(e.subjectName)) ||
    events.find((e) => e.date === targetDateStr && e.type === 'exam' && !isGenericExamTitle(e.title));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const rawTargetClasses = surelyMine(myTimetable)
    .filter((s) => s.day === targetDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const targetClasses = (targetHoliday || targetExam) ? [] : rawTargetClasses;

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
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-5xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-2 sm:pt-6">
        <div>
          <h2 className="page-title">
            Bag,<br />Carry,<br />Pack
          </h2>
          <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            <span className="px-2.5 py-1 text-[12px] font-semibold bg-ink text-on-ink">
              {targetDay}
            </span>
            {targetHoliday ? (
              <span className="px-2.5 py-1 text-[12px] font-medium bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Holiday · {targetHoliday.title}
              </span>
            ) : targetExam ? (
              <span className="px-2.5 py-1 text-[12px] font-medium bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                Exam day
              </span>
            ) : (
              <span className="px-2.5 py-1 text-[12px] font-medium tabular-nums border border-line text-fg">
                {packedCount}/{totalCount} packed
              </span>
            )}
          </div>
          <p className="text-[14px] font-normal text-muted leading-[20px] mt-3 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0 text-muted" />
            <span>Packing list for {isAfterReminderTime ? 'tomorrow' : 'today'} · {targetFormatted}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Things to Carry List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {totalCount === 0 && !targetHoliday ? (
            <div className="border border-line bg-surface p-6 flex flex-col items-start">
              <div className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-fg">
                <Backpack className="w-5 h-5 stroke-[1.8]" />
                <span>Things to carry</span>
              </div>
              <div className="flex flex-col mt-4 mb-5 gap-1">
                <span className="text-[15px] font-semibold text-fg">Nothing packed yet.</span>
                <span className="text-[14px] text-muted">Add what you need for {isAfterReminderTime ? 'tomorrow' : 'today'}.</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-[42px] px-5 bg-ink text-on-ink flex items-center justify-center gap-2 font-semibold text-[13px] hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </div>
          ) : (
            <div className="border border-line flex flex-col p-5 sm:p-6 bg-surface">
              <div className="flex items-center justify-between pb-3.5 border-b border-line-soft mb-4">
                <div className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-fg">
                  <Backpack className="w-5 h-5 stroke-[1.8]" />
                  <span>Things to carry</span>
                </div>
                <div className="text-[13px] tabular-nums text-muted">
                  {packedCount} of {totalCount}
                </div>
              </div>

              {/* Progress bar */}
              {totalCount > 0 && (
                <div className="mb-4">
                  <div className="w-full h-1.5 bg-surface-3 overflow-hidden">
                    <div 
                      className="h-full bg-[#18A889] transition-all duration-300"
                      style={{ width: `${(packedCount / totalCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-[12px] text-muted mt-1.5 flex justify-between tabular-nums">
                    {packedCount === totalCount ? (
                      <span className="font-cursive text-[20px] leading-none font-semibold text-[#18A889] -rotate-1">All packed. You&apos;re good to go!</span>
                    ) : (
                      <span>{totalCount - packedCount} items remaining</span>
                    )}
                    <span>{Math.round((packedCount / totalCount) * 100)}%</span>
                  </div>
                </div>
              )}

              {visibleCarryItems.length === 0 && targetHoliday ? (
                <EmptyState
                  illustration="holiday"
                  title="No packing needed"
                  description={`${targetFormatted} is a campus holiday for ${targetHoliday.title}. Enjoy the break.`}
                  className="my-0"
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
                  className="flex items-center justify-center gap-2 h-11 px-4 border border-dashed border-line text-[14px] font-semibold text-[#52525B] dark:text-[#A1A1AA] hover:text-fg hover:border-black/30 dark:hover:border-white/30 hover:bg-surface-2 transition-all cursor-pointer mt-4"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-fg">
              <Clock className="w-5 h-5 stroke-[1.8]" />
              <span>{isAfterReminderTime ? "Tomorrow's schedule" : "Today's schedule"}</span>
            </div>
            <div className="text-[13px] tabular-nums text-muted">
              {(() => { const n = targetHoliday || targetExam ? 0 : targetClasses.length; return `${n} ${n === 1 ? 'class' : 'classes'}`; })()}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {targetHoliday ? (
              <div className="p-4 border border-dashed border-line text-[14px] text-muted">
                No classes {isAfterReminderTime ? 'tomorrow' : 'today'}. Campus is closed for <span className="font-medium text-fg">{targetHoliday.title}</span>.
              </div>
            ) : targetExam ? (
              <div className="p-5 text-left bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-mono text-[12px] font-bold text-amber-700 dark:text-amber-400">
                    Examination Day
                  </span>
                </div>
                <h4 className="text-[17px] font-bold text-fg">
                  {(targetExam as any).subjectName || (targetExam as any).title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted">
                  <span>{(targetExam as any).time || '09:30 AM'}</span>
                  {(targetExam as any).room && <span>· Room {(targetExam as any).room}</span>}
                </div>
                <p className="text-[12px] text-[#666666] dark:text-[#A1A1AA] pt-1 border-t border-amber-500/15">
                  Pack your Admit Card, College ID, stationery pouch &amp; calculator.
                </p>
              </div>
            ) : targetClasses.length === 0 ? (
              <div className="p-4 border border-dashed border-line text-[14px] text-muted">
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
                    className="relative w-full p-4 sm:p-[18px] border transition-all text-left group overflow-hidden shadow-xs hover:shadow-md cursor-pointer border-black/[0.06] dark:border-[color:var(--card-accent-border)] hover:scale-[1.008] duration-200"
                    style={{
                      ['--card-accent-border' as any]: `${theme.accent}45`,
                    }}
                  >
                    {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                    <div 
                      className="dark:hidden absolute inset-0 z-0 pointer-events-none"
                      style={{ backgroundColor: theme.bg }}
                    />
                    <div 
                      className="hidden dark:block absolute inset-0 z-0 pointer-events-none"
                      style={{ 
                        background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
                      }}
                    />

                    <div className="relative z-10 flex flex-col gap-2.5">
                      {/* Top Row: Subject Name + Lab Badge + Chevron */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h4 className="text-[16px] sm:text-[17px] font-bold text-fg leading-snug tracking-tight truncate">
                            {subject?.name || 'Class Session'}
                          </h4>
                          {isLab && (
                            <span 
                              className="text-[12px] font-bold px-2 py-0.5 font-mono shrink-0"
                              style={{
                                color: theme.accent,
                                border: `1px solid ${theme.accent}55`,
                              }}
                            >
                              LAB
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-fg group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {/* Carry Requirements Highlight Badge */}
                      {reqs.length > 0 ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-white/[0.08] border border-black/5 dark:border-white/10 backdrop-blur-xs text-[13px] font-semibold text-fg">
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
