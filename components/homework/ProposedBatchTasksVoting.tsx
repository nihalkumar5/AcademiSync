'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { BatchProposedTask } from '@/lib/types';
import {
  Vote,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ProposedBatchTasksVoting: React.FC = () => {
  const { profile, proposedBatchTasks, voteBatchTask, deleteBatchProposal, isBatchCR, subjects, user } = useApp();

  if (!profile.isBatchSynced || !profile.batchKey) return null;

  const activeProposals = proposedBatchTasks.filter((p) => p.status === 'voting');
  if (activeProposals.length === 0) return null;

  return (
    <div className="border border-black/10 dark:border-white/[0.08] p-4 sm:p-5 bg-[#F7F7F5] dark:bg-[#121317] rounded-none flex flex-col gap-4 text-left shadow-sm">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-black text-white dark:bg-white/[0.08] dark:text-[#F4F4F6] border border-black/10 dark:border-white/[0.1] flex items-center justify-center font-bold text-xs shrink-0">
            <Vote className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-[#F4F4F6] flex items-center gap-2">
              <span>Batch Assignment Proposals</span>
              <span className="px-2 py-0.5 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase">
                {activeProposals.length} VOTING ACTIVE
              </span>
            </h3>
            <p className="text-[11px] text-black/60 dark:text-[#94A3B8] font-medium">
              Classmate proposed tasks. Reaching 30% approval automatically adds them to everyone's schedule.
            </p>
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {activeProposals.map((proposal) => {
            const currentUserId = user?.id || '';
            const userVote = currentUserId ? proposal.votes?.[currentUserId] : null;
            const totalMembers = Math.max(proposal.totalEligibleMembers || 1, 1);
            const neededVotes = Math.max(Math.ceil(totalMembers * 0.3), 1);
            const progressPercent = Math.min(Math.round((proposal.approvalsCount / neededVotes) * 100), 100);

            const subject = subjects.find((s) => s.id === proposal.subjectId);
            const subjectName = subject?.name || proposal.subjectName || 'General Assignment';

            return (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                className="border border-black/10 dark:border-white/[0.08] p-4 bg-white dark:bg-[#181A20] rounded-none flex flex-col justify-between gap-3 relative shadow-sm"
              >
                <div>
                  {/* Top Bar: Subject & Due Date */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-black/10 dark:border-white/[0.06] text-[11px] font-medium">
                    <span className="px-2 py-0.5 rounded-none border border-black/10 dark:border-white/[0.08] bg-black/5 dark:bg-white/[0.04] text-black dark:text-[#F4F4F6] font-bold uppercase truncate max-w-[160px]">
                      {subjectName}
                    </span>
                    <span className="flex items-center gap-1 text-black/60 dark:text-[#94A3B8]">
                      <Clock className="w-3 h-3" />
                      {new Date(proposal.deadline).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {(isBatchCR || proposal.creatorId === user?.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBatchProposal(proposal.id);
                        }}
                        title="Delete Proposal"
                        className="p-1 text-black/40 hover:text-rose-600 dark:text-white/40 dark:hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-sm font-bold text-black dark:text-[#F4F4F6] tracking-tight">
                    {proposal.title}
                  </h4>
                  {proposal.description && (
                    <p className="text-xs text-black/70 dark:text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>
                  )}

                  {/* Creator Info */}
                  <div className="mt-2 text-[11px] text-black/50 dark:text-[#64748B]">
                    Proposed by: <span className="font-semibold text-black/70 dark:text-[#94A3B8]">{proposal.creatorName}</span>
                  </div>
                </div>

                {/* Consensus Progress Bar & Voting Buttons */}
                <div className="pt-3 border-t border-black/10 dark:border-white/[0.06] flex flex-col gap-2.5">
                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-black/70 dark:text-[#94A3B8]">
                      <span>Consensus: {proposal.approvalsCount} / {neededVotes} Approvals Needed</span>
                      <span className="font-bold text-black dark:text-[#F4F4F6]">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-none border border-black/10 dark:border-white/[0.08] bg-black/5 dark:bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-none transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Voting Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {userVote ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {userVote === 'approve' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            You Approved
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            You Rejected
                          </span>
                        )}
                        <span className="text-[11px] text-black/40 dark:text-[#64748B] font-normal">
                          (Waiting for batch votes)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => voteBatchTask(proposal.id, 'approve')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-none bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => voteBatchTask(proposal.id, 'reject')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-none border border-black/20 dark:border-white/[0.1] text-xs font-bold uppercase tracking-wider hover:border-rose-500 hover:text-rose-500 dark:hover:border-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer text-black/70 dark:text-[#94A3B8]"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
