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
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Enrolled Subjects
            </h2>
            <Badge variant="neutral" size="sm">
              {subjects.length} courses · {totalCredits} credits
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
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
          className="gap-1.5"
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
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="group p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm flex flex-col justify-between transition-all"
            >
              <div>
                {/* Header: Code & Action Buttons */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: `${sub.color}15`,
                        color: sub.color,
                        border: `1px solid ${sub.color}30`,
                      }}
                    >
                      {sub.code}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {sub.credits} Credits
                    </Badge>
                    {sub.isLab && (
                      <Badge variant="amber" size="sm">
                        <FlaskConical className="w-3 h-3 mr-1" />
                        Practical Lab
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditSubject(sub);
                        setShowModal(true);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSubject(sub.id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subject Name */}
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-2">
                  {sub.name}
                </h3>

                {/* Faculty & Classroom */}
                <div className="flex flex-col gap-1 mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {sub.facultyName}
                    </span>
                    {sub.facultyEmail && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        ({sub.facultyEmail})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>
                      Room: <strong>{sub.room}</strong>
                      {sub.isLab && sub.labRoom && ` · Lab: ${sub.labRoom}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Carry Requirements Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  <Backpack className="w-3.5 h-3.5 text-blue-500" />
                  <span>Configured Things to Carry:</span>
                </div>

                {sub.carryRequirements && sub.carryRequirements.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sub.carryRequirements.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10.5px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">
                    No carry requirements configured
                  </span>
                )}
              </div>
            </div>
          ))}
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
