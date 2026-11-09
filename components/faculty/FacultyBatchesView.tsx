'use client';

import { FacultyPageHeader, FacultyNoBatches, FacultyStatTile } from './FacultyUI';
import React, { useState, useEffect, useMemo } from 'react';
import { useApp, sanitizeForFirestore } from '@/context/AppContext';
import { FacultyLinkedBatch, StudentProfile, ClassSession, Subject, DayOfWeek } from '@/lib/types';
import {
  Users,
  Plus,
  Trash2,
  BookOpen,
  CalendarDays,
  Search,
  ExternalLink,
  Share2,
  Check,
  Copy,
  Clock,
  Sparkles,
  AlertCircle,
  GraduationCap,
  MessageCircle,
  Eye,
  CheckSquare,
  X,
} from '@/components/ui/icons';
import { formatFacultyBatchDegreeAndBranch, isCommonSubject } from '@/lib/facultyUtils';
import { getShortCollegeName } from '@/lib/timetableUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthHeaders } from '@/lib/authHeaders';
import { ConnectBatchModal } from './ConnectBatchModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';
import { Modal } from '@/components/ui/Modal';
import { clsx } from 'clsx';

const DAYS_ORDER: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface BatchMetaState {
  docData?: any;
  studentCount?: number;
  crInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    rollNumber?: string;
  };
}

export const FacultyBatchesView: React.FC = () => {
  const { profile, updateProfile, showToast, user } = useApp();
  const linkedBatches = profile?.facultyLinkedBatches || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgrammeFilter, setSelectedProgrammeFilter] = useState<string>('all');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [batchToUnlink, setBatchToUnlink] = useState<FacultyLinkedBatch | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [copiedCodeBatchId, setCopiedCodeBatchId] = useState<string | null>(null);

  // Batch timetable modal state
  const [selectedBatchForTimetable, setSelectedBatchForTimetable] = useState<FacultyLinkedBatch | null>(null);
  const [timetableModalDay, setTimetableModalDay] = useState<DayOfWeek>('Monday');

  // Real-time batch metadata (from shared_timetables and users collection)
  const [batchesMeta, setBatchesMeta] = useState<Record<string, BatchMetaState>>({});

  // 1. Real-time listeners for each linked batch's shared_timetables doc
  useEffect(() => {
    if (linkedBatches.length === 0) {
      setBatchesMeta({});
      return;
    }

    const unsubs: (() => void)[] = [];

    linkedBatches.forEach((batch) => {
      const bRef = doc(db, 'shared_timetables', batch.batchKey);
      const unsub = onSnapshot(
        bRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setBatchesMeta((prev) => ({
              ...prev,
              [batch.batchKey]: {
                ...prev[batch.batchKey],
                docData: data,
                crInfo: prev[batch.batchKey]?.crInfo || {
                  name: data.crName || data.creatorName || undefined,
                  email: data.crEmail || data.creatorEmail || undefined,
                  phone: data.crPhone || undefined,
                  rollNumber: data.crRollNumber || undefined,
                },
              },
            }));
          }
        },
        (err) => {
          console.warn('Error listening to batch doc:', batch.batchKey, err);
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [linkedBatches]);

  // 2. Fetch student count & CR info from users collection for each batch
  useEffect(() => {
    if (linkedBatches.length === 0) return;

    let isMounted = true;

    linkedBatches.forEach(async (batch) => {
      try {
        // Users docs are owner-only in Firestore rules, so member info comes from the server
        const res = await fetch(`/api/batch/members?batchKey=${encodeURIComponent(batch.batchKey)}`, {
          headers: await getAuthHeaders({}),
        });
        const data = await res.json().catch(() => ({}));

        if (!isMounted || !res.ok || !Array.isArray(data.members)) return;

        let crUser: any = null;
        let count = 0;

        data.members.forEach((m: any) => {
          count++;
          const uProf = m?.profile;
          if (uProf?.role === 'cr' || uProf?.role === 'super_admin') {
            if (!crUser) crUser = uProf;
          }
        });

        setBatchesMeta((prev) => ({
          ...prev,
          [batch.batchKey]: {
            ...prev[batch.batchKey],
            studentCount: count,
            crInfo: crUser
              ? {
                  name: crUser.name,
                  email: crUser.email,
                  phone: crUser.phone,
                  rollNumber: crUser.rollNumber,
                }
              : prev[batch.batchKey]?.crInfo,
          },
        }));
      } catch (err) {
        // Fallback or ignore network issue
      }
    });

    return () => {
      isMounted = false;
    };
  }, [linkedBatches]);

  // Compute summary metrics
  const totalBatches = linkedBatches.length;

  const totalUniqueSubjects = useMemo(() => {
    const names = new Set<string>();
    linkedBatches.forEach((b) => {
      (b.selectedSubjectNames || []).forEach((n) => {
        if (n && n.trim()) names.add(n.trim().toLowerCase());
      });
    });
    return names.size;
  }, [linkedBatches]);

  const totalWeeklyLectures = useMemo(() => {
    let count = 0;
    linkedBatches.forEach((b) => {
      const meta = batchesMeta[b.batchKey];
      const rawTimetable = meta?.docData?.timetable;
      if (Array.isArray(rawTimetable)) {
        const selectedIds = b.selectedSubjectIds || [];
        const selectedNames = (b.selectedSubjectNames || []).map((n) => n.trim().toLowerCase());
        rawTimetable.forEach((s: ClassSession) => {
          const matchId = Boolean(s.subjectId && selectedIds.includes(s.subjectId));
          const sName = (s.subjectName || (s as any).subject || '').trim().toLowerCase();
          const matchName = Boolean(sName && selectedNames.includes(sName));
          if (matchId || matchName) {
            count++;
          }
        });
      }
    });
    return count;
  }, [linkedBatches, batchesMeta]);

  // Extract distinct programmes for filter bar
  const availableProgrammes = useMemo(() => {
    const set = new Set<string>();
    linkedBatches.forEach((b) => {
      const { degreeAndBranch } = formatFacultyBatchDegreeAndBranch(b);
      const degree = degreeAndBranch.split('·')[0]?.trim();
      if (degree) set.add(degree);
    });
    return Array.from(set);
  }, [linkedBatches]);

  // Filter batches by search query and programme filter
  const filteredBatches = useMemo(() => {
    return linkedBatches.filter((b) => {
      const { degreeAndBranch, fullLabel } = formatFacultyBatchDegreeAndBranch(b);

      // Programme tab filter
      if (selectedProgrammeFilter !== 'all') {
        const degree = degreeAndBranch.split('·')[0]?.trim();
        if (degree !== selectedProgrammeFilter) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchDegree = degreeAndBranch.toLowerCase().includes(q);
      const matchFull = fullLabel.toLowerCase().includes(q);
      const matchCode = (b.batchCode || '').toLowerCase().includes(q);
      const matchKey = (b.batchKey || '').toLowerCase().includes(q);
      const matchCollege = (b.college || '').toLowerCase().includes(q);
      const matchSubjects = (b.selectedSubjectNames || []).some((s) => s.toLowerCase().includes(q));

      return matchDegree || matchFull || matchCode || matchKey || matchCollege || matchSubjects;
    });
  }, [linkedBatches, selectedProgrammeFilter, searchQuery]);

  // Copy batch code handler
  const handleCopyBatchCode = (batch: FacultyLinkedBatch) => {
    const code = batch.batchCode || batch.batchKey;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeBatchId(batch.id || batch.batchKey);
      showToast('Code Copied', `Batch code ${code} copied to clipboard.`, 'success');
      setTimeout(() => setCopiedCodeBatchId(null), 2000);
    }
  };

  // Disconnect batch handler
  const handleConfirmUnlink = async () => {
    if (!batchToUnlink) return;
    setIsUnlinking(true);

    try {
      const target = batchToUnlink;
      const updated = linkedBatches.filter((b) => {
        if (target.id && b.id && b.id === target.id) return false;
        if (target.batchKey && b.batchKey && b.batchKey === target.batchKey) return false;
        if (
          target.batchCode &&
          b.batchCode &&
          b.batchCode.trim().toUpperCase() === target.batchCode.trim().toUpperCase()
        ) return false;
        if (target.batchName && b.batchName && b.batchName.trim().toLowerCase() === target.batchName.trim().toLowerCase()) return false;
        return true;
      });

      const partialUpdates: Partial<StudentProfile> = {
        facultyLinkedBatches: updated,
      };

      if (
        profile?.batchKey === target.batchKey ||
        (profile?.batchCode && target.batchCode && profile.batchCode.trim().toUpperCase() === target.batchCode.trim().toUpperCase())
      ) {
        partialUpdates.batchKey = updated.length > 0 ? updated[0].batchKey : '';
        partialUpdates.batchCode = updated.length > 0 ? updated[0].batchCode : '';
      }

      // Authoritative server API call
      if (user?.id) {
        try {
          const res = await fetch('/api/faculty/disconnect-batch', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
              userId: user.id,
              batchKey: target.batchKey,
              batchCode: target.batchCode,
              batchId: target.id,
            }),
          });
          const resData = await res.json().catch(() => ({}));
          if (resData.lastUpdated && typeof window !== 'undefined') {
            window.localStorage.setItem('iiitnr_last_updated', String(resData.lastUpdated));
          }
        } catch (serverErr) {
          console.warn('Server disconnect batch route error, falling back to client write:', serverErr);
        }
      }

      updateProfile(partialUpdates);

      // Direct Firestore write for guaranteed cloud persistence
      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        const now = Date.now();
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('iiitnr_last_updated', now.toString());
        }
        await setDoc(
          userRef,
          {
            profile: sanitizeForFirestore({
              ...profile,
              ...partialUpdates,
            }),
            lastUpdated: now,
          },
          { merge: true }
        ).catch((e) => console.warn('Client setDoc warning:', e));
      }

      showToast('Batch Disconnected', `Unlinked ${target.batchName || 'batch'}.`, 'info');
      setBatchToUnlink(null);
    } catch (err: any) {
      console.error('Failed to unlink batch:', err);
      showToast('Error', err.message || 'Failed to disconnect batch.', 'error');
    } finally {
      setIsUnlinking(false);
    }
  };

  // WhatsApp share invitation handler
  const handleShareWhatsAppInvite = (batch: FacultyLinkedBatch) => {
    const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(batch);
    const code = batch.batchCode || batch.batchKey;
    const msg = `🎓 *Intersemester Faculty Connection*\n\nClass: *${degreeAndBranch}* (${semText})\nBatch Invite Code: *${code}*\n\nStudents can enter this code in the Intersemester app to sync timetable, assignments, and announcements.`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // WhatsApp CR contact handler
  const handleContactCR = (crInfo?: BatchMetaState['crInfo']) => {
    if (!crInfo) return;
    if (crInfo.phone) {
      const cleanPhone = crInfo.phone.replace(/[^0-9]/g, '');
      const msg = `Hello ${crInfo.name || 'CR'}, this is ${profile?.name || 'Faculty'}. Regarding our class schedule and updates.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else if (crInfo.email) {
      window.open(`mailto:${crInfo.email}?subject=Class Updates - ${profile?.name || 'Faculty'}`, '_blank');
    } else {
      showToast('CR Contact', `CR Name: ${crInfo.name || 'Not available'}`, 'info');
    }
  };

  useEffect(() => {
    const open = () => setIsConnectModalOpen(true);
    window.addEventListener('faculty:connect-batch', open);
    return () => window.removeEventListener('faculty:connect-batch', open);
  }, []);

  return (
    <div className="flex flex-col gap-f5 text-left max-w-4xl mx-auto w-full pb-f7">
      <FacultyPageHeader
        eyebrow="Batches"
        title="Your classes"
        description="Every batch you teach, its pilots and its timetable."
        action={
          linkedBatches.length > 0 && (
            <button type="button" onClick={() => setIsConnectModalOpen(true)} className="btn btn-secondary btn-sm">
              <Plus className="w-4 h-4" /> Connect batch
            </button>
          )
        }
      />

      {linkedBatches.length > 0 && (
        <div className="grid grid-cols-3 gap-f2 sm:gap-f3">
          <FacultyStatTile value={totalBatches} label={totalBatches === 1 ? 'Batch' : 'Batches'} tint="indigo" />
          <FacultyStatTile value={totalUniqueSubjects} label={totalUniqueSubjects === 1 ? 'Subject' : 'Subjects'} tint="sky" />
          <FacultyStatTile value={totalWeeklyLectures} label="Lectures / week" tint="amber" />
        </div>
      )}

      {/* Filter and Search Bar */}
      {linkedBatches.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="flex items-center gap-3 px-3.5 h-[44px] rounded-none bg-surface border border-line shadow-xs">
              <Search className="w-4 h-4 text-muted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search degree, branch, semester, or subject..."
                className="w-full bg-transparent text-[14px] text-fg placeholder:text-[#6F6F6F] dark:placeholder:text-[#71717A] focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-[#6B6B6B] hover:text-fg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Programme Pills */}
          {availableProgrammes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedProgrammeFilter('all')}
                className={clsx(
 'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap border',
 selectedProgrammeFilter === 'all'
 ? 'bg-ink text-on-ink border-line-strong shadow-xs'
 : 'bg-transparent text-muted border-line hover:border-black/30 dark:hover:border-white/30'
 )}
              >
                All Batches ({linkedBatches.length})
              </button>
              {availableProgrammes.map((prog) => (
                <button
                  key={prog}
                  type="button"
                  onClick={() => setSelectedProgrammeFilter(prog)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border',
                    selectedProgrammeFilter === prog
                      ? 'bg-ink text-on-ink border-line-strong shadow-xs'
                      : 'bg-transparent text-muted border-line hover:border-black/30 dark:hover:border-white/30'
                  )}
                >
                  {prog}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batches Cards Grid */}
      {linkedBatches.length === 0 ? (
        <FacultyNoBatches
          onConnect={() => setIsConnectModalOpen(true)}
          title="No batches yet"
          body="Ask a class's batch pilot for its 6-character code, then pick the subjects you teach there."
          note="Your students are waiting!"
        />
      ) : filteredBatches.length === 0 ? (
        // Empty Search Results
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-none border border-line bg-black/[0.01] dark:bg-white/[0.01]">
          <Search className="w-6 h-6 text-muted mb-2" />
          <p className="text-sm font-semibold text-fg">No matching batches found</p>
          <p className="text-xs text-muted mt-0.5">Try clearing your search query or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-f4">
          {filteredBatches.map((batch) => {
            const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(batch);
            const meta = batchesMeta[batch.batchKey] || {};
            const code = batch.batchCode || batch.batchKey;
            const isCopied = copiedCodeBatchId === (batch.id || batch.batchKey);
            const crInfo = meta.crInfo;
            const studentCount = meta.studentCount;

            // Calculate weekly lectures taught by this faculty in this batch
            const rawTimetable = meta.docData?.timetable;
            let batchLectureCount = 0;
            if (Array.isArray(rawTimetable)) {
              const selectedIds = batch.selectedSubjectIds || [];
              const selectedNames = (batch.selectedSubjectNames || []).map((n) => n.trim().toLowerCase());
              rawTimetable.forEach((s: ClassSession) => {
                const matchId = Boolean(s.subjectId && selectedIds.includes(s.subjectId));
                const sName = (s.subjectName || (s as any).subject || '').trim().toLowerCase();
                const matchName = Boolean(sName && selectedNames.includes(sName));
                if (matchId || matchName) batchLectureCount++;
              });
            }

            const subjects = batch.selectedSubjectNames || [];
            const collegeShort = batch.college ? getShortCollegeName(batch.college) : '';
            const facts = [
              { k: 'Students', v: typeof studentCount === 'number' ? studentCount : '—' },
              { k: 'Lectures / wk', v: batchLectureCount },
              { k: subjects.length === 1 ? 'Subject' : 'Subjects', v: subjects.length },
            ];

            return (
              <article
                key={batch.id || batch.batchKey}
                className="relative flex flex-col border border-line bg-surface"
              >
                {/* Identity */}
                <div className="flex items-start justify-between gap-3 pl-f4 pr-f3 pt-f4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-muted truncate">
                      {[collegeShort, semText].filter(Boolean).join(' · ')}
                    </p>
                    <h3 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-fg break-words">
                      {degreeAndBranch}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatchToUnlink(batch)}
                    className="-mt-1 w-9 h-9 shrink-0 flex items-center justify-center text-[#8A8A8A] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Disconnect batch" aria-label={`Disconnect ${degreeAndBranch}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Three numbers at a glance */}
                <div className="mt-f4 mx-f4 grid grid-cols-3 border-y border-line-soft divide-x divide-line-soft">
                  {facts.map((f) => (
                    <div key={f.k} className="py-f3 px-2 first:pl-0">
                      <p className="text-[22px] font-semibold leading-none tabular-nums text-fg">{f.v}</p>
                      <p className="mt-1 text-[12px] text-muted">{f.k}</p>
                    </div>
                  ))}
                </div>

                {/* What you teach here */}
                <div className="px-f4 pt-f4">
                  <p className="text-[12px] font-medium text-muted">You teach</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {subjects.length === 0 ? (
                      <span className="text-[13px] text-muted">No subjects picked yet</span>
                    ) : (
                      subjects.map((subjName, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[13px] font-medium border border-line text-fg"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getSubjectCardTheme({ subjectName: subjName }).accent }} />
                          {subjName}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Join code: copy or send */}
                <div className="mx-f4 mt-f4 flex items-center justify-between gap-3 px-f3 py-2.5 bg-surface-2 border border-line-soft">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted">Join code</p>
                    <p className="text-[18px] font-mono font-semibold tracking-[3px] text-fg select-all">{code}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyBatchCode(batch)}
                      className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                      aria-label={`Copy code ${code}`} title="Copy code"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsAppInvite(batch)}
                      className="w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                      aria-label="Share code" title="Share code"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Batch pilot */}
                {crInfo?.name && (
                  <div className="mx-f4 mt-f3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-ink text-on-ink text-[13px] font-semibold">
                        {crInfo.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-fg truncate">{crInfo.name}</span>
                        <span className="block text-[12px] text-muted">Batch pilot</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleContactCR(crInfo)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-300/70 dark:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" /> Chat
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-f4 grid grid-cols-2 gap-2 p-f4">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchForTimetable(batch)}
                    className="btn btn-secondary"
                  >
                    <CalendarDays className="w-4 h-4" /> Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateAssignmentOpen(true)}
                    className="btn btn-primary"
                  >
                    <CheckSquare className="w-4 h-4" /> Post assignment
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Batch Weekly Timetable Inspector Modal */}
      {selectedBatchForTimetable && (
        <Modal
          isOpen={!!selectedBatchForTimetable}
          onClose={() => setSelectedBatchForTimetable(null)}
          title={`Batch Schedule · ${formatFacultyBatchDegreeAndBranch(selectedBatchForTimetable).degreeAndBranch}`}
          maxWidth="lg"
        >
          <div className="flex flex-col gap-4">
            {/* Day Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-line pb-2">
              {DAYS_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setTimetableModalDay(day)}
                  className={clsx(
                    'px-3 py-1.5 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border',
                    timetableModalDay === day
                      ? 'bg-ink text-on-ink border-line-strong shadow-xs'
                      : 'bg-transparent text-muted border-line hover:border-black/30 dark:hover:border-white/30'
                  )}
                >
                  {day.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>

            {/* Timetable Sessions List for Selected Day */}
            {(() => {
              const meta = batchesMeta[selectedBatchForTimetable.batchKey] || {};
              const rawTimetable = meta.docData?.timetable;
              const daySessions: ClassSession[] = Array.isArray(rawTimetable)
                ? rawTimetable.filter((s: ClassSession) => s.day === timetableModalDay)
                : [];

              daySessions.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

              const selectedIds = selectedBatchForTimetable.selectedSubjectIds || [];
              const selectedNames = (selectedBatchForTimetable.selectedSubjectNames || []).map((n) =>
                n.trim().toLowerCase()
              );

              if (daySessions.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-muted italic">
                    No classes scheduled for {timetableModalDay} in this batch.
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {daySessions.map((s, idx) => {
                    const sName = (s.subjectName || (s as any).subject || '').trim().toLowerCase();
                    const isYourClass =
                      Boolean(s.subjectId && selectedIds.includes(s.subjectId)) ||
                      Boolean(sName && selectedNames.includes(sName));

                    return (
                      <div
                        key={idx}
                        className={clsx(
                          'p-3 rounded-[3px] border flex items-center justify-between gap-3 flex-wrap transition-colors',
                          isYourClass
                            ? 'border-emerald-500/30 bg-emerald-500/[0.04] dark:border-emerald-500/40'
                            : 'border-line bg-black/[0.01] dark:bg-white/[0.01]'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Time Slot */}
                          <div className="font-mono text-xs font-bold text-fg-2 min-w-[90px]">
                            {s.startTime} - {s.endTime}
                          </div>

                          {/* Subject details */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-fg">
                                {s.subjectName || (s as any).subject || s.subjectId || 'Session'}
                              </span>
                              {isYourClass && (
                                <span className="px-1.5 py-0.2 rounded-none text-[12px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ">
                                  Your Lecture
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted">
                              Room: {s.room || 'TBA'} {s.faculty ? `· Prof. ${s.faculty}` : ''}
                            </span>
                          </div>
                        </div>

                        {s.isLab && (
                          <span className="px-2 py-0.5 rounded-none text-[12px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 ">
                            LAB
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Disconnect Batch Confirmation Modal */}
      {batchToUnlink && (
        <Modal
          isOpen={!!batchToUnlink}
          onClose={() => setBatchToUnlink(null)}
          title="Disconnect Batch"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 rounded-none bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>
                Are you sure you want to unlink{' '}
                <strong>{formatFacultyBatchDegreeAndBranch(batchToUnlink).degreeAndBranch}</strong>?
                This will remove its classes from your aggregated teaching timetable and assignments hub.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchToUnlink(null)}
                disabled={isUnlinking}
                className="px-4 h-9 rounded-none border border-line text-[13px] font-semibold text-fg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={isUnlinking}
                className="px-4 h-9 rounded-none bg-rose-600 text-white font-semibold text-[13px] hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {isUnlinking ? 'Disconnecting...' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Connect Batch Modal */}
      <ConnectBatchModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
      />

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isCreateAssignmentOpen}
        onClose={() => setIsCreateAssignmentOpen(false)}
      />
    </div>
  );
};
