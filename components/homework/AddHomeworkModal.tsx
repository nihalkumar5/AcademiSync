'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Homework, Subject, HomeworkPriority, HomeworkStatus } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { clsx } from 'clsx';
import { Users, Vote, Search, ChevronDown, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeworkToEdit?: Homework;
  prefilledData?: Partial<Homework>;
}

export const AddHomeworkModal: React.FC<AddHomeworkModalProps> = ({
  isOpen,
  onClose,
  homeworkToEdit,
  prefilledData,
}) => {
  const { subjects, addHomework, updateHomework, deleteHomework, profile, proposeBatchTask, isBatchCR } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('Medium');
  const [status, setStatus] = useState<HomeworkStatus>('Not Started');
  const [attachmentName, setAttachmentName] = useState('');
  const [shareWithBatch, setShareWithBatch] = useState(false);

  // Modals for selects
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const [subjectSearch, setSubjectSearch] = useState('');

  useEffect(() => {
    if (homeworkToEdit) {
      setSubjectId(homeworkToEdit.subjectId);
      setTitle(homeworkToEdit.title);
      setDescription(homeworkToEdit.description || '');
      setDeadline(homeworkToEdit.deadline.slice(0, 16));
      setPriority(homeworkToEdit.priority);
      setStatus(homeworkToEdit.status);
      setAttachmentName(homeworkToEdit.attachmentName || '');
      setShareWithBatch(false);
    } else if (prefilledData) {
      setSubjectId(prefilledData.subjectId || (subjects.length > 0 ? subjects[0].id : ''));
      setTitle(prefilledData.title || '');
      setDescription(prefilledData.description || '');
      setDeadline(prefilledData.deadline ? prefilledData.deadline.slice(0, 16) : new Date().toISOString().slice(0, 16));
      setPriority(prefilledData.priority || 'Medium');
      setStatus(prefilledData.status || 'Not Started');
      setAttachmentName(prefilledData.attachmentName || '');
      setShareWithBatch(false);
    } else {
      if (subjects.length > 0 && !subjectId) {
        setSubjectId(subjects[0].id);
      }
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      defaultDate.setHours(23, 59, 0, 0);
      setDeadline(defaultDate.toISOString().slice(0, 16));
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('Not Started');
      setAttachmentName('');
      setShareWithBatch(false);
    }
  }, [homeworkToEdit, isOpen, subjects, profile.isBatchSynced, profile.batchKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;

    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const subjectName = selectedSubject?.name || '';

    if (homeworkToEdit) {
      updateHomework(homeworkToEdit.id, {
        subjectId,
        subjectName,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        status,
        attachmentName: attachmentName.trim(),
      });
    } else if (shareWithBatch && profile.isBatchSynced && profile.batchKey) {
      await proposeBatchTask({
        subjectId,
        subjectName,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        attachmentName: attachmentName.trim(),
      });
    } else {
      addHomework({
        subjectId,
        subjectName,
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        priority,
        status,
        attachmentName: attachmentName.trim(),
      });
    }
    onClose();
  };

  const selectedSubject = subjects.find(s => s.id === subjectId);
  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={homeworkToEdit ? 'Edit Homework Task' : 'Create Homework Task'}
        description="Track submissions, lab journals, and assignment deadlines."
        mobileFullSheet
      >
        <div className="-m-5">
          <form onSubmit={handleSubmit} className="flex flex-col text-left bg-[#F7F7F5] dark:bg-[#1A1A1A] min-h-full">
            <div className="flex flex-col gap-[24px] p-5 pb-24">
              
              {/* SECTION 1: TASK */}
              <div className="flex flex-col gap-[16px]">
                <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">TASK</span>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Subject</label>
                  <button
                    type="button"
                    onClick={() => setShowSubjectModal(true)}
                    className="w-full px-3 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors text-left flex items-center justify-between h-[44px]"
                  >
                    <span className="truncate pr-2">
                      {selectedSubject ? (selectedSubject.code && selectedSubject.code !== 'UNK' ? `[${selectedSubject.code}] ${selectedSubject.name}` : selectedSubject.name) : 'Select Subject...'}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 text-[#111111] dark:text-[#FFFFFF]" />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Task / Assignment Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                    placeholder="e.g. Assignment 2"
                    className="w-full px-3 h-[44px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] focus:border-[1.5px] dark:focus:border-[#FFFFFF] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Description</label>
                    <span className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-wider">OPTIONAL</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Problem details..."
                    className="w-full p-3 min-h-[76px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] focus:border-[1.5px] dark:focus:border-[#FFFFFF] transition-colors resize-y"
                  />
                </div>
              </div>

              {/* SECTION 2: DEADLINE */}
              <div className="flex flex-col gap-[16px]">
                <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">DEADLINE</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Deadline Date</label>
                    <input
                      type="date"
                      value={deadline.split('T')[0]}
                      onChange={(e) => setDeadline(e.target.value ? `${e.target.value}T23:59` : '')}
                      required
                      className="w-full px-3 h-[44px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] focus:border-[1.5px] dark:focus:border-[#FFFFFF] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Priority Level</label>
                    <button
                      type="button"
                      onClick={() => setShowPriorityModal(true)}
                      className="w-full px-3 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors text-left flex items-center justify-between h-[44px]"
                    >
                      <span className="truncate pr-2">{priority}</span>
                      <ChevronDown className="w-4 h-4 shrink-0 text-[#111111] dark:text-[#FFFFFF]" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Status</label>
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(true)}
                    className="w-full px-3 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] dark:focus:border-[#FFFFFF] transition-colors text-left flex items-center justify-between h-[44px]"
                  >
                    <span className="truncate pr-2">{status}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 text-[#111111] dark:text-[#FFFFFF]" />
                  </button>
                </div>
              </div>

              {/* SECTION 3: ATTACHMENT */}
              <div className="flex flex-col gap-[16px]">
                <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">ATTACHMENT</span>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#111111] dark:text-[#FFFFFF] uppercase">Google Drive Link</label>
                    <span className="text-[10px] font-bold text-[#6F6F6F] uppercase tracking-wider">OPTIONAL</span>
                  </div>
                  <input
                    type="url"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="Paste link..."
                    className="w-full px-3 h-[44px] bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] text-[14px] text-[#111111] dark:text-[#FFFFFF] focus:outline-none focus:border-[#111111] focus:border-[1.5px] dark:focus:border-[#FFFFFF] transition-colors"
                  />
                </div>
              </div>

              {/* SECTION 4: VISIBILITY */}
              {!homeworkToEdit && profile.isBatchSynced && profile.batchKey && (
                <div className="flex flex-col gap-[16px]">
                  <span className="text-[10px] font-bold tracking-[1px] text-[#6F6F6F] uppercase">VISIBILITY</span>
                  <div 
                    onClick={() => setShareWithBatch(!shareWithBatch)}
                    className="w-full p-4 bg-[#FFFFFF] dark:bg-[#111111] border border-[#D9D9D6] dark:border-[#333333] flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-5 h-5 border-[1.5px] flex items-center justify-center shrink-0 transition-colors",
                        shareWithBatch ? "bg-[#111111] border-[#111111] dark:bg-[#FFFFFF] dark:border-[#FFFFFF]" : "border-[#D9D9D6] dark:border-[#333333]"
                      )}>
                        {shareWithBatch && <Check className="w-3.5 h-3.5 text-white dark:text-black" strokeWidth={3} />}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-bold uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
                          POST TO ENTIRE BATCH
                        </span>
                        <span className="text-[11px] text-[#6F6F6F]">
                          {isBatchCR ? 'Automatically approve & share' : 'Propose to batch for consensus'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div 
              className="sticky bottom-0 left-0 right-0 px-5 pt-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+20px),20px)] bg-[#F7F7F5] dark:bg-[#1A1A1A] border-t border-[#D9D9D6] dark:border-[#333333] flex items-center justify-between z-20"
            >
              {homeworkToEdit ? (
                <button 
                  type="button" 
                  onClick={() => {
                    deleteHomework(homeworkToEdit.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-bold uppercase text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer rounded-none"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Task</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2.5 text-[13px] font-bold uppercase text-[#111111] dark:text-[#FFFFFF] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <div className="flex items-center gap-2">
                {homeworkToEdit && (
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="px-3 py-2.5 text-[12.5px] font-bold uppercase text-[#6F6F6F] hover:text-[#111111] dark:hover:text-[#FFFFFF] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-[#111111] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#111111] text-[13px] font-bold uppercase hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {homeworkToEdit ? 'Save Changes' : shareWithBatch ? (isBatchCR ? 'Post Task' : 'Propose Task') : 'Create Task'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* SELECTION MODALS */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="SEARCH SUBJECTS"
      >
        <div className="flex flex-col max-h-[60vh] sm:max-h-[50vh] -mx-5 sm:-mx-6 -mb-5 sm:-mb-6">
          <div className="relative border-b border-[#D9D9D6] dark:border-[#333333] shrink-0 bg-white dark:bg-[#111111] px-5 sm:px-6">
            <span className="absolute left-9 sm:left-10 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#FFFFFF]">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Search subjects..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-4 bg-transparent text-[14px] focus:outline-none text-[#111111] dark:text-[#FFFFFF]"
            />
          </div>
          <div className="flex-1 overflow-y-auto bg-[#F7F7F5] dark:bg-[#1A1A1A]">
            {filteredSubjects.map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setSubjectId(sub.id);
                  setShowSubjectModal(false);
                  setSubjectSearch('');
                }}
                className={clsx(
                  "w-full text-left p-4 sm:p-5 border-b border-[#D9D9D6] dark:border-[#333333] bg-white dark:bg-[#111111] transition-colors flex items-center justify-between",
                  subjectId === sub.id ? "bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <div className="flex flex-col pr-4">
                  {sub.code && sub.code !== 'UNK' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6F6F6F] mb-0.5">
                      {sub.code}
                    </span>
                  )}
                  <span className="text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF]">
                    {sub.name}
                  </span>
                </div>
                {subjectId === sub.id && <Check className="w-5 h-5 shrink-0 text-[#111111] dark:text-[#FFFFFF]" />}
              </button>
            ))}
            {filteredSubjects.length === 0 && (
              <div className="p-8 text-center text-[13px] text-[#6F6F6F]">
                No subjects found.
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        title="PRIORITY LEVEL"
      >
        <div className="flex flex-col -mx-5 sm:-mx-6 -mb-5 sm:-mb-6">
          <div className="flex-1 bg-[#F7F7F5] dark:bg-[#1A1A1A]">
            {(['High', 'Medium', 'Low'] as HomeworkPriority[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPriority(p);
                  setShowPriorityModal(false);
                }}
                className={clsx(
                  "w-full text-left p-4 sm:p-5 border-b border-[#D9D9D6] dark:border-[#333333] bg-white dark:bg-[#111111] transition-colors flex items-center justify-between",
                  priority === p ? "bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <span className="text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF]">
                  {p}
                </span>
                {priority === p && <Check className="w-5 h-5 shrink-0 text-[#111111] dark:text-[#FFFFFF]" />}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="STATUS"
      >
        <div className="flex flex-col -mx-5 sm:-mx-6 -mb-5 sm:-mb-6">
          <div className="flex-1 bg-[#F7F7F5] dark:bg-[#1A1A1A]">
            {(['Not Started', 'In Progress', 'Completed'] as HomeworkStatus[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setShowStatusModal(false);
                }}
                className={clsx(
                  "w-full text-left p-4 sm:p-5 border-b border-[#D9D9D6] dark:border-[#333333] bg-white dark:bg-[#111111] transition-colors flex items-center justify-between",
                  status === s ? "bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <span className="text-[14px] font-semibold text-[#111111] dark:text-[#FFFFFF]">
                  {s}
                </span>
                {status === s && <Check className="w-5 h-5 shrink-0 text-[#111111] dark:text-[#FFFFFF]" />}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};