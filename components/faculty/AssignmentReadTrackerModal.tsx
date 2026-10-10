'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BatchProposedTask, AssignmentReadReceipt } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Eye, CheckCircle2, Clock, Users, Copy, Share2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface AssignmentReadTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: BatchProposedTask | null;
}

export const AssignmentReadTrackerModal: React.FC<AssignmentReadTrackerModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'opened' | 'unopened'>('opened');
  const [batchMembers, setBatchMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (isOpen && task?.batchKey) {
      setIsLoadingMembers(true);
      const fetchBatch = async () => {
        try {
          const snap = await getDoc(doc(db, 'shared_timetables', task.batchKey));
          if (snap.exists()) {
            const data = snap.data();
            const members = Array.isArray(data.members) ? data.members : [];
            setBatchMembers(members);
          }
        } catch (e) {
          console.warn('Could not load batch members list:', e);
        } finally {
          setIsLoadingMembers(false);
        }
      };
      fetchBatch();
    }
  }, [isOpen, task?.batchKey]);

  if (!task) return null;

  const readReceipts: Record<string, AssignmentReadReceipt> = task.readReceipts || {};
  const openedList = Object.values(readReceipts).sort((a, b) => (b.readAt || '').localeCompare(a.readAt || ''));

  const openedStudentIds = new Set(Object.keys(readReceipts));
  const unopenedMembers = batchMembers.filter(
    (m) => !openedStudentIds.has(m.id || m.userId || m.email)
  );

  const totalBatchCount = Math.max(batchMembers.length, openedList.length);
  const percentage = totalBatchCount > 0 ? Math.round((openedList.length / totalBatchCount) * 100) : 0;

  const handleCopyUnopenedList = () => {
    if (unopenedMembers.length === 0) {
      showToast('All Opened', 'All batch members have opened this assignment!', 'info');
      return;
    }
    const text = unopenedMembers
      .map((m) => `${m.rollNumber ? `[${m.rollNumber}] ` : ''}${m.name || m.email}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    showToast('Copied', `Copied ${unopenedMembers.length} unopened student names to clipboard.`, 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Read Receipts"
      description={`Real-time engagement tracker for "${task.title}"`}
    >
      <div className="flex flex-col gap-4 text-left font-sans mt-2">
        {/* Progress & Stat Header */}
        <div className="p-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
              Read Percentage
            </span>
            <span className="text-xl font-bold font-mono text-black dark:text-white">
              {percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 overflow-hidden rounded-full">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-black/60 dark:text-white/60 font-mono pt-1">
            <span>Opened: <strong>{openedList.length}</strong> students</span>
            <span>Batch Total: <strong>{totalBatchCount}</strong> students</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('opened')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'opened'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            Opened ({openedList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unopened')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
              activeTab === 'unopened'
                ? 'border-black dark:border-white text-black dark:text-white'
                : 'border-transparent text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            Not Opened Yet ({unopenedMembers.length > 0 ? unopenedMembers.length : Math.max(0, totalBatchCount - openedList.length)})
          </button>
        </div>

        {/* List Body */}
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5 p-1">
          {activeTab === 'opened' ? (
            openedList.length === 0 ? (
              <div className="py-8 text-center text-xs text-black/40 dark:text-white/40 flex flex-col items-center justify-center gap-1.5">
                <Eye className="w-6 h-6 opacity-30" />
                <span>No students have opened this assignment yet.</span>
              </div>
            ) : (
              openedList.map((st, i) => (
                <div
                  key={`${st.studentId}_${i}`}
                  className="p-2.5 bg-white dark:bg-[#121317] border border-black/10 dark:border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-black dark:text-white truncate">
                      {st.studentName || 'Student'}
                    </span>
                    {st.rollNumber && (
                      <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                        Roll: {st.rollNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {new Date(st.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )
          ) : (
            /* Unopened Tab */
            unopenedMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-black/40 dark:text-white/40 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60" />
                <span>All registered batch members have opened this assignment!</span>
              </div>
            ) : (
              unopenedMembers.map((m, i) => (
                <div
                  key={`${m.id || i}`}
                  className="p-2.5 bg-white dark:bg-[#121317] border border-black/10 dark:border-white/10 flex items-center justify-between gap-2 opacity-75"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-black dark:text-white truncate">
                      {m.name || m.email || 'Student'}
                    </span>
                    {m.rollNumber && (
                      <span className="text-[10px] font-mono text-black/50 dark:text-white/50">
                        Roll: {m.rollNumber}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-red-500 dark:text-red-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10 mt-1">
          {activeTab === 'unopened' && unopenedMembers.length > 0 && (
            <button
              type="button"
              onClick={handleCopyUnopenedList}
              className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Unopened List</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-85 transition-opacity cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
