'use client';

import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MapPin, User, MoreHorizontal, Edit2, Trash2, FlaskConical, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { clsx } from 'clsx';

// Premium rich color presets mapped to subject colors
const PASTEL_COLOR_MAP: Record<string, { light: string }> = {
  '#7A8B99': { light: 'bg-[#E0F2FE] dark:bg-[#0C4A6E]/30 border-[#38BDF8]/40 dark:border-[#0EA5E9]/40' }, // Denim Blue
  '#9C8E80': { light: 'bg-[#F3E8FF] dark:bg-[#3B0764]/30 border-[#C084FC]/40 dark:border-[#A855F7]/40' }, // Warm Cocoa / Purple Tint
  '#B88B8C': { light: 'bg-[#FCE7F3] dark:bg-[#831843]/30 border-[#F472B6]/40 dark:border-[#EC4899]/40' }, // Rose Pink
  '#C79F6F': { light: 'bg-[#FEF3C7] dark:bg-[#78350F]/30 border-[#FBBF24]/40 dark:border-[#F59E0B]/40' }, // Golden Amber
  '#7C897A': { light: 'bg-[#D1FAE5] dark:bg-[#064E3B]/30 border-[#34D399]/40 dark:border-[#10B981]/40' }, // Sage Mint
  '#C08A76': { light: 'bg-[#FFEDD5] dark:bg-[#7C2D12]/30 border-[#FB923C]/40 dark:border-[#F97316]/40' }, // Peach Terracotta
};

const PASTEL_FALLBACK_CLASSES = [
  'bg-[#FEF3C7] dark:bg-[#78350F]/30 border-[#FBBF24]/40 dark:border-[#F59E0B]/40', // Golden Amber
  'bg-[#D1FAE5] dark:bg-[#064E3B]/30 border-[#34D399]/40 dark:border-[#10B981]/40', // Sage Mint
  'bg-[#FCE7F3] dark:bg-[#831843]/30 border-[#F472B6]/40 dark:border-[#EC4899]/40', // Rose Pink
  'bg-[#E0F2FE] dark:bg-[#0C4A6E]/30 border-[#38BDF8]/40 dark:border-[#0EA5E9]/40', // Ice Blue
  'bg-[#FFEDD5] dark:bg-[#7C2D12]/30 border-[#FB923C]/40 dark:border-[#F97316]/40', // Peach Terracotta
  'bg-[#EDE9FE] dark:bg-[#4C1D95]/30 border-[#A78BFA]/40 dark:border-[#8B5CF6]/40', // Velvet Lavender
];

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

  // Compute pastel paper background
  const colorKey = subject?.color ? subject.color.toUpperCase() : '';
  const matchedStyle = PASTEL_COLOR_MAP[colorKey] || PASTEL_COLOR_MAP[subject?.color || ''];

  let cardColorClass = '';
  if (isCurrent) {
    cardColorClass = 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_rgba(255,255,255,1)]';
  } else if (matchedStyle) {
    cardColorClass = `${matchedStyle.light} text-black dark:text-white`;
  } else {
    const charSum = (subject?.name || session.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const fallbackClass = PASTEL_FALLBACK_CLASSES[charSum % PASTEL_FALLBACK_CLASSES.length];
    cardColorClass = `${fallbackClass} text-black dark:text-white`;
  }

  return (
    <div
      className={clsx(
        "group relative flex flex-col p-4 text-left transition-all border rounded-none",
        cardColorClass
      )}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 border border-current text-xs font-medium opacity-80">
            <Clock className="w-3.5 h-3.5" />
            <span>{session.startTime} – {session.endTime}</span>
          </div>

          {session.isLab && (
            <Badge variant="amber" size="sm" className="rounded-none px-2 border-black dark:border-white">
              <FlaskConical className="w-3 h-3 mr-1" />
              Lab
            </Badge>
          )}
          {isCurrent && (
            <span className="flex h-2 w-2 relative ml-1">
              <span className={clsx(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isCurrent ? "bg-white dark:bg-black" : "bg-black dark:bg-white"
              )}></span>
              <span className={clsx(
                "relative inline-flex rounded-full h-2 w-2",
                isCurrent ? "bg-white dark:bg-black" : "bg-black dark:bg-white"
              )}></span>
            </span>
          )}
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={clsx(
              "p-1.5 rounded-lg transition-colors",
              isCurrent 
                ? "text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-400"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
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
              <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-200/20 dark:shadow-none py-1.5 z-30 text-left overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(session);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  Edit Class
                </button>
                <div className="h-px w-full bg-slate-100 dark:bg-zinc-800 my-0.5"></div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(session.id);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subject Name & Code */}
      <div className="mt-1 flex items-start gap-2.5">
        <div
          className="w-1.5 h-6 rounded-none shrink-0 mt-0.5"
          style={{ backgroundColor: subject?.color || '#000000' }}
        />
        <h4 className="text-[15px] leading-snug font-bold">
          {subject?.name || 'Subject'}
        </h4>
      </div>

      {/* Room & Faculty */}
      <div className="mt-3.5 flex items-center gap-4 text-xs font-medium opacity-80">
        <div className="flex items-center gap-1.5 border border-current px-2 py-1 rounded-none">
          <MapPin className="w-3.5 h-3.5" />
          <span>{session.room || (session.isLab ? subject?.labRoom : subject?.room) || 'TBA'}</span>
        </div>
        {(session.faculty || subject?.facultyName) && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{session.faculty || subject?.facultyName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
