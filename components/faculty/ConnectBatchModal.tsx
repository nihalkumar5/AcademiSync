'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { FacultyLinkedBatch, Subject } from '@/lib/types';
import { extractCleanInviteCode } from '@/lib/timetableUtils';
import { formatFacultyBatchDegreeAndBranch, isCommonSubject } from '@/lib/facultyUtils';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Check, Search, Plus, BookOpen, Users, AlertCircle, Loader2 } from 'lucide-react';

interface ConnectBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchLinked?: (linkedBatch: FacultyLinkedBatch) => void;
}

export const ConnectBatchModal: React.FC<ConnectBatchModalProps> = ({
  isOpen,
  onClose,
  onBatchLinked,
}) => {
  const { profile, updateProfile, showToast } = useApp();
  const [batchCodeInput, setBatchCodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundBatchData, setFoundBatchData] = useState<any | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !batchCodeInput && (!profile.facultyLinkedBatches || profile.facultyLinkedBatches.length === 0)) {
      if (profile.batchCode) {
        setBatchCodeInput(profile.batchCode);
      } else if (profile.batchKey) {
        setBatchCodeInput(profile.batchKey);
      }
    }
  }, [isOpen, profile.batchCode, profile.batchKey, profile.facultyLinkedBatches]);

  const resetState = () => {
    setBatchCodeInput('');
    setIsSearching(false);
    setFoundBatchData(null);
    setSelectedSubjectIds([]);
    setSearchError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearchBatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = batchCodeInput.trim();
    if (!raw) {
      setSearchError('Please enter a 6-digit batch code or invite code.');
      return;
    }

    const clean = extractCleanInviteCode(raw) || raw;
    setIsSearching(true);
    setSearchError(null);
    setFoundBatchData(null);
    setSelectedSubjectIds([]);

    try {
      let docSnap: any = null;
      let matchedKey = clean;

      // 1. Direct ID try
      const possibleIds = [clean, clean.toLowerCase(), clean.toUpperCase()];
      for (const id of possibleIds) {
        const snap = await getDoc(doc(db, 'shared_timetables', id));
        if (snap.exists()) {
          docSnap = snap;
          matchedKey = id;
          break;
        }
      }

      // 2. Query by inviteCode
      if (!docSnap) {
        const upperCode = clean.toUpperCase();
        const q = query(
          collection(db, 'shared_timetables'),
          where('inviteCode', 'in', [clean, upperCode, clean.toLowerCase()])
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          docSnap = querySnap.docs[0];
          matchedKey = docSnap.id;
        }
      }

      if (!docSnap || !docSnap.exists()) {
        setSearchError('Batch not found. Please verify the 6-digit code with the Batch Pilot.');
        setIsSearching(false);
        return;
      }

      const data = docSnap.data();
      const batchObj = { ...data, id: matchedKey };

      // Check if already linked
      const existing = (profile.facultyLinkedBatches || []).find(
        (b) => b.batchKey === matchedKey || (b.batchCode && b.batchCode.toUpperCase() === clean.toUpperCase())
      );
      if (existing) {
        setSearchError('You have already connected to this batch. You can edit subjects in the list.');
        setIsSearching(false);
        return;
      }

      setFoundBatchData(batchObj);

      // Auto pre-select subjects: match faculty name OR match common subjects already taught in connected batches
      const facultyNameLower = (profile.name || '').toLowerCase();
      const existingTaughtSubjects = (profile.facultyLinkedBatches || []).flatMap(
        (b) => b.selectedSubjectNames || []
      );
      const preSelected: string[] = [];
      if (Array.isArray(batchObj.subjects)) {
        batchObj.subjects.forEach((sub: Subject) => {
          const facultyMatches =
            sub.facultyName &&
            facultyNameLower &&
            sub.facultyName.toLowerCase().includes(facultyNameLower.split(' ')[0]);
          const isCommon = isCommonSubject(sub.name || sub.shortName || '', existingTaughtSubjects);
          if (facultyMatches || isCommon) {
            preSelected.push(sub.id);
          }
        });
      }
      setSelectedSubjectIds(preSelected);
    } catch (err: any) {
      console.error('Error finding batch:', err);
      setSearchError('Network error while looking up batch. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleSaveConnection = () => {
    if (!foundBatchData) return;
    if (selectedSubjectIds.length === 0) {
      showToast('Select Subjects', 'Please select at least one subject you teach in this batch.', 'warning');
      return;
    }

    const subjectsList: Subject[] = Array.isArray(foundBatchData.subjects) ? foundBatchData.subjects : [];
    const selectedSubjects = subjectsList.filter((s) => selectedSubjectIds.includes(s.id));
    const selectedSubjectNames = selectedSubjects.map((s) => s.name || s.shortName || s.code);

    const { degreeAndBranch, semText, fullLabel } = formatFacultyBatchDegreeAndBranch(foundBatchData);
    const displayName = fullLabel || degreeAndBranch || 'Batch';

    const newLinkedBatch: FacultyLinkedBatch = {
      id: `link_${foundBatchData.id}_${Date.now()}`,
      batchKey: foundBatchData.id,
      batchCode: foundBatchData.inviteCode || batchCodeInput.trim().toUpperCase(),
      batchName: displayName,
      college: foundBatchData.college || '',
      programme: foundBatchData.programme || '',
      branch: foundBatchData.branch || '',
      semester: Number(foundBatchData.semester || 1),
      section: foundBatchData.section || '',
      selectedSubjectIds,
      selectedSubjectNames,
      linkedAt: new Date().toISOString(),
    };

    const updatedBatches = [...(profile.facultyLinkedBatches || []), newLinkedBatch];

    updateProfile({
      facultyLinkedBatches: updatedBatches,
    });

    showToast('Batch Connected', `Linked to ${degreeAndBranch} with ${selectedSubjectIds.length} subjects.`, 'success');
    if (onBatchLinked) onBatchLinked(newLinkedBatch);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect Batch"
      description="Enter the batch code to link your lectures and post assignments directly."
    >
      <div className="flex flex-col gap-5 text-left font-sans mt-2">
        {/* Step 1: Input Code */}
        {!foundBatchData ? (
          <form onSubmit={handleSearchBatch} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                Batch Code / 6-Digit ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={batchCodeInput}
                  onChange={(e) => setBatchCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 849201 or CSE4A"
                  maxLength={20}
                  className="flex-1 px-3.5 py-2.5 rounded-[8px] bg-white dark:bg-[#090A0C] border border-black/15 dark:border-white/15 text-black dark:text-white font-mono text-sm tracking-widest uppercase focus:outline-none focus:border-black dark:focus:border-white"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearching || !batchCodeInput.trim()}
                  className="px-5 py-2.5 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Find</span>
                </button>
              </div>
              <p className="text-[11px] text-[#737373] dark:text-[#A1A1AA] mt-1">
                Ask your Class Representative (Batch Pilot) for their batch&apos;s 6-digit code or share link.
              </p>
            </div>

            {searchError && (
              <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </form>
        ) : (
          /* Step 2: Batch Found -> Select Subjects */
          <div className="flex flex-col gap-5">
            {/* Batch Info Card: Clean Degree & Branch only */}
            {(() => {
              const { degreeAndBranch, semText } = formatFacultyBatchDegreeAndBranch(foundBatchData);
              return (
                <div className="p-3.5 rounded-[12px] bg-black/5 dark:bg-white/5 border border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
                      {degreeAndBranch}
                    </span>
                    <span className="px-2 py-0.5 rounded-[4px] bg-black/10 dark:bg-white/10 text-[10px] font-mono font-bold uppercase text-black dark:text-white">
                      CODE: {foundBatchData.inviteCode || foundBatchData.id}
                    </span>
                  </div>
                  {semText && (
                    <p className="text-xs font-mono text-[#6F6F6F] dark:text-[#A1A1AA]">
                      {semText}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Subject Checkboxes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Select Subjects You Teach:
                </label>
                <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                  {selectedSubjectIds.length} selected
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1 border border-black/[0.06] dark:border-white/[0.08] rounded-[10px] p-2 bg-[#F9F9F7] dark:bg-[#0A0A0C]">
                {Array.isArray(foundBatchData.subjects) && foundBatchData.subjects.length > 0 ? (
                  foundBatchData.subjects.map((sub: Subject) => {
                    const isChecked = selectedSubjectIds.includes(sub.id);
                    const isCommon = isCommonSubject(
                      sub.name || sub.shortName || '',
                      (profile.facultyLinkedBatches || []).flatMap((b) => b.selectedSubjectNames || [])
                    );
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubject(sub.id)}
                        className={`flex items-center justify-between p-2.5 rounded-[8px] text-left border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-[#111111] dark:border-white shadow-2xs'
                            : 'bg-white dark:bg-[#121317] text-black dark:text-white border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold leading-tight truncate">
                              {sub.name}
                            </span>
                            {isCommon && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                                  isChecked
                                    ? 'bg-emerald-400 text-black'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                ★ Common Subject
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10.5px] font-mono mt-0.5 ${
                              isChecked ? 'text-white/70 dark:text-black/70' : 'text-black/50 dark:text-white/50'
                            }`}
                          >
                            {sub.code || sub.shortName || 'Subject'}{' '}
                            {sub.facultyName ? `· ${sub.facultyName}` : ''}
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-white text-black dark:bg-black dark:text-white border-white dark:border-black'
                              : 'border-black/30 dark:border-white/30'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-black/50 dark:text-white/50">
                    No subjects found in this batch.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setFoundBatchData(null)}
                className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSaveConnection}
                disabled={selectedSubjectIds.length === 0}
                className="px-5 py-2.5 rounded-[8px] bg-[#111111] text-white dark:bg-white dark:text-[#111111] text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                Connect &amp; Sync
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
