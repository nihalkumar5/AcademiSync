'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getShortCollegeName, formatBatchDisplayName } from '@/lib/timetableUtils';
import { CRApplicationModal } from '@/components/cr/CRApplicationModal';
import { Calendar, Bell, Clock, Users, ArrowRight, ShieldCheck, MessageCircle } from '@/components/ui/icons';
import { Illustration } from '@/components/ui/Illustration';
import { shareLink, PLAY_STORE_URL } from '@/lib/shareUtils';

interface BatchSetupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  college?: string;
  programme?: string;
  branch?: string;
  semester?: number;
  section?: string;
  onContinuePersonal?: () => void;
}

export const BatchSetupPromptModal: React.FC<BatchSetupPromptModalProps> = ({
  isOpen,
  onClose,
  college,
  programme,
  branch,
  semester,
  onContinuePersonal
}) => {
  const { profile, showToast } = useApp();
  const [showCRModal, setShowCRModal] = useState(false);

  const activeCollege = college || profile.college || 'Your College';
  const activeProg = programme || profile.programme || 'B.Tech';
  const activeBranch = branch || profile.branch || 'Engineering';
  const activeSem = semester || profile.semester || 1;

  const shortCollege = getShortCollegeName(activeCollege);

  const handleShareToWhatsApp = async () => {
    const courseTitle = `${activeBranch} (Sem ${activeSem})`;
    const messageText = `Hey batchmates! 👋

Nobody has created the official timetable for our batch yet on Intersemester:
🏛️ *${shortCollege}*
📚 *${courseTitle}*

📲 *Download App on Play Store:*
${PLAY_STORE_URL}

If you are our Batch Pilot or want to setup the synced batch timetable for all of us, open the *Intersemester* app and setup our batch schedule! 🚀`;

    try {
      const res = await shareLink({
        title: `Setup Batch: ${shortCollege} - ${courseTitle}`,
        text: messageText,
        dialogTitle: 'Share with Class WhatsApp Group'
      });
      if (res === 'copied') {
        showToast('Message Copied!', 'Paste this message in your class WhatsApp group to notify your Batch Pilot.', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePersonalTimetable = () => {
    onClose();
    if (onContinuePersonal) {
      onContinuePersonal();
    }
  };

  // "Data Science & Artificial Intelligence (DS & AI)" → "DS & AI"
  const shortBranch = /\(([^)]{1,16})\)/.exec(activeBranch)?.[1]?.trim() || activeBranch;
  const batchLabel = formatBatchDisplayName(shortBranch, activeSem);

  return (
    <>
      <Modal
        isOpen={isOpen && !showCRModal}
        onClose={onClose}
        title="Batch Pilot"
        mobileFullSheet={true}
        maxWidth="4xl"
        showCloseButton={true}
        footer={
          <div className="px-5 sm:px-8 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={() => setShowCRModal(true)} className="btn btn-primary btn-lg w-full sm:w-auto sm:flex-[1.6]">
              Become the pilot
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1">
              <button type="button" onClick={handleShareToWhatsApp} className="btn btn-secondary sm:btn-lg sm:flex-1">
                <MessageCircle className="w-4 h-4" />
                Ask class
              </button>
              <button type="button" onClick={handlePersonalTimetable} className="btn btn-ghost sm:btn-lg">
                Not now
              </button>
            </div>
          </div>
        }
      >
        {/* Bleeds to the dialog edges; the footer sticks to the bottom while the body scrolls */}
        <div className="-m-5 sm:-m-6 flex flex-col font-sans text-left">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* ===== Hero ===== */}
            <section className="relative overflow-hidden bg-amber-50 dark:bg-amber-400/[0.06] border-b md:border-b-0 md:border-r border-line px-5 sm:px-8 pt-6 pb-8 flex flex-col">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 w-72 h-72 rounded-full bg-[radial-gradient(closest-side,rgba(255,107,107,0.18),transparent)] dark:bg-[radial-gradient(closest-side,rgba(255,107,107,0.10),transparent)]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 bottom-10 w-60 h-60 rounded-full bg-[radial-gradient(closest-side,rgba(0,179,179,0.16),transparent)] dark:bg-[radial-gradient(closest-side,rgba(0,179,179,0.10),transparent)]"
              />

              <div className="relative flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-surface border border-amber-200 dark:border-amber-400/25 text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inset-0 bg-amber-500 animate-ping opacity-60 motion-reduce:hidden" />
                    <span className="relative w-2 h-2 bg-amber-500" />
                  </span>
                  No pilot yet
                </span>
                <span className="h-7 px-2.5 inline-flex items-center bg-surface/70 border border-line text-[12px] font-medium text-fg truncate max-w-full">
                  {batchLabel} · {shortCollege}
                </span>
              </div>

              <Illustration name="pilot" className="relative mt-6 h-[176px] sm:h-[210px] w-auto self-center" />

              <h2 className="relative mt-6 text-[32px] sm:text-[38px] leading-[1.06] tracking-tight text-fg">
                Your batch
                <br />
                needs a pilot.
              </h2>
              <p className="relative mt-3 text-[15px] leading-[23px] text-muted max-w-[380px]">
                Nobody has set up {shortBranch} Sem {activeSem} yet. Do it once, and everyone in your batch gets the timetable, every change and every alert on
                their phone.
              </p>

              {/* What one update does, shown as the notification classmates receive */}
              <div className="relative mt-6">
                <p className="mb-2 text-[12px] font-semibold text-muted">What your batch sees when you move a class</p>
                <div className="bg-surface border border-line shadow-[0_12px_32px_-16px_rgba(17,17,17,0.25)] p-3 flex gap-3">
                  <span className="w-9 h-9 shrink-0 overflow-hidden bg-white border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo51.png" alt="" className="w-full h-full object-cover scale-[1.75]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="font-semibold">Intersemester</span>
                      <span>now</span>
                    </span>
                    <span className="block mt-0.5 text-[14px] font-semibold text-fg leading-snug">Data Structures moved to Room 204</span>
                    <span className="block text-[13px] text-muted leading-snug">Today, 10:00 AM · updated by your Batch Pilot</span>
                  </span>
                </div>
              </div>
            </section>

            {/* ===== Details ===== */}
            <section className="px-5 sm:px-8 py-7 flex flex-col gap-8">
              {/* How it works */}
              <div>
                <h3 className="text-[13px] font-semibold text-muted">How it works</h3>
                <ol className="mt-4 flex flex-col">
                  {[
                    { title: 'Apply', body: 'Tell us your class. Takes about a minute.' },
                    { title: 'Get approved', body: 'Your campus team checks that it’s really you.' },
                    { title: 'Add the timetable', body: 'Snap or upload it. We turn it into a schedule for everyone.' },
                  ].map((st, i, arr) => (
                    <li key={st.title} className="relative flex gap-4 pb-5 last:pb-0">
                      {i < arr.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 bottom-0 w-px bg-line" />}
                      <span className={`relative z-10 w-8 h-8 shrink-0 flex items-center justify-center text-[13px] font-bold tabular-nums ${i === 0 ? 'bg-ink text-on-ink' : 'bg-surface border border-line text-fg'}`}>
                        {i + 1}
                      </span>
                      <span className="pt-1">
                        <span className="block text-[15px] font-semibold text-fg leading-tight">{st.title}</span>
                        <span className="block mt-1 text-[14px] leading-[20px] text-muted">{st.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Powers */}
              <div>
                <h3 className="text-[13px] font-semibold text-muted">What a pilot can do</h3>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { icon: Calendar, title: 'One timetable', body: 'Update once, everyone has it', tone: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/20' },
                    { icon: Bell, title: 'Instant alerts', body: 'Cancel or move a class', tone: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20' },
                    { icon: Clock, title: 'Shared deadlines', body: 'Tasks and labs for all', tone: 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20' },
                    { icon: Users, title: 'No more chaos', body: 'One place, not 5 groups', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20' },
                  ].map(({ icon: Icon, title, body, tone }) => (
                    <li key={title} className="border border-line bg-surface p-3.5">
                      <span className={`w-9 h-9 flex items-center justify-center border ${tone}`}>
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="block mt-3 text-[14px] font-semibold text-fg leading-tight">{title}</span>
                      <span className="block mt-1 text-[13px] leading-[18px] text-muted">{body}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 text-[13px] leading-[19px] text-muted">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-fg" />
                  <span>
                    Up to 3 pilots per batch, so you can share the work. You only step in when something changes.
                  </span>
                </p>
              </div>
            </section>
          </div>

        </div>
      </Modal>

      {/* CR Application Modal */}
      <CRApplicationModal
        isOpen={showCRModal}
        onClose={() => {
          setShowCRModal(false);
          onClose();
        }}
        targetCollege={college || (profile.college !== 'Your College' ? profile.college : '')}
        targetProgramme={programme || profile.programme || ''}
        targetBranch={branch || (profile.branch !== 'Engineering' ? profile.branch : '')}
        targetSemester={semester || profile.semester || 1}
      />
    </>
  );
};
