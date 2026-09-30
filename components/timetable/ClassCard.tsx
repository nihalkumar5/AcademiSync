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
        "group relative flex flex-col p-4 sm:p-[18px] text-left transition-all rounded-[16px] overflow-hidden",
        menuOpen ? 'z-40' : 'z-0',
        isCurrent
          ? "bg-[#111111] dark:bg-[#111111] border-2 border-[#18A889] shadow-[0_0_24px_-4px_rgba(24,168,137,0.3)] ring-1 ring-[#18A889]/30"
          : "border border-black/[0.04] dark:border-[color:var(--card-accent-border)] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all"
      )}
      style={{
        ['--card-accent-border' as any]: isCurrent ? '#18A889' : `${theme.accent}45`,
        borderColor: isCurrent ? '#18A889' : undefined,
      }}
    >
      {/* Backgrounds: Exact Reference Macaron in Light Mode, Rich 16% Gradient Tint in Dark Mode */}
      {!isCurrent && (
        <>
          <div 
            className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[15px]"
            style={{ backgroundColor: theme.bg }}
          />
          <div 
            className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[15px]"
            style={{ 
              background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D`,
            }}
          />
        </>
      )}

      <div className="relative z-10 flex flex-col">
        {/* Top Bar: Category Label with Circular Avatar, Time Pill & Menu */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category with circle avatar matching reference image */}
            <div className="flex items-center gap-1.5">
              <span 
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] shadow-xs"
                style={{
                  backgroundColor: theme.badgeBg,
                  color: theme.badgeText,
                }}
              >
                {(subject?.code || session.notes || categoryLabel).charAt(0).toUpperCase()}
              </span>

              <span className="text-[11px] font-bold uppercase tracking-[1.2px] leading-none">
                <span className="dark:hidden text-slate-800">
                  {categoryLabel}
                </span>
                <span className="hidden dark:inline" style={{ color: theme.darkAccent || theme.accent }}>
                  {categoryLabel}
                </span>
              </span>
            </div>

            {isLab && (
              <span 
                className="text-[9.5px] font-bold tracking-widest px-2 py-0.5 uppercase rounded-full bg-white/80 dark:bg-[rgba(24,168,137,0.18)] text-emerald-800 dark:text-[#18A889] border border-emerald-600/20 dark:border-transparent shadow-xs dark:shadow-none"
              >
                LAB
              </span>
            )}

            {isSpecial && !isLab && (
              <span 
                className="text-[9.5px] font-bold tracking-widest px-2 py-0.5 uppercase rounded-full bg-white/80 dark:bg-[rgba(128,103,181,0.18)] text-purple-800 dark:text-[#8067B5] border border-purple-600/20 dark:border-transparent shadow-xs dark:shadow-none"
              >
                ELECTIVE
              </span>
            )}

            {isCurrent && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold tracking-widest px-2 py-0.5 text-[#18A889] bg-[#18A889]/15 border border-[#18A889]/30 uppercase rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18A889] animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Time Pill matching reference image */}
            <span 
              className="text-[11px] sm:text-[11.5px] font-bold font-mono tracking-tight px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-white/10 text-slate-700 dark:text-[#F4F4F6] border border-black/[0.04] dark:border-white/[0.08] shadow-xs whitespace-nowrap"
            >
              {formatTime12Hour(session.startTime)} – {formatTime12Hour(session.endTime)}
            </span>

            {/* Action Menu (Only for modifiable sessions) */}
            {canModify && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="p-1 rounded-full transition-colors cursor-pointer text-slate-500 hover:text-slate-900 dark:text-[#CBD5E1] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
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
          className="text-[16px] sm:text-[17px] leading-[22px] font-bold tracking-tight break-words mb-2.5 text-[#151515] dark:text-white"
        >
          {subject?.name || (session as any).subjectName || (session as any).title || 'Class Session'}
        </h4>

        {/* Metadata */}
        <div 
          className="flex items-center gap-1.5 text-[12px] font-medium truncate text-slate-600 dark:text-[#CBD5E1]"
        >
          <span className="shrink-0 flex items-center gap-1">
            <span className="text-[10px] leading-none opacity-80 text-slate-400 dark:text-[#CBD5E1]">◉</span> {roomStr}
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
