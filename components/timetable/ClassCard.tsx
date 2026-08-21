'use client';

import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MapPin, User, MoreHorizontal, Edit2, Trash2, FlaskConical } from 'lucide-react';
import { Badge } from '../ui/Badge';

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
      className={`group relative flex flex-col p-3 rounded-xl border transition-all text-left shadow-sm ${
        isCurrent
          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/40 ring-1 ring-blue-500/20'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {session.startTime} – {session.endTime}
          </span>
          {session.isLab && (
            <Badge variant="amber" size="sm">
              <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
              Lab
            </Badge>
          )}
          {isCurrent && (
            <Badge variant="blue" size="sm" dot>
              Now
            </Badge>
          )}
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-28 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-left">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(session);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left"
                >
                  <Edit2 className="w-3 h-3 text-zinc-400" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(session.id);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subject Name & Code */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: subject?.color || '#3B82F6' }}
        />
        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {subject?.name || 'Subject'}
        </h4>
      </div>

      {/* Room & Faculty */}
      <div className="mt-2 flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
          <MapPin className="w-3 h-3 text-zinc-400" />
          <span>{session.room || (session.isLab ? subject?.labRoom : subject?.room) || 'TBA'}</span>
        </div>
        {(session.faculty || subject?.facultyName) && (
          <div className="flex items-center gap-1 truncate">
            <User className="w-3 h-3 text-zinc-400" />
            <span className="truncate">{session.faculty || subject?.facultyName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
