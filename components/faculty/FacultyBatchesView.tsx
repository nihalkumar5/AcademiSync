'use client';

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
} from 'lucide-react';
import { formatFacultyBatchDegreeAndBranch, isCommonSubject } from '@/lib/facultyUtils';
import { getSubjectCardTheme } from '@/lib/cardColors';
import { doc, onSnapshot, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('profile.batchKey', '==', batch.batchKey));
        const snap = await getDocs(q);

        if (!isMounted) return;

        let crUser: any = null;
        let count = 0;

        snap.forEach((d) => {
          count++;
          const uData = d.data();
          const uProf = uData?.profile;
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
            headers: { 'Content-Type': 'application/json' },
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
    const msg = `🎓 *AcademiSync Faculty Connection*\n\nClass: *${degreeAndBranch}* (${semText})\nBatch Invite Code: *${code}*\n\nStudents can enter this code in the AcademiSync app to sync timetable, assignments, and announcements.`;
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

  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-x-hidden pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono text-emerald-600 dark:text-emerald-400">
                Faculty Hub · Connected Batches
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight mt-1">
              Batches & Classes
            </h1>
            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 mt-0.5">
              Manage student batches, view class representatives & inspect batch schedules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Batch</span>
            </button>
          </div>
        </div>

        {/* Quick Metric Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1">
          <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 block font-bold">
              Connected Batches
            </span>
            <span className="text-lg sm:text-2xl font-black text-black dark:text-white tracking-tight mt-0.5 block">
              {totalBatches}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 block font-bold">
              Subjects Taught
            </span>
            <span className="text-lg sm:text-2xl font-black text-black dark:text-white tracking-tight mt-0.5 block">
              {totalUniqueSubjects}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 block font-bold">
              Weekly Lectures
            </span>
            <span className="text-lg sm:text-2xl font-black text-black dark:text-white tracking-tight mt-0.5 block">
              {totalWeeklyLectures}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {linkedBatches.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-black/40 dark:text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by degree, branch, semester, or subject..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#111215] text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Programme Pills */}
          {availableProgrammes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedProgrammeFilter('all')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  selectedProgrammeFilter === 'all'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
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
                    'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                    selectedProgrammeFilter === prog
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10'
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
        // Empty State: 0 Batches
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/50 dark:text-white/50 mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">No Batches Connected</h2>
          <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 max-w-md mt-1 mb-5">
            You haven&apos;t connected to any student batches yet. Enter a 6-digit batch code from the Batch CR to sync
            your timetable, students, and assignment broadcasts.
          </p>
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Your First Batch</span>
          </button>
        </div>
      ) : filteredBatches.length === 0 ? (
        // Empty Search Results
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          <Search className="w-6 h-6 text-black/30 dark:text-white/30 mb-2" />
          <p className="text-sm font-semibold text-black dark:text-white">No matching batches found</p>
          <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">Try clearing your search query or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

            return (
              <div
                key={batch.id || batch.batchKey}
                className="flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#111215] hover:border-black/20 dark:hover:border-white/20 transition-all shadow-xs"
              >
                <div className="flex flex-col gap-3.5">
                  {/* Card Header: Degree badge, Sem, Section & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Uniform Degree & Branch Tag */}
                      <span className="px-2.5 py-1 rounded-[6px] text-xs font-mono font-black uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black">
                        {degreeAndBranch}
                      </span>

                      {/* Semester Tag */}
                      <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-bold bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                        {semText}
                      </span>

                      {/* Section Tag */}
                      {batch.section && (
                        <span className="px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-bold bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70">
                          SEC {batch.section}
                        </span>
                      )}
                    </div>

                    {/* Batch Disconnect Button */}
                    <button
                      type="button"
                      onClick={() => setBatchToUnlink(batch)}
                      className="p-1.5 rounded-[6px] text-black/40 dark:text-white/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Disconnect Batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Batch Code & College Info */}
                  <div className="flex items-center justify-between text-xs text-black/60 dark:text-white/60 flex-wrap gap-2 pt-0.5">
                    <span className="font-medium truncate max-w-[220px]">
                      {batch.college || 'College Campus'}
                    </span>

                    {/* Code chip with copy */}
                    <button
                      type="button"
                      onClick={() => handleCopyBatchCode(batch)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white transition-colors cursor-pointer"
                      title="Click to copy batch invite code"
                    >
                      <span className="text-black/50 dark:text-white/50">Code:</span>
                      <span className="font-bold">{code}</span>
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-60" />
                      )}
                    </button>
                  </div>

                  {/* Subjects You Teach in this Batch */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/40 dark:text-white/40 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Subjects You Teach ({(batch.selectedSubjectNames || []).length})</span>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(batch.selectedSubjectNames || []).length === 0 ? (
                        <span className="text-xs text-black/40 dark:text-white/40 italic">
                          No subjects linked. Connect to add subjects.
                        </span>
                      ) : (
                        batch.selectedSubjectNames.map((subjName, idx) => {
                          const theme = getSubjectCardTheme({ subjectName: subjName });
                          return (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-[6px] text-xs font-semibold border flex items-center gap-1.5 shadow-2xs"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.border,
                                color: theme.badgeText,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                              <span>{subjName}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Class Representative & Stats Box */}
                  <div className="p-3 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between gap-3 flex-wrap">
                    {/* CR details */}
                    <div className="flex items-center gap-2.5 min-w-[150px]">
                      <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-bold text-xs text-black dark:text-white font-mono shrink-0">
                        {crInfo?.name ? crInfo.name.slice(0, 2).toUpperCase() : 'CR'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-black dark:text-white truncate max-w-[140px]">
                          {crInfo?.name || 'Class Representative'}
                        </span>
                        <span className="text-[10px] text-black/50 dark:text-white/50 font-mono">
                          {crInfo?.email || 'Batch Lead'}
                        </span>
                      </div>
                    </div>

                    {/* Stats pill */}
                    <div className="flex items-center gap-2 font-mono text-[11px] text-black/70 dark:text-white/70">
                      {typeof studentCount === 'number' && (
                        <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-semibold">
                          {studentCount} Students
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 font-semibold">
                        {batchLectureCount} lecs/wk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3.5 border-t border-black/10 dark:border-white/10 mt-3.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {/* Contact CR via WhatsApp / Email */}
                    <button
                      type="button"
                      onClick={() => handleContactCR(crInfo)}
                      className="px-2.5 py-1.5 rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-black/80 dark:text-white/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Contact Class Representative"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Contact CR</span>
                    </button>

                    {/* Share Invitation Code to WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsAppInvite(batch)}
                      className="p-1.5 rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-black/70 dark:text-white/70 transition-colors cursor-pointer"
                      title="Share Batch Code to WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Schedule Modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForTimetable(batch)}
                      className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-black dark:text-white border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Schedule</span>
                    </button>

                    {/* Broadcast Assignment */}
                    <button
                      type="button"
                      onClick={() => setIsCreateAssignmentOpen(true)}
                      className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Post Task</span>
                    </button>
                  </div>
                </div>
              </div>
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
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-black/10 dark:border-white/10 pb-2">
              {DAYS_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setTimetableModalDay(day)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap',
                    timetableModalDay === day
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
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
                  <div className="p-8 text-center text-xs text-black/50 dark:text-white/50 italic">
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
                          'p-3 rounded-lg border flex items-center justify-between gap-3 flex-wrap transition-colors',
                          isYourClass
                            ? 'border-emerald-500/30 bg-emerald-500/[0.04] dark:border-emerald-500/40'
                            : 'border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Time Slot */}
                          <div className="font-mono text-xs font-bold text-black/70 dark:text-white/70 min-w-[90px]">
                            {s.startTime} - {s.endTime}
                          </div>

                          {/* Subject details */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-black dark:text-white">
                                {s.subjectName || (s as any).subject || s.subjectId || 'Session'}
                              </span>
                              {isYourClass && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase">
                                  Your Lecture
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-black/50 dark:text-white/50">
                              Room: {s.room || 'TBA'} {s.faculty ? `· Prof. ${s.faculty}` : ''}
                            </span>
                          </div>
                        </div>

                        {s.isLab && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 uppercase">
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs sm:text-sm">
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
                className="px-4 py-2 rounded-lg border border-black/15 dark:border-white/15 text-xs font-semibold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={isUnlinking}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
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
