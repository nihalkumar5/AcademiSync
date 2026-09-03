'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  getTomorrowDayOfWeek,
  getCurrentDayOfWeek,
  getTodayDateString,
  getTomorrowDateString,
  timeToMinutes,
  getSubjectThemeStyle,
} from '@/lib/timetableUtils';
import { CarryItemRow } from './CarryItemRow';
import { AddCustomItemModal } from './AddCustomItemModal';
import { SubjectDetailModal } from './SubjectDetailModal';
import { ClassSession } from '@/lib/types';
import { EmptyState } from '../ui/EmptyState';
import { Backpack, Plus, CalendarDays, Clock, ChevronRight, MapPin } from 'lucide-react';
import { Subject } from '@/lib/types';
import { MonochromeIllustration } from '../ui/MonochromeIllustration';

// Signature pastel paper palette
const ELEGANT_PASTEL_PALETTE = [
  'bg-[#FEF9C3]/80 dark:bg-[#78350F]/25 border-[#FDE047]/60 dark:border-[#FACC15]/30', 
  'bg-[#E0F2FE]/80 dark:bg-[#0C4A6E]/25 border-[#7DD3FC]/60 dark:border-[#38BDF8]/30', 
  'bg-[#FCE7F3]/80 dark:bg-[#831843]/25 border-[#F9A8D4]/60 dark:border-[#F472B6]/30', 
  'bg-[#DCFCE7]/80 dark:bg-[#064E3B]/25 border-[#86EFAC]/60 dark:border-[#4ADE80]/30', 
  'bg-[#FFEDD5]/80 dark:bg-[#7C2D12]/25 border-[#FDBA74]/60 dark:border-[#FB923C]/30', 
  'bg-[#F3E8FF]/80 dark:bg-[#3B0764]/25 border-[#D8B4FE]/60 dark:border-[#C084FC]/30', 
  'bg-[#CCFBF1]/80 dark:bg-[#134E4A]/25 border-[#5EEAD4]/60 dark:border-[#2DD4BF]/30', 
  'bg-[#FFE4E6]/80 dark:bg-[#881337]/25 border-[#FDA4AF]/60 dark:border-[#FB7185]/30', 
  'bg-[#FEF3C7]/80 dark:bg-[#78350F]/25 border-[#FCD34D]/60 dark:border-[#F59E0B]/30', 
  'bg-[#ECFCCB]/80 dark:bg-[#365314]/25 border-[#BEF264]/60 dark:border-[#A3E635]/30', 
];

const getSubjectPastelStyle = (sub?: Subject, fallbackId: string = '') => {
  const key = sub?.name || sub?.id || fallbackId;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % ELEGANT_PASTEL_PALETTE.length;
  }
  return ELEGANT_PASTEL_PALETTE[Math.abs(hash)];
};

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
    <div className="flex flex-col gap-8 text-left max-w-5xl mx-auto w-full pb-16 font-sans">
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div>
          <h2 className="text-[40px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[44px]">
            Bag,<br />Carry,<br />Pack
          </h2>
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-black dark:text-white uppercase tracking-wider">
              {targetDay}
            </span>
            {targetHoliday ? (
              <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-black dark:text-white uppercase tracking-wider">
                Holiday: {targetHoliday.title}
              </span>
            ) : (
              <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-none border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-black dark:text-white uppercase tracking-wider">
                {packedCount}/{totalCount} packed
              </span>
            )}
          </div>
          <p className="text-[14px] font-normal text-[#6B6B6B] leading-[20px] mt-4 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0 text-black/60 dark:text-white/60" />
            <span>Packing list for {isAfterReminderTime ? 'tomorrow' : 'today'} · {targetFormatted}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Right Column: Things to Carry List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {totalCount === 0 && !targetHoliday ? (
            <div className="border border-[#D8D8D8] dark:border-[#333333] bg-[#FFFFFF] dark:bg-[#111111] p-5 flex flex-col items-start rounded-none">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                <Backpack className="w-[18px] h-[18px] stroke-[1.5]" />
                <span>Things to Carry</span>
              </div>
              <div className="flex flex-col mt-4 mb-5">
                <span className="text-[14px] text-[#6F6F6F]">Nothing packed yet.</span>
                <span className="text-[14px] text-[#6F6F6F]">Add what you need for {isAfterReminderTime ? 'tomorrow' : 'today'}.</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="h-[44px] px-6 bg-[#111111] dark:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#111111] flex items-center justify-center gap-2 font-medium text-[14px] hover:opacity-90 transition-opacity rounded-none"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </div>
          ) : (
            <div className="border border-[#D8D8D8] dark:border-[#333333] rounded-none flex flex-col p-5 sm:p-6 bg-[#FFFFFF] dark:bg-[#111111]">
              <div className="flex items-center justify-between pb-[14px] border-b border-[#D8D8D8] dark:border-[#333333] mb-[16px]">
                <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">
                  <Backpack className="w-[18px] h-[18px] stroke-[1.5]" />
                  <span>Things to Carry</span>
                </div>
                <div className="text-[12px] font-bold font-mono tracking-widest text-[#111111] dark:text-[#FFFFFF]">
                  {packedCount} / {totalCount}
                </div>
              </div>

              {visibleCarryItems.length === 0 && targetHoliday ? (
                <EmptyState
                  icon={<MonochromeIllustration type="holiday" size={48} />}
                  title="NO PACKING NEEDED — HOLIDAY!"
                  description={`${targetFormatted} is an official campus holiday (${targetHoliday.title}). Enjoy your break!`}
                />
              ) : (
                <div className="flex flex-col gap-3">
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
                  className="flex items-center gap-2 text-[14px] font-bold text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-all w-fit cursor-pointer mt-[18px]"
                >
                  <Plus className="w-4 h-4 stroke-[2]" />
                  <span>Add another item</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Left Column: Schedule Preview */}
        <div className="lg:col-span-5 flex flex-col mt-4 lg:mt-0">
          <div className="flex items-center justify-between pb-[14px] border-b border-[#D8D8D8] dark:border-[#333333]">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-[1.5px] font-bold text-[#111111] dark:text-[#FFFFFF]">
              <Clock className="w-[18px] h-[18px] stroke-[1.5]" />
              <span>{isAfterReminderTime ? "Tomorrow's Schedule" : "Today's Schedule"}</span>
            </div>
            <div className="text-[12px] font-bold font-mono tracking-widest text-[#111111] dark:text-[#FFFFFF]">
              {targetHoliday ? '0' : targetClasses.length}
            </div>
          </div>

          <div className="flex flex-col">
            {targetHoliday ? (
              <div className="py-6 text-center text-[#6F6F6F] text-[14px]">
                No classes today. Enjoy your holiday!
              </div>
            ) : targetClasses.length === 0 ? (
              <div className="py-6 text-center text-[#6F6F6F] text-[14px]">
                No classes scheduled for {isAfterReminderTime ? 'tomorrow' : 'today'}.
              </div>
            ) : (
              targetClasses.map((sess) => {
                const subject = subjectMap.get(sess.subjectId);
                const reqs = subject?.carryRequirements || [];
                return (
                  <button
                    key={sess.id}
                    onClick={() => {
                      setDetailSession(sess);
                    }}
                    className="flex items-start gap-4 py-[16px] border-b border-[#D8D8D8] dark:border-[#333333] last:border-b-0 group text-left transition-colors cursor-pointer"
                  >
                    <div className="w-[52px] shrink-0 pt-[1px]">
                      <span className="text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF]">
                        {sess.startTime}
                      </span>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-[14px] font-[600] text-[#111111] dark:text-[#FFFFFF] leading-[18px] line-clamp-2">
                          {subject?.name || 'Unknown Subject'}
                        </span>
                        <span className="text-[#A0A0A0] group-hover:text-[#111111] dark:group-hover:text-[#FFFFFF] transition-colors shrink-0 mt-0.5">
                          <ChevronRight className="w-4 h-4 stroke-[2]" />
                        </span>
                      </div>
                      
                      {sess.room && (
                        <span className="text-[12px] text-[#6F6F6F] dark:text-[#A0A0A0] flex items-center gap-1.5 mt-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-black/60 dark:text-white/60" />
                          <span>{sess.room}</span>
                        </span>
                      )}
                      
                      {reqs.length > 0 && (
                        <div className="mt-2 text-[12px] text-[#8C6B5D] dark:text-[#B5988C] flex items-center gap-1.5 truncate font-medium">
                          <Backpack className="w-[11px] h-[11px] shrink-0 stroke-[2.5]" />
                          <span className="truncate">{reqs.join(' · ')}</span>
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
