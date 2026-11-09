'use client';

import { Illustration } from '@/components/ui/Illustration';
import React, { useState } from 'react';
import { useApp, sanitizeForFirestore } from '@/context/AppContext';
import { FacultyLinkedBatch, StudentProfile } from '@/lib/types';
import { Users, Plus, Trash2, Copy, Check } from '@/components/ui/icons';
import { formatFacultyBatchDegreeAndBranch } from '@/lib/facultyUtils';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuthHeaders } from '@/lib/authHeaders';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
    <section className="flex flex-col gap-f3 text-left">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <h3 className="text-[17px] font-semibold text-fg leading-tight">Batches</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {linkedBatches.length ? `${linkedBatches.length} linked · tap a code to copy` : 'Link the classes you teach'}
          </p>
        </div>
        {linkedBatches.length > 0 && (
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg underline-offset-4 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Connect batch
          </button>
        )}
      </div>

      {linkedBatches.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-f5 border border-dashed border-line">
          <Illustration name="setup" className="h-[120px] w-auto" />
          <p className="mt-f3 text-[15px] font-semibold text-fg">No batches yet</p>
          <p className="mt-1 text-[14px] text-muted max-w-[280px]">Enter a batch code from the class&apos;s batch pilot.</p>
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="btn btn-primary mt-f4"
          >
            <Plus className="w-4 h-4" /> Connect a batch
          </button>
        </div>
      ) : (
        <ul className="border border-line bg-surface divide-y divide-line-soft">
          {linkedBatches.map((batch, idx) => {
            const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(batch);
            const code = batch.batchCode || batch.batchKey;
            const isCopied = copiedCode === code;
            const subjects = batch.selectedSubjectNames || [];
            return (
              <li key={batch.id || batch.batchKey || batch.batchCode || `batch_${idx}`} className="relative flex items-start gap-f3 pl-f4 pr-2 py-f3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-fg leading-snug">{degreeAndBranch}</p>
                  <div className="mt-0.5 flex items-center flex-wrap gap-x-2 text-[13px] text-muted">
                    {semText && <span>{semText}</span>}
                    {code && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(code)}
                        className="inline-flex items-center gap-1 font-mono font-semibold tracking-[1.5px] text-fg hover:underline underline-offset-2 cursor-pointer"
                        aria-label={`Copy batch code ${code}`}
                      >
                        {code}
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                      </button>
                    )}
                  </div>
                  {subjects.length > 0 && (
                    <p className="mt-1.5 text-[13px] text-muted truncate">
                      You teach <span className="text-fg">{subjects.join(', ')}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setBatchToUnlink(batch)}
                  className="w-9 h-9 shrink-0 flex items-center justify-center text-[#8A8A8A] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                  aria-label={`Disconnect ${degreeAndBranch}`}
                  title="Disconnect batch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!batchToUnlink}
        onClose={() => setBatchToUnlink(null)}
        onConfirm={handleConfirmUnlink}
        title="Disconnect this batch?"
        description="It leaves your timetable and you stop posting to it. Students' timetables aren't affected."
        highlightText={batchToUnlink ? formatFacultyBatchDegreeAndBranch(batchToUnlink).degreeAndBranch : undefined}
        confirmLabel="Disconnect"
        cancelLabel="Keep it"
        variant="danger"
        isLoading={isUnlinking}
      />
    </section>
  );
};
