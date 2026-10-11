'use client';

import React, { useState } from 'react';
import { useApp, sanitizeForFirestore } from '@/context/AppContext';
import { FacultyLinkedBatch, StudentProfile } from '@/lib/types';
import { Users, Plus, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FacultyBatchesCardProps {
  onOpenConnectModal: () => void;
}

export const FacultyBatchesCard: React.FC<FacultyBatchesCardProps> = ({
  onOpenConnectModal,
}) => {
  const { profile, updateProfile, showToast, user } = useApp();
  const linkedBatches = profile?.facultyLinkedBatches || [];
  const [batchToUnlink, setBatchToUnlink] = useState<FacultyLinkedBatch | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showToast('Copied', `Batch code ${code} copied.`, 'success');
      setTimeout(() => setCopiedCode(null), 1800);
    }
  };

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

      // Call authoritative server route to disconnect batch in Firestore
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
        }, { merge: true }).catch((e) => console.warn('Client setDoc warning:', e));
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

  return (
    <div className="w-full bg-white dark:bg-[#111215] border border-black/10 dark:border-white/10 rounded-2xl p-4 sm:p-5 text-left flex flex-col gap-4 shadow-2xs">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
            Connected Batches
          </h3>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60">
            {linkedBatches.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenConnectModal}
          className="px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-85 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Batch</span>
        </button>
      </div>

      {/* Batches List */}
      <div className="flex flex-col gap-3">
        {linkedBatches.length === 0 ? (
          <div className="py-8 text-center text-xs text-black/50 dark:text-white/50 flex flex-col items-center justify-center gap-2">
            <Users className="w-7 h-7 opacity-30" />
            <span>No batches linked yet. Connect your first batch code.</span>
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="mt-1 px-3.5 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer shadow-2xs"
            >
              Enter Batch Code
            </button>
          </div>
        ) : (
          linkedBatches.map((batch, idx) => {
            const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(batch);
            const code = batch.batchCode || batch.batchKey;
            const isCopied = copiedCode === code;

            return (
              <div
                key={batch.id || batch.batchKey || batch.batchCode || `batch_${idx}`}
                className="p-3.5 sm:p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02] flex flex-col gap-2.5 transition-all hover:border-black/20 dark:hover:border-white/20 shadow-2xs"
              >
                {/* Header Row: Title badge, Sem & Code, Trash */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Uniform Degree & Branch Badge */}
                    <span className="px-2 py-0.5 rounded-[5px] text-xs font-mono font-black uppercase tracking-wider bg-black text-white dark:bg-white dark:text-black">
                      {degreeAndBranch}
                    </span>

                    {/* Semester & Section */}
                    {semText && (
                      <span className="text-[11px] font-mono font-semibold text-black/60 dark:text-white/60">
                        {semText}
                      </span>
                    )}

                    {/* Copyable Code */}
                    {code && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(code)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                        title="Click to copy batch code"
                      >
                        <span>· Code:</span>
                        <span className="font-bold underline decoration-dotted">{code}</span>
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Disconnect Icon */}
                  <button
                    type="button"
                    onClick={() => setBatchToUnlink(batch)}
                    className="p-1 rounded-md text-black/30 dark:text-white/30 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                    title="Disconnect Batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Minimal Subjects Row */}
                {(batch.selectedSubjectNames || []).length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {batch.selectedSubjectNames.map((name, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-black/80 dark:text-white/80"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/30" />
                        <span>{name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Disconnect Confirmation Alert */}
      {batchToUnlink && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Disconnect from {formatFacultyBatchDegreeAndBranch(batchToUnlink).degreeAndBranch}?</span>
          </div>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
            This unlinks this batch from your schedule. Students&apos; timetables remain intact.
          </p>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setBatchToUnlink(null)}
              className="px-3 py-1 rounded-md text-xs font-semibold text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUnlink}
              disabled={isUnlinking}
              className="px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isUnlinking ? 'Disconnecting...' : 'Yes, Disconnect'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
