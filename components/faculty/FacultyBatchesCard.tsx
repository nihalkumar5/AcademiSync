'use client';

import React, { useState } from 'react';
import { useApp, sanitizeForFirestore } from '@/context/AppContext';
import { FacultyLinkedBatch, StudentProfile } from '@/lib/types';
import { Users, Plus, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import { formatFacultyBatchDegreeAndBranch, isCommonSubject } from '@/lib/facultyUtils';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FacultyBatchesCardProps {
  onOpenConnectModal: () => void;
}

export const FacultyBatchesCard: React.FC<FacultyBatchesCardProps> = ({
  onOpenConnectModal,
}) => {
  const { profile, updateProfile, showToast, user } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];
  const [batchToUnlink, setBatchToUnlink] = useState<FacultyLinkedBatch | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleConfirmUnlink = async () => {
    if (!batchToUnlink) return;
    setIsUnlinking(true);

    try {
      const target = batchToUnlink;
      const updated = linkedBatches.filter((b) => {
        // Exclude matching batch by id, batchKey, batchCode, or batchName
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

      // Also clean up primary batchKey/batchCode if it matched the unlinked batch
      if (
        profile.batchKey === target.batchKey ||
        (profile.batchCode && target.batchCode && profile.batchCode.trim().toUpperCase() === target.batchCode.trim().toUpperCase())
      ) {
        partialUpdates.batchKey = updated.length > 0 ? updated[0].batchKey : '';
        partialUpdates.batchCode = updated.length > 0 ? updated[0].batchCode : '';
      }

      updateProfile(partialUpdates);

      // Explicit direct Firestore write to guarantee cloud persistence
      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        const now = Date.now();
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('iiitnr_last_updated', now.toString());
        }
        await setDoc(userRef, {
          profile: sanitizeForFirestore({
            ...profile,
            ...partialUpdates,
          }),
          lastUpdated: now,
        }, { merge: true });
      }

      showToast('Batch Disconnected', `Unlinked ${target.batchName}.`, 'info');
      setBatchToUnlink(null);
    } catch (err: any) {
      console.error('Failed to unlink batch:', err);
      showToast('Error', err.message || 'Failed to disconnect batch.', 'error');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#13151D] border border-black/[0.06] dark:border-white/[0.08] rounded-[12px] p-5 sm:p-6 text-left flex flex-col gap-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#111111] dark:text-white" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
            Connected Batches
          </h3>
          <span className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
            ({linkedBatches.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenConnectModal}
          className="px-3.5 py-1.5 rounded-[8px] border border-black/15 dark:border-white/15 bg-transparent text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Batch</span>
        </button>
      </div>

      {/* Batches List */}
      <div className="flex flex-col gap-3.5">
        {linkedBatches.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6F6F6F] dark:text-[#A1A1AA] flex flex-col items-center justify-center gap-2.5">
            <Users className="w-8 h-8 opacity-30" />
            <span>You have not connected to any batches yet.</span>
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="mt-2 px-4 py-2 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
            >
              Enter First Batch Code
            </button>
          </div>
        ) : (
          linkedBatches.map((batch, idx) => {
            const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(batch);
            return (
              <div
                key={batch.id || batch.batchKey || batch.batchCode || `batch_${idx}`}
                className="p-4 rounded-[12px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F9F9FB] dark:bg-[#181A22] flex flex-col gap-3 transition-all hover:border-black/20 dark:hover:border-white/20 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-black dark:text-white">
                        {degreeAndBranch}
                      </span>
                      {semText && (
                        <span className="px-2 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 text-[10px] font-mono font-bold uppercase text-black/70 dark:text-white/70">
                          {semText}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-[4px] bg-black/5 dark:bg-white/10 text-[10px] font-mono font-bold uppercase text-black/70 dark:text-white/70">
                        CODE: {batch.batchCode}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBatchToUnlink(batch)}
                    className="p-1.5 rounded-[6px] text-black/40 hover:text-red-500 hover:bg-red-500/10 dark:text-white/40 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title="Disconnect Batch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              {/* Taught Subjects Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <span className="text-[10px] uppercase font-bold text-[#6F6F6F] dark:text-[#A1A1AA] flex items-center gap-1 mr-1">
                  <BookOpen className="w-3 h-3" />
                  Teaching:
                </span>
                {batch.selectedSubjectNames.map((name, idx) => {
                  const isMultiBatch = linkedBatches.filter((b) =>
                    (b.selectedSubjectNames || []).some((s) => isCommonSubject(s, [name]))
                  ).length > 1;

                  return (
                    <span
                      key={`${name}_${idx}`}
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium shadow-2xs flex items-center gap-1 ${
                        isMultiBatch
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                          : 'bg-white dark:bg-white/10 border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white'
                      }`}
                    >
                      {isMultiBatch && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">★</span>
                      )}
                      <span>{name}</span>
                      {isMultiBatch && (
                        <span className="text-[9.5px] font-mono opacity-65">
                          (Common)
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Disconnect Confirmation Alert */}
      {batchToUnlink && (
        <div className="p-4 rounded-[12px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex flex-col gap-2.5 mt-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Disconnect from {formatFacultyBatchDegreeAndBranch(batchToUnlink).degreeAndBranch}?</span>
          </div>
          <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
            This will remove this batch from your schedule. Students&apos; timetables will not be deleted.
          </p>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setBatchToUnlink(null)}
              className="px-3.5 py-1.5 rounded-[8px] text-xs font-bold uppercase text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUnlink}
              disabled={isUnlinking}
              className="px-4 py-1.5 rounded-[8px] bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isUnlinking ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

