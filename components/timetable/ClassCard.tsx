'use client';

import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MapPin, User, MoreHorizontal, Edit2, Trash2, FlaskConical, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { clsx } from 'clsx';

// 10 distinct, elegant & engaging pastel paper colors (slightly lighter shades)
const ELEGANT_PASTEL_PALETTE = [
  'bg-[#FEF9C3]/80 dark:bg-[#78350F]/25 border-[#FDE047]/60 dark:border-[#FACC15]/30', // Golden Cream
  'bg-[#E0F2FE]/80 dark:bg-[#0C4A6E]/25 border-[#7DD3FC]/60 dark:border-[#38BDF8]/30', // Ice Denim Blue
  'bg-[#FCE7F3]/80 dark:bg-[#831843]/25 border-[#F9A8D4]/60 dark:border-[#F472B6]/30', // Soft Rose Pink
  'bg-[#DCFCE7]/80 dark:bg-[#064E3B]/25 border-[#86EFAC]/60 dark:border-[#4ADE80]/30', // Fresh Sage Mint
  'bg-[#FFEDD5]/80 dark:bg-[#7C2D12]/25 border-[#FDBA74]/60 dark:border-[#FB923C]/30', // Peach Terracotta
  'bg-[#F3E8FF]/80 dark:bg-[#3B0764]/25 border-[#D8B4FE]/60 dark:border-[#C084FC]/30', // Soft Lavender
  'bg-[#CCFBF1]/80 dark:bg-[#134E4A]/25 border-[#5EEAD4]/60 dark:border-[#2DD4BF]/30', // Soft Teal
  'bg-[#FFE4E6]/80 dark:bg-[#881337]/25 border-[#FDA4AF]/60 dark:border-[#FB7185]/30', // Blush Coral
  'bg-[#FEF3C7]/80 dark:bg-[#78350F]/25 border-[#FCD34D]/60 dark:border-[#F59E0B]/30', // Warm Amber
  'bg-[#ECFCCB]/80 dark:bg-[#365314]/25 border-[#BEF264]/60 dark:border-[#A3E635]/30', // Soft Lime
];

const getSubjectPastelStyle = (sub?: Subject, fallbackId: string = '') => {
  const key = sub?.name || sub?.id || fallbackId;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % ELEGANT_PASTEL_PALETTE.length;
  }
  return ELEGANT_PASTEL_PALETTE[Math.abs(hash)];
};

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

  let cardColorClass = '';
  if (isCurrent) {
    cardColorClass = 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10 border-transparent ring-1 ring-black/5 dark:ring-white/5';
  } else {
    cardColorClass = `${getSubjectPastelStyle(subject, session.id)} text-black dark:text-white`;
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
