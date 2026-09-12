'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Subject, ClassSession } from '@/lib/types';
import { SubjectModal } from './SubjectModal';
import { AddEditClassModal } from '../timetable/AddEditClassModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import {
  BookOpen,
  Plus,
  MapPin,
  User,
  Mail,
  Backpack,
  Edit2,
  Trash2,
  FlaskConical,
  Search,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  FileText,
  Sparkles,
} from 'lucide-react';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { clsx } from 'clsx';

export const SubjectListView: React.FC = () => {
  const { subjects, deleteSubject, profile, timetable, showToast, isBatchCR, currentBatchData } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [preselectedClassSession, setPreselectedClassSession] = useState<ClassSession | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lab' | 'theory' | 'carry'>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  const totalLabs = subjects.filter((s) => s.isLab).length;
  const totalSlots = timetable.length;

  // Filter and search subjects
  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.facultyName && sub.facultyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.room && sub.room.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'lab') return sub.isLab;
    if (filterType === 'theory') return !sub.isLab;
    if (filterType === 'carry') return sub.carryRequirements && sub.carryRequirements.length > 0;

    return true;
  });

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    showToast('Email Copied', `Copied ${email} to clipboard`, 'success');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const getSubjectSessions = (subjectId: string) => {
    return timetable
      .filter((sess) => sess.subjectId === subjectId)
      .sort((a, b) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days.indexOf(a.day) - days.indexOf(b.day);
      });
  };

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#151515] dark:text-[#F4F4F6] tracking-tight">
              Subject Directory
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[2px] bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/80">
              {subjects.length} COURSES · {totalCredits} CREDITS
            </span>
          </div>
          <p className="text-xs text-[#737373] dark:text-[#94A3B8] mt-1">
            {profile.programme || 'Academic'} {profile.branch || ''} {profile.semester ? `Semester ${profile.semester}` : ''} Curriculum
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditSubject(null);
            setShowModal(true);
          }}
          className="gap-1.5 rounded-[3px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subject</span>
        </Button>
      </div>

      {/* Quick Summary Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-[#16171D] border border-[#E5E5E0] dark:border-white/[0.08] rounded-[3px] flex flex-col">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373] dark:text-[#94A3B8]">
            Enrolled Courses
          </span>
          <span className="text-xl font-bold text-[#151515] dark:text-[#F4F4F6] mt-0.5">
            {subjects.length}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-[#16171D] border border-[#E5E5E0] dark:border-white/[0.08] rounded-[3px] flex flex-col">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373] dark:text-[#94A3B8]">
            Total Credits
          </span>
          <span className="text-xl font-bold text-[#334CC4] dark:text-[#8AA4FF] mt-0.5">
            {totalCredits}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-[#16171D] border border-[#E5E5E0] dark:border-white/[0.08] rounded-[3px] flex flex-col">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373] dark:text-[#94A3B8]">
            Practical Labs
          </span>
          <span className="text-xl font-bold text-[#18A889] dark:text-[#2DD4BF] mt-0.5">
            {totalLabs}
          </span>
        </div>

        <div className="p-3 bg-white dark:bg-[#16171D] border border-[#E5E5E0] dark:border-white/[0.08] rounded-[3px] flex flex-col">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373] dark:text-[#94A3B8]">
            Weekly Timetable Slots
          </span>
          <span className="text-xl font-bold text-[#8067B5] dark:text-[#C084FC] mt-0.5">
            {totalSlots}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8A8A88] dark:text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search by course name, code, faculty, or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-white dark:bg-[#16171D] border border-[#E5E5E0] dark:border-white/[0.08] rounded-[3px] text-[#151515] dark:text-[#F4F4F6] placeholder:text-[#8A8A88] dark:placeholder:text-[#71717A] focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 shrink-0">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={clsx(
              "px-3 py-1.5 text-[11.5px] font-semibold rounded-[3px] transition-all cursor-pointer border",
              filterType === 'all'
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white dark:bg-[#16171D] border-[#E5E5E0] dark:border-white/[0.08] text-[#737373] dark:text-[#94A3B8] hover:bg-[#F8F8F5]"
            )}
          >
            All ({subjects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('lab')}
            className={clsx(
              "px-3 py-1.5 text-[11.5px] font-semibold rounded-[3px] transition-all cursor-pointer border",
              filterType === 'lab'
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white dark:bg-[#16171D] border-[#E5E5E0] dark:border-white/[0.08] text-[#737373] dark:text-[#94A3B8] hover:bg-[#F8F8F5]"
            )}
          >
            Labs ({totalLabs})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('theory')}
            className={clsx(
              "px-3 py-1.5 text-[11.5px] font-semibold rounded-[3px] transition-all cursor-pointer border",
              filterType === 'theory'
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white dark:bg-[#16171D] border-[#E5E5E0] dark:border-white/[0.08] text-[#737373] dark:text-[#94A3B8] hover:bg-[#F8F8F5]"
            )}
          >
            Lectures ({subjects.length - totalLabs})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('carry')}
            className={clsx(
              "px-3 py-1.5 text-[11.5px] font-semibold rounded-[3px] transition-all cursor-pointer border",
              filterType === 'carry'
                ? "bg-[#111111] text-white border-[#111111]"
                : "bg-white dark:bg-[#16171D] border-[#E5E5E0] dark:border-white/[0.08] text-[#737373] dark:text-[#94A3B8] hover:bg-[#F8F8F5]"
            )}
          >
            Has Carry Items
          </button>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-5 h-5" />}
          title="No subjects registered"
          description="Add your enrolled subjects and configure required carry items for each course."
          actionLabel="Add Subject"
          onAction={() => {
            setEditSubject(null);
            setShowModal(true);
          }}
        />
      ) : filteredSubjects.length === 0 ? (
        <div className="py-12 px-4 border border-dashed border-[#E5E5E0] dark:border-white/[0.08] text-center flex flex-col items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-[#8A8A88] dark:text-[#71717A] opacity-60" />
          <p className="text-sm font-semibold text-[#151515] dark:text-[#F4F4F6]">No matching courses found</p>
          <p className="text-xs text-[#737373] dark:text-[#94A3B8]">Try adjusting your search query or active filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="mt-2 text-xs font-bold uppercase tracking-wider text-[#334CC4] dark:text-[#8AA4FF] underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubjects.map((sub) => {
            const theme = getSubjectCardTheme({
              subjectName: sub.name,
              subjectCode: sub.code,
              subjectColor: sub.color,
              isLab: sub.isLab,
            });

            const scheduledSessions = getSubjectSessions(sub.id);

            const isBatchSubject = !!currentBatchData?.subjects?.some((b: Subject) => 
              b.id === sub.id || 
              (b.code && sub.code && b.code.trim().toUpperCase() === sub.code.trim().toUpperCase()) ||
              b.name.trim().toLowerCase() === sub.name.trim().toLowerCase()
            );
            const isReadOnlyOfficial = isBatchSubject && profile.isBatchSynced && !isBatchCR;

            return (
              <div
                key={sub.id}
                onClick={() => {
                  setEditSubject(sub);
                  setShowModal(true);
                }}
                className="group relative p-5 rounded-[3px] border shadow-none flex flex-col justify-between transition-all overflow-hidden cursor-pointer hover:border-black/20 dark:hover:border-white/20"
                style={{
                  borderColor: theme.border || 'rgba(0,0,0,0.08)',
                  borderLeft: `5px solid ${theme.accent}`,
                  borderTop: `2px solid ${theme.accent}60`,
                }}
              >
                {/* Ambient Pastel Gradient Tint */}
                <div 
                  className="absolute inset-0 z-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}1A 0%, transparent 65%)`,
                  }}
                />
                {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                <div 
                  className="dark:hidden absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundColor: theme.bg }}
                />
                <div 
                  className="hidden dark:block absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundColor: theme.darkBg }}
                />

                <div className="relative z-10 flex flex-col gap-3">
                  {/* Header: Theme Pill, Badges & Top Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Prominent Theme Pill / Badge showing pastel theme */}
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-[3px] shadow-2xs border"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                          borderColor: `${theme.accent}40`,
                        }}
                        title="Subject Color Theme"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: theme.accent }} />
                        <span>{theme.name}</span>
                        {sub.code && sub.code !== 'UNK' && (
                          <span className="opacity-75 font-mono">· {sub.code}</span>
                        )}
                      </span>

                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-[2px] bg-white/80 dark:bg-black/40 border border-black/[0.06] dark:border-white/[0.08] text-[#151515] dark:text-[#E2E8F0]">
                        {sub.credits} Credits
                      </span>
                      {sub.isLab && (
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 uppercase rounded-[2px] bg-[#D2F1E8] text-[#18A889]">
                          LAB
                        </span>
                      )}
                      {isReadOnlyOfficial && (
                        <span className="text-[9.5px] font-semibold tracking-wide px-1.5 py-0.5 rounded-[2px] bg-black/5 dark:bg-white/10 text-[#737373] dark:text-[#94A3B8]">
                          Official Course
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSubject(sub);
                          setShowModal(true);
                        }}
                        className="p-1.5 text-[#737373] hover:text-[#151515] dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                        title={isReadOnlyOfficial ? "Customize Color Theme" : "Edit Subject"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isReadOnlyOfficial && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSubject(sub.id);
                          }}
                          className="p-1.5 text-[#737373] hover:text-[#C94B5C] rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subject Name & Notes */}
                  <div>
                    <h3 className="text-[16px] sm:text-[17px] font-bold text-[#151515] dark:text-[#F4F4F6] tracking-tight leading-snug">
                      {sub.name}
                    </h3>
                    {sub.notes && (
                      <p className="text-xs text-[#737373] dark:text-[#94A3B8] italic mt-1 leading-snug">
                        {sub.notes}
                      </p>
                    )}
                  </div>

                  {/* Faculty & Classroom info */}
                  <div className="flex flex-col gap-1.5 text-xs text-[#737373] dark:text-[#94A3B8] bg-white/50 dark:bg-black/20 p-2.5 rounded-[2px] border border-black/[0.04] dark:border-white/[0.04]">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        <span className="font-semibold text-[#151515] dark:text-[#CBD5E1] truncate">
                          {sub.facultyName || 'No Faculty Specified'}
                        </span>
                      </div>

                      {/* Faculty Action Buttons */}
                      {sub.facultyEmail && (
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`mailto:${sub.facultyEmail}?subject=${encodeURIComponent(`[${sub.code || sub.name}] Inquiry`)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10.5px] font-medium rounded-[2px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[#151515] dark:text-white transition-colors cursor-pointer"
                            title="Send Email"
                          >
                            <Mail className="w-3 h-3 text-[#334CC4] dark:text-[#8AA4FF]" />
                            <span>Mail</span>
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyEmail(sub.facultyEmail!);
                            }}
                            className="p-1 text-[#737373] hover:text-[#151515] dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copy Email"
                          >
                            {copiedEmail === sub.facultyEmail ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      <span>
                        Room: <strong className="font-semibold text-[#151515] dark:text-white">{sub.room}</strong>
                        {sub.isLab && sub.labRoom && ` · Lab: ${sub.labRoom}`}
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Timetable Slots */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#737373] dark:text-[#94A3B8]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#334CC4] dark:text-[#8AA4FF]" />
                        <span>Weekly Slots:</span>
                      </span>
                      <span className="font-mono text-[10px]">
                        {scheduledSessions.length} {scheduledSessions.length === 1 ? 'class' : 'classes'} / week
                      </span>
                    </div>

                    {scheduledSessions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {scheduledSessions.map((sess) => (
                          <span
                            key={sess.id}
                            className="inline-flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded-[2px] bg-white/80 dark:bg-black/30 border border-black/[0.06] dark:border-white/[0.08] text-[#151515] dark:text-[#CBD5E1]"
                          >
                            <span className="font-bold text-[#111111] dark:text-white">{sess.day.slice(0, 3)}</span>
                            <span>{sess.startTime}</span>
                            {sess.room && <span className="opacity-60">({sess.room})</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#737373]/70 dark:text-[#64748B] italic">
                        Not added to weekly timetable yet
                      </span>
                    )}
                  </div>

                  {/* Resource Links (Drive, Syllabus) */}
                  {(sub.driveLink || sub.syllabusLink) && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {sub.driveLink && (
                        <a
                          href={sub.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-white/90 dark:bg-white/[0.08] border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 text-[11px] font-semibold text-[#151515] dark:text-white transition-all cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3 h-3 text-[#334CC4] dark:text-[#8AA4FF]" />
                          <span>Course Drive / Notes</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </a>
                      )}

                      {sub.syllabusLink && (
                        <a
                          href={sub.syllabusLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-white/90 dark:bg-white/[0.08] border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 text-[11px] font-semibold text-[#151515] dark:text-white transition-all cursor-pointer shadow-2xs"
                        >
                          <BookOpen className="w-3 h-3 text-[#18A889]" />
                          <span>Syllabus</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Carry Requirements Footer */}
                  <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#737373] dark:text-[#94A3B8] mb-1.5">
                      <Backpack className="w-3.5 h-3.5 text-[#18A889]" />
                      <span>Configured Things to Carry:</span>
                    </div>

                    {sub.carryRequirements && sub.carryRequirements.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sub.carryRequirements.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10.5px] px-2 py-0.5 rounded-[2px] bg-white/80 dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] text-[#151515] dark:text-[#CBD5E1] font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#737373]/70 dark:text-[#64748B] italic">
                        No carry requirements configured
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Subject Modal */}
      <SubjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        subjectToEdit={editSubject}
      />

      {/* Add Class Session Modal */}
      <AddEditClassModal
        isOpen={showAddClassModal}
        onClose={() => {
          setShowAddClassModal(false);
          setPreselectedClassSession(null);
        }}
        sessionToEdit={preselectedClassSession}
      />
    </div>
  );
};
