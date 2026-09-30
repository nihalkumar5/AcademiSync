import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { formatTime12Hour } from '@/lib/timetableUtils';

export interface ClassCardProps {
  session: ClassSession;
  subject?: Subject;
  onEdit: (session: ClassSession) => void;
  onDelete: (id: string) => void;
  isCurrent?: boolean;
  canModify?: boolean;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  session,
  subject,
  onEdit,
  onDelete,
  isCurrent = false,
  canModify = true,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const isLab = session.isLab || subject?.isLab;
  const isSpecial = session.isExtra || subject?.name?.toLowerCase().includes('elective') || session.notes?.toLowerCase().includes('elective');

  const theme = getSubjectCardTheme({
    subjectName: subject?.name,
    subjectCode: subject?.code,
    subjectColor: subject?.color,
    isLab,
    isSpecial,
  });

  const displayFaculty = session.faculty || subject?.facultyName || '';
  const roomStr = session.room || (session.isLab ? subject?.labRoom : subject?.room) || 'TBA';

  const renderFaculty = (facultyStr: string) => {
    const faculties = facultyStr.split(/[,/&]/).map(f => f.trim()).filter(Boolean);
    return faculties.join(' / ');
  };

  const categoryLabel = isLab ? 'LAB SESSION' : isSpecial ? 'ELECTIVE' : session.isExtra ? 'EXTRA CLASS' : (subject?.code && subject.code !== 'UNK' ? subject.code : 'LECTURE');

  return (
    <div
      className={clsx(
        "group relative flex flex-col p-4 sm:p-[18px] text-left transition-all rounded-[6px] overflow-hidden",
        menuOpen ? 'z-40' : 'z-0',
        isCurrent
          ? "bg-[#161822] dark:bg-[#151722] border-2 border-[#18A889] shadow-[0_0_24px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30"
          : "bg-white dark:bg-[#161822] hover:bg-slate-50/80 dark:hover:bg-[#1A1D2B] shadow-xs hover:shadow-md transition-all"
      )}
      style={{
        borderColor: isCurrent 
          ? '#18A889' 
          : `${theme.accent}45`,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {/* Ambient delicate corner glow */}
      {!isCurrent && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 0% 0%, ${theme.accent}14 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col">
        {/* Top Bar: Category Label, Time, & Menu */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider font-mono"
              style={{
                backgroundColor: `${theme.accent}18`,
                color: theme.darkAccent || theme.accent,
                border: `1px solid ${theme.accent}35`,
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full shrink-0" 
                style={{ backgroundColor: theme.accent }}
              />
              <span>{categoryLabel}</span>
            </span>

            {isLab && (
              <span 
                className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-[4px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              >
                LAB
              </span>
            )}

            {isSpecial && !isLab && (
              <span 
                className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-[4px] bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
              >
                ELECTIVE
              </span>
            )}

            {isCurrent && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-widest px-1.5 py-0.5 text-[#18A889] bg-[#18A889]/15 border border-[#18A889]/30 uppercase rounded-[4px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18A889] animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="text-[12px] font-bold font-mono tracking-tight text-slate-500 dark:text-[#94A3B8] whitespace-nowrap"
            >
              {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
            </span>

            {/* Action Menu (Only for modifiable sessions) */}
            {canModify && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="p-1 rounded transition-colors cursor-pointer text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                  title="Class actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-32 bg-[#FFFFFF] dark:bg-[#16171D] border border-[#D9D9D6] dark:border-white/[0.08] py-1 z-30 text-left rounded-[3px] shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(session);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium text-[#151515] dark:text-[#F4F4F6] hover:bg-black/5 dark:hover:bg-white/[0.04] text-left transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Class
                      </button>
                      <button
                        type="button"
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
            )}
          </div>
        </div>

        {/* Title */}
        <h4 
          className="text-[15px] sm:text-[16px] leading-[22px] font-bold tracking-tight break-words mb-2.5 text-[#111111] dark:text-[#F8FAFC]"
        >
          {subject?.name || (session as any).subjectName || (session as any).title || 'Class Session'}
        </h4>

        {/* Metadata */}
        <div 
          className="flex items-center gap-1.5 text-[12px] font-medium truncate text-[#6F737C] dark:text-[#94A3B8]"
        >
          <span className="shrink-0 flex items-center gap-1">
            <span className="text-[10px] leading-none opacity-80" style={{ color: theme.darkAccent || theme.accent }}>◉</span> {roomStr}
          </span>
          {displayFaculty && (
            <>
              <span className="shrink-0 opacity-40">·</span>
              <span className="truncate">{renderFaculty(displayFaculty)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
