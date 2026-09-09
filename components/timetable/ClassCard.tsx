import React, { useState } from 'react';
import { ClassSession, Subject } from '@/lib/types';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getSubjectCardTheme } from '@/lib/cardColors';

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
        "group relative flex flex-col p-4 sm:p-[18px] text-left transition-all rounded-[3px]",
        menuOpen ? 'z-40' : 'z-0',
        isCurrent
          ? "bg-[#111111] dark:bg-[#111111] text-white border border-[#111111] shadow-md"
          : "border shadow-none"
      )}
      style={{
        backgroundColor: isCurrent ? '#111111' : undefined,
        borderColor: isCurrent ? '#111111' : (theme.border || 'rgba(0,0,0,0.06)'),
        borderLeft: isCurrent ? '4px solid #18A889' : `4px solid ${theme.accent}`,
      }}
    >
      {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
      {!isCurrent && (
        <>
          <div 
            className="dark:hidden absolute inset-0 z-0 pointer-events-none rounded-[2px]"
            style={{ backgroundColor: theme.bg }}
          />
          <div 
            className="hidden dark:block absolute inset-0 z-0 pointer-events-none rounded-[2px]"
            style={{ backgroundColor: theme.darkBg }}
          />
        </>
      )}

      <div className="relative z-10 flex flex-col">
        {/* Top Bar: Category Label, Time, & Menu */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="text-[11px] font-bold uppercase tracking-[1.4px] leading-none"
              style={{ color: isCurrent ? '#18A889' : theme.accent }}
            >
              {categoryLabel}
            </span>

            {isLab && (
              <span 
                className="text-[9.5px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-[2px]"
                style={{
                  color: isCurrent ? '#18A889' : theme.badgeText,
                  backgroundColor: isCurrent ? 'rgba(24,168,137,0.18)' : theme.badgeBg,
                }}
              >
                LAB
              </span>
            )}

            {isSpecial && !isLab && (
              <span 
                className="text-[9.5px] font-bold tracking-widest px-1.5 py-0.5 uppercase rounded-[2px]"
                style={{
                  color: isCurrent ? '#8067B5' : theme.badgeText,
                  backgroundColor: isCurrent ? 'rgba(128,103,181,0.18)' : theme.badgeBg,
                }}
              >
                ELECTIVE
              </span>
            )}

            {isCurrent && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold tracking-widest px-1.5 py-0.5 text-[#18A889] bg-[#18A889]/15 border border-[#18A889]/30 uppercase rounded-[2px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18A889] animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span 
              className="text-[12px] sm:text-[13px] font-bold font-mono tracking-tight"
              style={{ color: isCurrent ? '#FFFFFF' : '#151515' }}
            >
              {session.startTime} – {session.endTime}
            </span>

            {/* Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1 rounded transition-colors cursor-pointer opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: isCurrent ? '#A8A8A8' : '#737373' }}
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
          </div>
        </div>

        {/* Title */}
        <h4 
          className="text-[16px] sm:text-[17px] leading-[22px] font-bold tracking-tight break-words mb-2.5"
          style={{ color: isCurrent ? '#FFFFFF' : '#151515' }}
        >
          {subject?.name || 'Class Session'}
        </h4>

        {/* Metadata */}
        <div 
          className="flex items-center gap-1.5 text-[12px] font-medium truncate"
          style={{ color: isCurrent ? '#A8A8A8' : '#6F737C' }}
        >
          <span className="shrink-0 flex items-center gap-1">
            <span className="text-[10px] leading-none opacity-80">◉</span> {roomStr}
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
