'use client';

import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MapPin, User, MoreHorizontal, Edit2, Trash2, FlaskConical, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { clsx } from 'clsx';

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

  return (
    <div
      className={clsx(
        "group relative flex flex-col p-4 text-left transition-all",
        isCurrent
          ? 'hero-mesh-card ring-1 ring-indigo-500/20'
          : 'bento-card hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-100/60 dark:hover:border-indigo-900/30'
      )}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
            isCurrent 
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20" 
              : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
          )}>
            <Clock className="w-3.5 h-3.5" />
            <span>{session.startTime} – {session.endTime}</span>
          </div>

          {session.isLab && (
            <Badge variant="amber" size="sm" className="rounded-lg px-2">
              <FlaskConical className="w-3 h-3 mr-1" />
              Lab
            </Badge>
          )}
          {isCurrent && (
            <span className="flex h-2 w-2 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
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
          className="w-1.5 h-6 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: subject?.color || '#6366F1' }}
        />
        <h4 className="text-[15px] leading-snug font-bold text-slate-900 dark:text-zinc-50">
          {subject?.name || 'Subject'}
        </h4>
      </div>

      {/* Room & Faculty */}
      <div className="mt-3.5 flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/50 px-2 py-1 rounded-md">
          <MapPin className="w-3.5 h-3.5 text-indigo-500/70" />
          <span className="text-slate-700 dark:text-zinc-300">{session.room || (session.isLab ? subject?.labRoom : subject?.room) || 'TBA'}</span>
        </div>
        {(session.faculty || subject?.facultyName) && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{session.faculty || subject?.facultyName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
