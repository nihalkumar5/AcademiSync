'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Subject } from '@/lib/types';
import { SubjectModal } from './SubjectModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import {
  BookOpen,
  Plus,
  MapPin,
  User,
  Mail,
  Backpack,
  Edit2,
  Trash2,
  FlaskConical,
} from 'lucide-react';

import { getSubjectCardTheme } from '@/lib/cardColors';

export const SubjectListView: React.FC = () => {
  const { subjects, deleteSubject, profile } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);

  return (
    <div className="flex flex-col gap-6 text-left max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#151515] dark:text-[#F4F4F6] tracking-tight">
              Enrolled Subjects
            </h2>
            <Badge variant="neutral" size="sm">
              {subjects.length} courses · {totalCredits} credits
            </Badge>
          </div>
          <p className="text-xs text-[#737373] dark:text-[#94A3B8] mt-0.5">
            {profile.programme} {profile.branch} Semester {profile.semester} Curriculum
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditSubject(null);
            setShowModal(true);
          }}
          className="gap-1.5 rounded-[3px] bg-[#111111] text-white dark:bg-white dark:text-[#111111]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subject</span>
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-5 h-5" />}
          title="No subjects registered"
          description="Add your enrolled subjects and configure required carry items for each course."
          actionLabel="Add Subject"
          onAction={() => {
            setEditSubject(null);
            setShowModal(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map((sub) => {
            const theme = getSubjectCardTheme({
              subjectName: sub.name,
              subjectCode: sub.code,
              subjectColor: sub.color,
              isLab: sub.isLab,
            });

            return (
              <div
                key={sub.id}
                className="group relative p-5 rounded-[3px] border border-black/[0.04] dark:border-white/[0.04] shadow-none flex flex-col justify-between transition-all overflow-hidden"
                style={{
                  borderLeft: `4px solid ${theme.accent}`,
                }}
              >
                {/* Direct Solid Pastel Backgrounds for Light & Dark mode */}
                <div 
                  className="dark:hidden absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundColor: theme.bg }}
                />
                <div 
                  className="hidden dark:block absolute inset-0 z-0 pointer-events-none"
                  style={{ backgroundColor: theme.darkBg }}
                />

                <div className="relative z-10">
                  {/* Header: Code, Badges & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {sub.code && sub.code !== 'UNK' && (
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px]"
                          style={{
                            backgroundColor: theme.badgeBg,
                            color: theme.badgeText,
                          }}
                        >
                          {sub.code}
                        </span>
                      )}
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-[2px] bg-white/70 dark:bg-black/30 border border-black/[0.06] dark:border-white/[0.08] text-[#151515] dark:text-[#E2E8F0]">
                        {sub.credits} Credits
                      </span>
                      {sub.isLab && (
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 uppercase rounded-[2px] bg-[#D2F1E8] text-[#18A889]">
                          LAB
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditSubject(sub);
                          setShowModal(true);
                        }}
                        className="p-1 text-[#737373] hover:text-[#151515] dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/[0.06] cursor-pointer"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSubject(sub.id)}
                        className="p-1 text-[#737373] hover:text-[#C94B5C] rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Name */}
                  <h3 className="text-[16px] sm:text-[17px] font-bold text-[#151515] dark:text-[#F4F4F6] tracking-tight mt-2.5">
                    {sub.name}
                  </h3>

                  {/* Faculty & Classroom */}
                  <div className="flex flex-col gap-1 mt-2.5 text-xs text-[#737373] dark:text-[#94A3B8]">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-medium text-[#151515] dark:text-[#CBD5E1]">
                        {sub.facultyName || 'No Faculty Specified'}
                      </span>
                      {sub.facultyEmail && (
                        <span className="text-[11px] font-mono opacity-70">
                          ({sub.facultyEmail})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 opacity-70" />
                      <span>
                        Room: <strong className="font-semibold text-[#151515] dark:text-white">{sub.room}</strong>
                        {sub.isLab && sub.labRoom && ` · Lab: ${sub.labRoom}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Carry Requirements Footer */}
                <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#737373] dark:text-[#94A3B8] mb-1.5">
                    <Backpack className="w-3.5 h-3.5 text-[#18A889]" />
                    <span>Configured Things to Carry:</span>
                  </div>

                  {sub.carryRequirements && sub.carryRequirements.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {sub.carryRequirements.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-[10.5px] px-2 py-0.5 rounded-[2px] bg-white/80 dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] text-[#151515] dark:text-[#CBD5E1] font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#737373]/70 dark:text-[#64748B] italic">
                      No carry requirements configured
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubjectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        subjectToEdit={editSubject}
      />
    </div>
  );
};
