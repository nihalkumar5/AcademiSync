'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FacultyLinkedBatch } from '@/lib/types';
import { Users, Plus, Trash2, Building2, BookOpen, AlertCircle } from 'lucide-react';
import { getShortCollegeName } from '@/lib/timetableUtils';

interface FacultyBatchesCardProps {
  onOpenConnectModal: () => void;
}

export const FacultyBatchesCard: React.FC<FacultyBatchesCardProps> = ({
  onOpenConnectModal,
}) => {
  const { profile, updateProfile, showToast } = useApp();
  const linkedBatches = profile.facultyLinkedBatches || [];
  const [batchToUnlink, setBatchToUnlink] = useState<FacultyLinkedBatch | null>(null);

  const handleConfirmUnlink = () => {
    if (!batchToUnlink) return;
    const updated = linkedBatches.filter((b) => b.id !== batchToUnlink.id);
    updateProfile({ facultyLinkedBatches: updated });
    showToast('Batch Disconnected', `Unlinked ${batchToUnlink.batchName}.`, 'info');
    setBatchToUnlink(null);
  };

  return (
    <div className="border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#121317] p-5 text-left flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-black/70 dark:text-white/70" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
            Connected Batches
          </h3>
          <span className="text-xs text-black/40 dark:text-white/40">
            ({linkedBatches.length})
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenConnectModal}
          className="px-3 py-1.5 border border-black dark:border-white text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Batch</span>
        </button>
      </div>

      {/* Batches List */}
      <div className="flex flex-col gap-3">
        {linkedBatches.length === 0 ? (
          <div className="py-8 text-center text-xs text-black/50 dark:text-white/50 flex flex-col items-center justify-center gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <span>You have not connected to any batches yet.</span>
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="mt-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer"
            >
              Enter First Batch Code
            </button>
          </div>
        ) : (
          linkedBatches.map((batch) => (
            <div
              key={batch.id}
              className="p-3.5 border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-2.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-black dark:text-white">
                      {batch.batchName}
                    </span>
                    <span className="px-2 py-0.5 bg-black/5 dark:bg-white/5 text-[10px] font-mono uppercase text-black/70 dark:text-white/70">
                      CODE: {batch.batchCode}
                    </span>
                  </div>

                  <span className="text-xs text-black/60 dark:text-white/60 mt-0.5">
                    {getShortCollegeName(batch.college)} · {batch.programme} ({batch.branch})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setBatchToUnlink(batch)}
                  className="p-1.5 text-black/40 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  title="Disconnect Batch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Taught Subjects Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-black/5 dark:border-white/5">
                <span className="text-[10px] uppercase font-bold text-black/50 dark:text-white/50 flex items-center gap-1 mr-1">
                  <BookOpen className="w-3 h-3" />
                  Teaching:
                </span>
                {batch.selectedSubjectNames.map((name, idx) => (
                  <span
                    key={`${name}_${idx}`}
                    className="px-2 py-0.5 bg-black/5 dark:bg-white/10 text-[10.5px] font-mono text-black dark:text-white"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Disconnect Confirmation Alert */}
      {batchToUnlink && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900/50 flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Disconnect from {batchToUnlink.batchName}?</span>
          </div>
          <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
            This will remove this batch from your schedule. Students&apos; timetables will not be deleted.
          </p>
          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setBatchToUnlink(null)}
              className="px-3 py-1 text-xs font-bold uppercase text-black/70 dark:text-white/70 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUnlink}
              className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-700 cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
