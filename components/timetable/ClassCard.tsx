'use client';

import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
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

  // Colors
  const cardBgClass = isCurrent 
    ? 'bg-[#111111] dark:bg-[#FFFFFF] border-[#111111] dark:border-[#FFFFFF]' 
    : 'bg-[#FFFFFF] dark:bg-[#111111] border-[#D9D9D6] dark:border-[#333333]';

  const textPrimaryClass = isCurrent
    ? 'text-[#FFFFFF] dark:text-[#111111]'
    : 'text-[#111111] dark:text-[#FFFFFF]';
    
  const textSecondaryClass = isCurrent
    ? 'text-[#FFFFFF]/70 dark:text-[#111111]/70'
    : 'text-[#6F6F6F] dark:text-[#999999]';

  // Format Faculty string (handle "+ 2 faculty" logic)
  const rawFaculty = session.faculty || subject?.facultyName || '';
  let displayFaculty = rawFaculty;
  if (rawFaculty) {
    const facultyList = rawFaculty.split('/').map(f => f.trim()).filter(Boolean);
    if (facultyList.length > 1) {
      displayFaculty = `${facultyList[0]} + ${facultyList.length - 1} faculty`;
    }
  }

  const roomStr = session.room || (session.isLab ? subject?.labRoom : subject?.room) || 'TBA';

  return (
    <div
      className={clsx(
        "group relative flex flex-col p-[14px] text-left transition-all border rounded-none",
        cardBgClass
      )}
    >
      {/* Top Bar: Time & Actions */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("text-[12px] font-semibold tracking-wide font-mono", textPrimaryClass)}>
            {session.startTime} — {session.endTime}
          </span>
          {session.isLab && (
            <span className={clsx(
              "text-[10px] font-bold tracking-widest px-1.5 py-0.5 uppercase",
              isCurrent 
                ? "text-black bg-white/20 dark:text-white dark:bg-black/20" 
                : "text-[#B35900] dark:text-[#FFA033] bg-[#B35900]/10 dark:bg-[#FFA033]/10"
            )}>
              LAB
            </span>
          )}
          {isCurrent && (
            <span className="flex h-1.5 w-1.5 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
            </span>
          )}
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={clsx(
              "p-1 rounded-none transition-colors",
              textSecondaryClass,
              isCurrent 
                ? "hover:text-white dark:hover:text-black hover:bg-white/10 dark:hover:bg-black/10"
                : "hover:text-[#111111] dark:hover:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-32 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] py-1 z-30 text-left rounded-none shadow-sm">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(session);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Class
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(session.id);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-[#D32F2F] hover:bg-[#D32F2F]/5 text-left transition-colors"
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
      <div className="mt-3 flex items-start gap-[10px]">
        <div
          className="w-[3px] self-stretch shrink-0"
          style={{ backgroundColor: subject?.color || (isCurrent ? 'currentColor' : '#111111') }}
        />
        <h4 className={clsx(
          "text-[16px] leading-[20px] font-semibold tracking-tight break-words",
          textPrimaryClass
        )}>
          {subject?.name || 'Subject'}
        </h4>
      </div>

      {/* Metadata */}
      <div className={clsx(
        "mt-2 ml-[13px] flex items-center gap-1.5 text-[12px] font-medium truncate",
        textSecondaryClass
      )}>
        <span className="shrink-0">⌖ {roomStr}</span>
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
