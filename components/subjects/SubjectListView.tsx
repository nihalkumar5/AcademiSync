'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Subject, ClassSession } from '@/lib/types';
import { SubjectModal } from './SubjectModal';
import { AddEditClassModal } from '../timetable/AddEditClassModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
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
} from '@/components/ui/icons';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { clsx } from 'clsx';

export const SubjectListView: React.FC = () => {
  const { subjects, deleteSubject, profile, timetable, showToast, isBatchCR, currentBatchData, toggleElectiveEnrollment } = useApp();
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [preselectedClassSession, setPreselectedClassSession] = useState<ClassSession | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lab' | 'theory' | 'carry' | 'electives'>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  const totalLabs = subjects.filter((s) => s.isLab).length;
  const totalElectives = subjects.filter((s) => s.isElective).length;
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
    if (filterType === 'electives') return sub.isElective;
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

  const filters: { id: typeof filterType; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: subjects.length },
    { id: 'theory', label: 'Lectures', count: subjects.length - totalLabs },
    { id: 'lab', label: 'Labs', count: totalLabs },
    { id: 'carry', label: 'With carry list' },
    ...(totalElectives > 0 ? [{ id: 'electives' as const, label: 'Electives', count: totalElectives }] : []),
  ];

  const formatSlotTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h)) return t;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m || 0).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
  };

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-5xl w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="page-title">
            Subjects
          </h2>
          <p className="text-[14px] text-muted mt-1.5">
            {[profile.programme, profile.branch, profile.semester ? `Semester ${profile.semester}` : null].filter(Boolean).join(' · ') || 'Your courses this semester'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditSubject(null);
            setShowModal(true);
          }}
          className="btn btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add subject
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 border border-line bg-surface divide-x divide-line-soft">
        {[
          { label: 'Courses', value: subjects.length },
          { label: 'Credits', value: totalCredits },
          { label: 'Labs', value: totalLabs },
          { label: 'Classes / wk', value: totalSlots },
        ].map((stat) => (
          <div key={stat.label} className="px-2 py-3.5 sm:px-4 flex flex-col items-center sm:items-start">
            <span className="text-[24px] sm:text-[28px] font-semibold leading-none text-fg tabular-nums">{stat.value}</span>
            <span className="mt-1.5 text-[11px] sm:text-[12px] font-medium text-muted whitespace-nowrap">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Electives */}
      {totalElectives > 0 && (
        <section aria-label="Electives">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-[17px] font-semibold text-fg tracking-tight">Electives</h3>
            <span className="text-[13px] text-muted">Pick the ones you attend</span>
          </div>
          <ul className="border border-line bg-surface divide-y divide-line-soft">
            {subjects.filter((s) => s.isElective).map((elec) => {
              const isEnrolled = profile.enrolledElectiveIds === undefined || profile.enrolledElectiveIds.includes(elec.id);
              return (
                <li key={elec.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-[15px] font-medium truncate', isEnrolled ? 'text-fg' : 'text-muted')}>{elec.name}</p>
                    {elec.code && elec.code !== 'UNK' && (
                      <p className="text-[12px] font-mono text-muted">{elec.code}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnrolled}
                    aria-label={`Attending ${elec.name}`}
                    onClick={() => toggleElectiveEnrollment(elec.id)}
                    className={clsx(
                      'relative w-11 h-6 shrink-0 rounded-full transition-colors cursor-pointer',
                      isEnrolled ? 'bg-ink' : 'bg-black/15 dark:bg-white/15'
                    )}
                  >
                    <span className={clsx(
                      'absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all',
                      isEnrolled ? 'left-[22px]' : 'left-0.5'
                    )} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-4 h-12 bg-surface border border-line focus-within:border-line-strong transition-colors">
          <Search className="w-[18px] h-[18px] text-muted shrink-0" />
          <input
            type="text"
            aria-label="Search subjects"
            placeholder="Search subjects, faculty or rooms"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[15px] text-fg placeholder:text-[#6B6B6B] dark:placeholder:text-[#A1A1AA] focus:outline-none"
          />
        </div>
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 w-max" role="tablist" aria-label="Filter subjects">
            {filters.map((f) => {
              const active = filterType === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilterType(f.id)}
                  className={clsx(
                    'h-9 px-3.5 inline-flex items-center gap-2 border text-[13px] font-medium whitespace-nowrap cursor-pointer transition-colors',
                    active
                      ? 'bg-ink border-line-strong text-on-ink'
                      : 'bg-white dark:bg-transparent border-line text-fg hover:border-line-strong'
                  )}
                >
                  {f.label}
                  {f.count !== undefined && (
                    <span className={clsx('text-[12px] tabular-nums', active ? 'opacity-70' : 'text-muted')}>{f.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subject list */}
      {subjects.length === 0 ? (
        <EmptyState
          illustration="subjects"
          title="No subjects yet"
          description="Add your courses to see faculty, rooms, weekly classes and what to carry."
          actionLabel="Add subject"
          onAction={() => {
            setEditSubject(null);
            setShowModal(true);
          }}
        />
      ) : filteredSubjects.length === 0 ? (
        <div className="py-10 px-4 border border-dashed border-line text-center flex flex-col items-center gap-1.5">
          <p className="text-[15px] font-semibold text-fg">No matching subjects</p>
          <p className="text-[14px] text-muted">Try a different search or filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="mt-2 text-[13px] font-semibold text-fg underline underline-offset-4 cursor-pointer"
          >
            Clear filters
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
            const isEnrolledElective = profile.enrolledElectiveIds === undefined || profile.enrolledElectiveIds.includes(sub.id);

            return (
              <article
                key={sub.id}
                onClick={() => {
                  setEditSubject(sub);
                  setShowModal(true);
                }}
                className="relative flex flex-col overflow-hidden border border-black/[0.06] dark:border-[color:var(--subject-border)] hover:shadow-md transition-shadow cursor-pointer"
                style={{ ['--subject-border' as any]: `${theme.accent}45` }}
              >
                {/* Same colour as this subject's classes in the timetable: soft pastel in light, accent tint in dark */}
                <div className="dark:hidden absolute inset-0 pointer-events-none" style={{ backgroundColor: theme.bg }} aria-hidden="true" />
                <div
                  className="hidden dark:block absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}2A 0%, ${theme.accent}14 100%), #13151D` }}
                  aria-hidden="true"
                />
                <div className="relative p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 flex-wrap text-[12px] text-muted">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
                        {sub.code && sub.code !== 'UNK' && <span className="font-mono">{sub.code}</span>}
                        {sub.code && sub.code !== 'UNK' && <span aria-hidden="true">·</span>}
                        <span>{sub.credits} {sub.credits === 1 ? 'credit' : 'credits'}</span>
                        {sub.isLab && (
                          <span className="ml-1 px-1.5 py-px text-[12px] font-semibold border" style={{ color: theme.accent, borderColor: `${theme.accent}55` }}>Lab</span>
                        )}
                        {sub.isElective && (
                          <span className="ml-1 px-1.5 py-px text-[12px] font-semibold border border-violet-500/40 text-violet-700 dark:text-violet-300">Elective</span>
                        )}
                        {isReadOnlyOfficial && <span className="ml-1">· Official</span>}
                      </p>
                      <h3 className="mt-1.5 text-[17px] font-semibold text-fg leading-snug tracking-tight">
                        {sub.name}
                      </h3>
                    </div>
                    <div className="flex items-center -mr-2 -mt-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditSubject(sub);
                          setShowModal(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                        title={isReadOnlyOfficial ? 'Customize colour' : `Edit ${sub.name}`} aria-label={isReadOnlyOfficial ? `Customize colour of ${sub.name}` : `Edit ${sub.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!isReadOnlyOfficial && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubjectToDelete(sub);
                          }}
                          className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete subject" aria-label={`Delete ${sub.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {sub.notes && (
                    <p className="mt-1 text-[13px] text-muted leading-snug">{sub.notes}</p>
                  )}

                  <dl className="mt-3 grid gap-1.5 text-[14px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <dt className="sr-only">Faculty</dt>
                      <User className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                      <dd className="truncate text-fg">{sub.facultyName || 'Faculty not added'}</dd>
                      {sub.facultyEmail && (
                        <span className="ml-auto flex items-center shrink-0">
                          <a
                            href={`mailto:${sub.facultyEmail}?subject=${encodeURIComponent(`[${sub.code || sub.name}] Inquiry`)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                            title="Email faculty" aria-label={`Email ${sub.facultyName || 'faculty'}`}
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyEmail(sub.facultyEmail!);
                            }}
                            className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                            title="Copy email" aria-label="Copy faculty email"
                          >
                            {copiedEmail === sub.facultyEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <dt className="sr-only">Room</dt>
                      <MapPin className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                      <dd className="truncate text-fg">
                        {sub.room || 'Room not added'}
                        {sub.isLab && sub.labRoom ? <span className="text-muted"> · Lab {sub.labRoom}</span> : null}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="relative border-t border-black/[0.06] dark:border-white/[0.08] px-4 sm:px-5 pl-5 sm:pl-6 py-3 grid gap-2.5">
                  <div className="flex items-start gap-3">
                    <span className="w-14 shrink-0 pt-1 text-[12px] font-medium text-muted">Weekly</span>
                    {scheduledSessions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {scheduledSessions.map((sess) => (
                          <span key={sess.id} className="px-2 py-0.5 text-[12px] tabular-nums bg-white/75 dark:bg-black/25 border border-black/[0.05] dark:border-white/[0.06] text-fg">
                            <span className="font-semibold">{sess.day.slice(0, 3)}</span> {formatSlotTime(sess.startTime)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="pt-0.5 text-[13px] text-muted">Not in timetable yet</span>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-14 shrink-0 pt-1 text-[12px] font-medium text-muted">Carry</span>
                    {sub.carryRequirements && sub.carryRequirements.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sub.carryRequirements.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[12px] bg-white/75 dark:bg-black/25 border border-black/[0.05] dark:border-white/[0.06] text-fg">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="pt-0.5 text-[13px] text-muted">Nothing set</span>
                    )}
                  </div>
                  {sub.isElective && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-[12px] font-medium text-muted">Routine</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleElectiveEnrollment(sub.id);
                        }}
                        className={clsx(
                          'h-7 px-2.5 text-[12px] font-semibold cursor-pointer transition-colors',
                          isEnrolledElective
                            ? 'bg-ink text-on-ink'
                            : 'border border-line text-fg'
                        )}
                      >
                        {isEnrolledElective ? 'Attending' : 'Add to routine'}
                      </button>
                    </div>
                  )}
                  {(sub.driveLink || sub.syllabusLink) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-14 shrink-0 text-[12px] font-medium text-muted">Links</span>
                      {sub.driveLink && (
                        <a
                          href={sub.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-fg underline underline-offset-4 decoration-black/20 dark:decoration-white/30 hover:decoration-current"
                        >
                          <FileText className="w-3.5 h-3.5" /> Notes <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                      {sub.syllabusLink && (
                        <a
                          href={sub.syllabusLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-fg underline underline-offset-4 decoration-black/20 dark:decoration-white/30 hover:decoration-current"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Syllabus <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
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
      <ConfirmModal
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={() => {
          if (subjectToDelete) deleteSubject(subjectToDelete.id);
          setSubjectToDelete(null);
        }}
        title="Delete subject?"
        description="All of its class slots will also be removed from your timetable."
        highlightText={subjectToDelete?.name}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};
