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
    <div className="flex flex-col gap-5 text-left max-w-4xl mx-auto w-full pb-32 sm:pb-24">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4 pt-2 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 rounded-[3px]">
                FACULTY HUB · CONNECTED BATCHES
              </span>
              <span className="text-[12px] font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                {linkedBatches.length} {linkedBatches.length === 1 ? 'batch' : 'batches'} connected
              </span>
            </div>
            <h2 className="text-[32px] sm:text-[36px] font-normal text-[#111111] dark:text-[#FFFFFF] tracking-tight leading-[38px] sm:leading-[42px]">
              Batches & Classes
            </h2>
            <p className="text-[14px] font-normal text-[#6B6B6B] dark:text-[#A1A1AA] leading-[20px] mt-1.5">
              Manage student batches, view class representatives & inspect batch schedules.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#111111] text-white dark:bg-white dark:text-[#111111] hover:opacity-90 transition-opacity text-[13px] font-semibold cursor-pointer shadow-xs rounded-[3px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Connect Batch</span>
            </button>
          </div>
        </div>

        {/* 3-Column Brutalist Metric Divider Grid */}
        <div className="grid grid-cols-3 gap-0 py-4 border-y border-black/10 dark:border-white/[0.08] relative">
          <div className="absolute left-1/3 top-[15%] bottom-[15%] w-px bg-black/10 dark:bg-white/[0.08]" />
          <div className="absolute left-[66.666%] top-[15%] bottom-[15%] w-px bg-black/10 dark:bg-white/[0.08]" />

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[28px] sm:text-[32px] font-medium text-black dark:text-[#F4F4F6] tracking-tighter leading-none mb-1">
              {totalBatches}
            </span>
            <span className="text-[12px] sm:text-[13px] font-medium text-black/60 dark:text-[#A1A1AA] leading-tight">
              Batches
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[28px] sm:text-[32px] font-medium text-black dark:text-[#F4F4F6] tracking-tighter leading-none mb-1">
              {totalUniqueSubjects}
            </span>
            <span className="text-[12px] sm:text-[13px] font-medium text-black/60 dark:text-[#A1A1AA] leading-tight">
              Subjects
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[28px] sm:text-[32px] font-medium text-black dark:text-[#F4F4F6] tracking-tighter leading-none mb-1">
              {totalWeeklyLectures}
            </span>
            <span className="text-[12px] sm:text-[13px] font-medium text-black/60 dark:text-[#A1A1AA] leading-tight">
              Lectures / wk
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {linkedBatches.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="flex items-center gap-3 px-3.5 h-[44px] rounded-[3px] bg-white dark:bg-[#121317] border border-[#D9D9D6] dark:border-white/[0.08] shadow-xs">
              <Search className="w-4 h-4 text-[#6F6F6F] dark:text-[#94A3B8] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search degree, branch, semester, or subject..."
                className="w-full bg-transparent text-[14px] text-[#111111] dark:text-[#F4F4F6] placeholder:text-[#6F6F6F] dark:placeholder:text-[#64748B] focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors"
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
                  'px-3.5 py-1.5 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border',
                  selectedProgrammeFilter === 'all'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                    : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
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
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
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
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[4px] border border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="w-12 h-12 rounded-[4px] bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/50 dark:text-white/50 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">No Batches Connected</h2>
          <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 max-w-md mt-1 mb-5">
            You haven&apos;t connected to any student batches yet. Enter a 6-digit batch code from the Batch CR to sync
            your timetable, students, and assignment broadcasts.
          </p>
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="h-9 px-4 rounded-[3px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Your First Batch</span>
          </button>
        </div>
      ) : filteredBatches.length === 0 ? (
        // Empty Search Results
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-[4px] border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          <Search className="w-6 h-6 text-black/30 dark:text-white/30 mb-2" />
          <p className="text-sm font-semibold text-black dark:text-white">No matching batches found</p>
          <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">Try clearing your search query or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                className="flex flex-col justify-between p-5 sm:p-6 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121317] hover:border-black/25 dark:hover:border-white/20 transition-all shadow-xs gap-5"
              >
                <div className="flex flex-col gap-4">
                  {/* Card Header: Degree & Branch Title, Subtitle Meta, Code Chip & Disconnect */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[17px] sm:text-[18px] font-bold text-black dark:text-white tracking-tight leading-snug">
                        {degreeAndBranch}
                      </h3>
                      <p className="text-[12px] font-mono text-black/55 dark:text-white/55 flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                        <span>{semText}</span>
                        <span className="text-black/30 dark:text-white/30">·</span>
                        {typeof studentCount === 'number' && (
                          <>
                            <span>{studentCount} Students</span>
                            <span className="text-black/30 dark:text-white/30">·</span>
                          </>
                        )}
                        <span>{batchLectureCount} lecs/wk</span>
                      </p>
                      {batch.college && (
                        <p className="text-[11.5px] text-black/40 dark:text-white/40 truncate max-w-[280px] mt-0.5">
                          {batch.college}
                        </p>
                      )}
                    </div>

                    {/* Code chip & Disconnect */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyBatchCode(batch)}
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-[5px] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/10 text-black/75 dark:text-white/75 border border-black/[0.06] dark:border-white/[0.08] transition-colors cursor-pointer"
                        title="Copy invite code"
                      >
                        <span className="text-black/40 dark:text-white/40 text-[10px] uppercase font-semibold">Code:</span>
                        <span className="font-bold">{code}</span>
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-45" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBatchToUnlink(batch)}
                        className="p-1.5 rounded-[5px] text-black/30 dark:text-white/30 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                        title="Disconnect Batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subjects Section */}
                  <div className="flex flex-col gap-2">
                    <div className="text-[10.5px] font-mono font-medium uppercase tracking-wider text-black/45 dark:text-white/45 flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 opacity-70" />
                      <span>Subjects You Teach ({(batch.selectedSubjectNames || []).length})</span>
                    </div>

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
                              className="px-2.5 py-1 rounded-[5px] text-[12px] font-medium border flex items-center gap-1.5 bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.08] text-black/85 dark:text-white/85"
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.accent }} />
                              <span>{subjName}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Class Representative Info */}
                  {crInfo?.name && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-[6px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-[9.5px] font-bold font-mono flex items-center justify-center text-black/70 dark:text-white/70 shrink-0">
                          {crInfo.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[12px] text-black/60 dark:text-white/60 truncate">
                          CR: <span className="font-medium text-black dark:text-white">{crInfo.name}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleContactCR(crInfo)}
                        className="inline-flex items-center gap-1 text-[11.5px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2 cursor-pointer font-medium"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Chat CR</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3.5 border-t border-black/[0.06] dark:border-white/[0.06] mt-auto">
                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppInvite(batch)}
                    className="h-8 px-2.5 rounded-[5px] text-[11.5px] font-mono text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Share Batch Code to WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Code</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForTimetable(batch)}
                      className="h-8 px-3 rounded-[5px] text-xs font-mono font-medium text-black/80 dark:text-white/80 border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Schedule</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCreateAssignmentOpen(true)}
                      className="h-8 px-3 rounded-[5px] text-xs font-mono font-medium bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
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
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-black/10 dark:border-white/10 pb-2">
              {DAYS_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setTimetableModalDay(day)}
                  className={clsx(
                    'px-3 py-1.5 rounded-[3px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border',
                    timetableModalDay === day
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-xs'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
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
                          'p-3 rounded-[3px] border flex items-center justify-between gap-3 flex-wrap transition-colors',
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
                                <span className="px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase">
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
                          <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 uppercase">
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
            <div className="flex items-center gap-3 p-3 rounded-[3px] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs sm:text-sm">
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
                className="px-4 py-2 rounded-[3px] border border-black/15 dark:border-white/15 text-xs font-semibold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={isUnlinking}
                className="px-4 py-2 rounded-[3px] bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors cursor-pointer"
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
