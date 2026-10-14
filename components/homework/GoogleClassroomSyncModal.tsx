'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Homework, HomeworkPriority, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  getGoogleClassroomToken,
  syncAllClassroomAssignments,
  FetchedAssignmentItem,
} from '@/lib/googleClassroom';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';

export interface GoogleClassroomSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleClassroomSyncModal: React.FC<GoogleClassroomSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { subjects, homework, addHomework, showToast } = useApp();

  const [step, setStep] = useState<'prompt' | 'syncing' | 'review' | 'success'>('prompt');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fetchedItems, setFetchedItems] = useState<FetchedAssignmentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [importedCount, setImportedCount] = useState(0);

  const resetState = () => {
    setStep('prompt');
    setProgressMsg('');
    setErrorMsg('');
    setFetchedItems([]);
    setSelectedIds({});
    setImportedCount(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const existingExternalIds = new Set(
    homework.filter((h) => h.externalId).map((h) => h.externalId)
  );
  const existingTitles = new Set(homework.map((h) => h.title.trim().toLowerCase()));

  const startSync = async () => {
    setErrorMsg('');
    setStep('syncing');
    setProgressMsg('Authenticating with Google...');

    try {
      const token = await getGoogleClassroomToken();
      const items = await syncAllClassroomAssignments(token, subjects, (msg) => {
        setProgressMsg(msg);
      });

      if (!items.length) {
        setErrorMsg('No active courses or assignments found in this Google Classroom account.');
        setStep('prompt');
        return;
      }

      setFetchedItems(items);

      // Pre-select items that haven't been imported yet
      const initialSelection: Record<string, boolean> = {};
      items.forEach((item) => {
        const isAlreadyAdded =
          existingExternalIds.has(item.courseWork.id) ||
          existingTitles.has(item.courseWork.title.trim().toLowerCase());
        initialSelection[item.courseWork.id] = !isAlreadyAdded;
      });
      setSelectedIds(initialSelection);
      setStep('review');
    } catch (err: any) {
      console.error('Classroom Sync Error:', err);
      let msg = err?.message || 'Failed to sync with Google Classroom.';
      if (msg.includes('popup_closed') || msg.includes('cancelled')) {
        msg = 'Google Sign-in was cancelled.';
      } else if (msg.includes('403') || msg.includes('access_denied')) {
        msg =
          'Access denied (403). Make sure your email is added to OAuth Test Users or admin approved the app.';
      }
      setErrorMsg(msg);
      setStep('prompt');
    }
  };

  const handleImport = () => {
    const toImport = fetchedItems.filter((item) => selectedIds[item.courseWork.id]);

    if (!toImport.length) {
      showToast('No Items Selected', 'Please select at least one assignment to import.', 'info');
      return;
    }

    let count = 0;
    toImport.forEach((item) => {
      // Check if already in homework list
      const alreadyPresent = homework.find(
        (h) =>
          h.externalId === item.courseWork.id ||
          h.title.trim().toLowerCase() === item.courseWork.title.trim().toLowerCase()
      );

      const status: HomeworkStatus = item.isTurnedIn ? 'Completed' : 'Not Started';

      if (!alreadyPresent) {
        addHomework({
          subjectId: item.matchedSubjectId,
          subjectName: item.courseName,
          title: item.courseWork.title,
          description: item.courseWork.description || `Imported from ${item.courseName}`,
          deadline: item.computedDeadline,
          priority: item.suggestedPriority,
          status,
          source: 'google_classroom',
          externalId: item.courseWork.id,
          externalLink: item.courseWork.alternateLink,
          attachmentName: item.courseWork.alternateLink ? 'Open in Classroom' : undefined,
        });
        count++;
      }
    });

    setImportedCount(count);
    setStep('success');
    showToast('Classroom Sync', `Successfully imported ${count} assignments!`, 'success');
  };

  const toggleSelectAll = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    fetchedItems.forEach((item) => {
      updated[item.courseWork.id] = select;
    });
    setSelectedIds(updated);
  };

  const selectedTotal = Object.values(selectedIds).filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Google Classroom Sync"
      description="Import assignments, course tasks, and deadlines directly into your schedule."
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5 py-2">
        {errorMsg && (
          <div className="flex items-start gap-3 p-3.5 rounded-none bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* STEP 1: PROMPT */}
        {step === 'prompt' && (
          <div className="flex flex-col items-center text-center py-6 px-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-8 h-8 stroke-[1.75]" />
            </div>

            <div className="max-w-md">
              <h3 className="text-lg font-bold text-[#111111] dark:text-[#F4F4F6]">
                Sync Your Course Assignments
              </h3>
              <p className="text-xs text-[#6B6B6B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
                Connect your student Google account to fetch coursework, pending deadlines, and
                submission states across all enrolled classrooms.
              </p>
            </div>

            <div className="w-full max-w-sm flex flex-col gap-2.5 pt-2">
              <Button
                variant="primary"
                onClick={startSync}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold"
              >
                <Sparkles className="w-4 h-4" />
                Connect & Fetch Assignments
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full text-xs text-[#6B6B6B]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SYNCING LOADER */}
        {step === 'syncing' && (
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-4 text-center">
            <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin stroke-[2]" />
            <div>
              <p className="text-sm font-semibold text-[#111111] dark:text-[#F4F4F6]">
                Syncing with Google Classroom...
              </p>
              <p className="text-xs text-[#6B6B6B] dark:text-[#94A3B8] mt-1 font-mono">
                {progressMsg}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW ITEMS */}
        {step === 'review' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs border-b border-black/10 dark:border-white/10 pb-3">
              <span className="font-semibold text-[#111111] dark:text-white">
                Found {fetchedItems.length} assignments ({selectedTotal} selected)
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-black/20 dark:text-white/20">•</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-xs font-medium text-[#6B6B6B] dark:text-[#94A3B8] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {fetchedItems.map((item) => {
                const isSelected = !!selectedIds[item.courseWork.id];
                const isAlreadyPresent =
                  existingExternalIds.has(item.courseWork.id) ||
                  existingTitles.has(item.courseWork.title.trim().toLowerCase());
                const dueText = new Date(item.computedDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.courseWork.id}
                    onClick={() =>
                      setSelectedIds((prev) => ({
                        ...prev,
                        [item.courseWork.id]: !prev[item.courseWork.id],
                      }))
                    }
                    className={`flex items-start gap-3 p-3.5 border transition-colors cursor-pointer rounded-none text-left ${
                      isSelected
                        ? 'border-black dark:border-white bg-black/[0.02] dark:bg-white/[0.04]'
                        : 'border-[#D9D9D6] dark:border-white/[0.08] bg-transparent opacity-75'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-4 h-4 border flex items-center justify-center transition-colors rounded-none ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                            : 'border-[#A0A0A0] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-none border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-black dark:text-white uppercase">
                          {item.courseName}
                        </span>
                        {item.isTurnedIn ? (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                            Submitted
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                            Pending
                          </span>
                        )}
                        {isAlreadyPresent && (
                          <span className="text-[9.5px] font-mono text-[#6B6B6B] dark:text-[#94A3B8]">
                            (Already in tasks)
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-[#111111] dark:text-[#F4F4F6] mt-1 line-clamp-1">
                        {item.courseWork.title}
                      </h4>

                      {item.courseWork.description && (
                        <p className="text-xs text-[#6B6B6B] dark:text-[#94A3B8] mt-0.5 line-clamp-2">
                          {item.courseWork.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-[#6B6B6B] dark:text-[#94A3B8]">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" /> Due {dueText}
                        </span>
                        {item.courseWork.alternateLink && (
                          <a
                            href={item.courseWork.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Classroom <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/10 dark:border-white/10">
              <Button variant="ghost" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={selectedTotal === 0}
                className="text-xs font-semibold px-5"
              >
                Import {selectedTotal} Selected
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center py-6 px-4 gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8 stroke-[2]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#111111] dark:text-[#F4F4F6]">
                Sync Completed!
              </h3>
              <p className="text-xs text-[#6B6B6B] dark:text-[#94A3B8] mt-1.5">
                Added {importedCount} new assignments to your schedule.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleClose}
              className="w-full max-w-xs mt-2 text-xs font-semibold py-2.5"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
