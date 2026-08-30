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
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ProposedBatchTasksVoting: React.FC = () => {
  const { profile, proposedBatchTasks, voteBatchTask, subjects, user } = useApp();

  if (!profile.isBatchSynced || !profile.batchKey) return null;

  const activeProposals = proposedBatchTasks.filter((p) => p.status === 'voting');
  if (activeProposals.length === 0) return null;

  return (
    <div className="border-2 border-black dark:border-white p-4 sm:p-5 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-4 text-left">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
            <Vote className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
              <span>Batch Assignment Proposals</span>
              <span className="px-2 py-0.5 bg-amber-400 text-black border border-amber-500 text-[10px] font-mono font-bold uppercase">
                {activeProposals.length} VOTING ACTIVE
              </span>
            </h3>
            <p className="text-[11px] text-black/60 dark:text-white/60 font-mono">
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
                className="border border-black dark:border-white p-4 bg-white dark:bg-zinc-950 flex flex-col justify-between gap-3 relative shadow-sm"
              >
                <div>
                  {/* Top Bar: Subject & Due Date */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-black/10 dark:border-white/10 text-[10.5px] font-mono">
                    <span className="px-1.5 py-0.5 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 font-bold uppercase truncate max-w-[160px]">
                      {subjectName}
                    </span>
                    <span className="flex items-center gap-1 text-black/60 dark:text-white/60">
                      <Clock className="w-3 h-3" />
                      {new Date(proposal.deadline).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-sm font-bold text-black dark:text-white tracking-tight">
                    {proposal.title}
                  </h4>
                  {proposal.description && (
                    <p className="text-xs text-black/70 dark:text-white/70 mt-1 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>
                  )}

                  {/* Creator Info */}
                  <div className="mt-2 text-[10px] font-mono text-black/50 dark:text-white/50">
                    Proposed by: <span className="font-bold text-black/70 dark:text-white/70">{proposal.creatorName}</span>
                  </div>
                </div>

                {/* Consensus Progress Bar & Voting Buttons */}
                <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-col gap-2.5">
                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span>Consensus: {proposal.approvalsCount} / {neededVotes} Approvals Needed</span>
                      <span className="font-bold">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Voting Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {userVote ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
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
                        <span className="text-[10px] text-black/40 dark:text-white/40 font-normal">
                          (Waiting for batch votes)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => voteBatchTask(proposal.id, 'approve')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-black text-white dark:bg-white dark:text-black text-xs font-bold uppercase tracking-wider border border-black dark:border-white hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => voteBatchTask(proposal.id, 'reject')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-black/30 dark:border-white/30 text-xs font-bold uppercase tracking-wider hover:border-rose-500 hover:text-rose-500 transition-colors cursor-pointer text-black/70 dark:text-white/70"
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
