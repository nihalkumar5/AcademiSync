'use client';

import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MoreHorizontal, Edit2, Trash2, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';

export interface ClassCardProps {
  session: ClassSession;
  subject?: Subject;
  onEdit: (session: ClassSession) => void;
  onDelete: (id: string) => void;
  isCurrent?: boolean;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  session,
  subject,
  onEdit,
  onDelete,
  isCurrent = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Color system
  const isLab = session.isLab || subject?.isLab;
  const isSpecial = session.isExtra || subject?.name?.toLowerCase().includes('elective') || session.notes?.toLowerCase().includes('elective');
  
  let cardBg = '#E8EEFF';
  let accentColor = '#3045B8';
  let badgeColor = '#3045B8';
  let badgeBg = '#DCE6FF';
  let badgeText = 'CLASS';

  if (isLab) {
    cardBg = '#E4F4EE';
    accentColor = '#159A78';
    badgeColor = '#159A78';
    badgeBg = '#D2EFE4';
    badgeText = 'LAB';
  } else if (isSpecial) {
    cardBg = '#EEE9FA';
    accentColor = '#7661C9';
    badgeColor = '#7661C9';
    badgeBg = '#E2D9F7';
    badgeText = 'ELECTIVE';
  }

  const isDarkClass = isCurrent;
  const titleColor = isDarkClass ? '#FFFFFF' : '#15171C';
  const secondaryColor = isDarkClass ? '#A8A8A8' : '#6F737C';

  const displayFaculty = session.faculty || subject?.facultyName || '';
  const roomStr = session.room || (session.isLab ? subject?.labRoom : subject?.room) || 'TBA';

  return (
    <div
      className={clsx(
        "group relative flex flex-col p-[14px] text-left transition-all border rounded-none overflow-hidden",
        isCurrent
          ? "bg-[#111111] border-[#111111] shadow-lg"
          : "border-black/[0.06] hover:border-black/15 shadow-sm"
      )}
      style={{
        backgroundColor: isCurrent ? '#111111' : cardBg,
        borderLeft: isCurrent ? '4px solid #22A77A' : `4px solid ${accentColor}`,
      }}
    >
      {/* Top Bar: Time & Actions */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span 
            className="text-[12px] font-bold tracking-wide font-mono"
            style={{ color: isCurrent ? '#FFFFFF' : '#15171C' }}
          >
            {session.startTime} — {session.endTime}
          </span>
          {isLab && (
            <span 
              className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 uppercase border"
              style={{
                color: isCurrent ? '#22A77A' : badgeColor,
                backgroundColor: isCurrent ? 'rgba(34,167,122,0.15)' : badgeBg,
                borderColor: isCurrent ? 'rgba(34,167,122,0.3)' : badgeColor + '40',
              }}
            >
              LAB
            </span>
          )}
          {isCurrent && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest px-2 py-0.5 text-[#22A77A] bg-[#22A77A]/15 border border-[#22A77A]/30 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A77A] animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1 rounded-none transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: secondaryColor }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-32 bg-[#FFFFFF] dark:bg-[#121317] border border-[#D9D9D6] dark:border-white/[0.08] py-1 z-30 text-left rounded-none shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(session);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-[#111111] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Class
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(session.id);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-[#D32F2F] dark:text-rose-400 hover:bg-[#D32F2F]/5 dark:hover:bg-rose-950/30 text-left transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mt-2.5 flex items-start">
        <h4 
          className="text-[15px] leading-[20px] font-bold tracking-tight break-words"
          style={{ color: titleColor }}
        >
          {subject?.name || 'Subject'}
        </h4>
      </div>

      {/* Metadata */}
      <div 
        className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium truncate"
        style={{ color: secondaryColor }}
      >
        <span className="shrink-0 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {roomStr}
        </span>
        {displayFaculty && (
          <>
            <span className="shrink-0">·</span>
            <span className="truncate">{displayFaculty}</span>
          </>
        )}
      </div>
    </div>
  );
};
