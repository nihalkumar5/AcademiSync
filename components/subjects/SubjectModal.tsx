'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Subject } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, X, Backpack, Sparkles, Check } from '@/components/ui/icons';

import { PASTEL_THEMES, THEME_KEYS } from '@/lib/cardColors';
import { ClassCard } from '../timetable/ClassCard';

export interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: Subject | null;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  subjectToEdit,
}) => {
  const { addSubject, updateSubject, profile, isBatchCR, currentBatchData } = useApp();

  const isBatchSubject = !!subjectToEdit && !!currentBatchData?.subjects?.some((b: Subject) => 
    b.id === subjectToEdit.id || 
    (b.code && subjectToEdit.code && b.code.trim().toUpperCase() === subjectToEdit.code.trim().toUpperCase()) ||
    b.name.trim().toLowerCase() === subjectToEdit.name.trim().toLowerCase()
  );
  const isReadOnlyOfficial = isBatchSubject && profile.isBatchSynced && !isBatchCR;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shortName, setShortName] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [room, setRoom] = useState('LT-1');
  const [credits, setCredits] = useState(4);
  const [color, setColor] = useState('#334CC4');
  const [isLab, setIsLab] = useState(false);
  const [isElective, setIsElective] = useState(false);
  const [labRoom, setLabRoom] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [syllabusLink, setSyllabusLink] = useState('');
  const [notes, setNotes] = useState('');
  const [carryReqs, setCarryReqs] = useState<string[]>([]);
  const [newCarryInput, setNewCarryInput] = useState('');

  const carryPresets = [
    'Laptop (Charged)',
    'Lecture Notebook',
    'Lab Manual / Record',
    'Scientific Calculator',
    'Graph Sheet & Pen',
    'Drawing Instruments',
  ];

  const defaultColors = THEME_KEYS.map((key) => ({
    key,
    name: PASTEL_THEMES[key].name,
    value: PASTEL_THEMES[key].accent,
    bg: PASTEL_THEMES[key].bg,
    border: PASTEL_THEMES[key].border || PASTEL_THEMES[key].accent,
  }));

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setCode(subjectToEdit.code);
      setShortName(subjectToEdit.shortName);
      setFacultyName(subjectToEdit.facultyName);
      setFacultyEmail(subjectToEdit.facultyEmail || '');
      setRoom(subjectToEdit.room);
      setCredits(subjectToEdit.credits);
      setColor(subjectToEdit.color || '#334CC4');
      setIsLab(subjectToEdit.isLab || false);
      setIsElective(subjectToEdit.isElective || false);
      setLabRoom(subjectToEdit.labRoom || '');
      setDriveLink(subjectToEdit.driveLink || '');
      setSyllabusLink(subjectToEdit.syllabusLink || '');
      setNotes(subjectToEdit.notes || '');
      setCarryReqs(subjectToEdit.carryRequirements || []);
    } else {
      setName('');
      setCode('');
      setShortName('');
      setFacultyName('');
      setFacultyEmail('');
      setRoom('LT-1');
      setCredits(4);
      setColor('#334CC4');
      setIsLab(false);
      setIsElective(false);
      setLabRoom('');
      setDriveLink('');
      setSyllabusLink('');
      setNotes('');
      setCarryReqs(['Laptop (Charged)', 'Lecture Notebook']);
    }
  }, [subjectToEdit, isOpen]);

  const handleAddCarryItem = (textToAdd?: string) => {
    const val = (textToAdd || newCarryInput).trim();
    if (!val) return;
    if (!carryReqs.includes(val)) {
      setCarryReqs([...carryReqs, val]);
    }
    if (!textToAdd) setNewCarryInput('');
  };

  const handleRemoveCarryItem = (index: number) => {
    setCarryReqs(carryReqs.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const computedShortName =
      shortName.trim() ||
      name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 5);

    const subjectData = {
      name: name.trim(),
      code: code.trim().toUpperCase() || '',
      shortName: computedShortName,
      facultyName: facultyName.trim() || 'Faculty Member',
      facultyEmail: facultyEmail.trim() || undefined,
      room: room.trim() || 'LT-1',
      credits: Number(credits) || 3,
      color,
      isLab,
      isElective,
      labRoom: isLab ? labRoom.trim() || room.trim() : undefined,
      driveLink: driveLink.trim() || undefined,
      syllabusLink: syllabusLink.trim() || undefined,
      notes: notes.trim() || undefined,
      carryRequirements: carryReqs,
      isCustomColor: true,
      isCustomRoom: isBatchCR ? true : false,
    };

    if (subjectToEdit) {
      updateSubject(subjectToEdit.id, subjectData);
    } else {
      addSubject(subjectData);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReadOnlyOfficial ? 'Customize Subject Color' : (subjectToEdit ? 'Edit Subject Details' : 'Add New Subject')}
      description={isReadOnlyOfficial ? 'Select your preferred pastel theme for this official course.' : 'Configure subject code, faculty, classroom, and things to carry.'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        {isReadOnlyOfficial && (
          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 rounded-none flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">Official Batch Course</span>
              <span className="text-[12px] opacity-90 leading-relaxed">
                Curriculum details, room number ({room}), and faculty are synced with your batch schedule. You have full permission to choose your <strong>personal pastel color theme</strong> below.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Subject Name"
              placeholder="e.g. Machine Learning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isReadOnlyOfficial}
              autoFocus={!isReadOnlyOfficial}
            />
          </div>
          <Input
            label="Course Code"
            placeholder="e.g. CS302"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isReadOnlyOfficial}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Short Name / Acronym"
            placeholder="e.g. ML"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={isReadOnlyOfficial}
          />
          <Input
            label="Default Classroom"
            placeholder="e.g. LT-1, Room 204"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
            disabled={isReadOnlyOfficial}
          />
          <Input
            label="Credits"
            type="number"
            min={1}
            max={6}
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            required
            disabled={isReadOnlyOfficial}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Faculty In-Charge"
            placeholder="e.g. Dr. Debanjan Sadhukhan"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
            disabled={isReadOnlyOfficial}
          />
          <Input
            label="Faculty Email (Optional)"
            placeholder="e.g. debanjan@iiitnr.ac.in"
            type="email"
            value={facultyEmail}
            onChange={(e) => setFacultyEmail(e.target.value)}
            disabled={isReadOnlyOfficial}
          />
        </div>

        {/* Course Links & Materials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Notes / Drive / Classroom Link (Optional)"
            placeholder="e.g. https://drive.google.com/..."
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
          />
          <Input
            label="Syllabus / Reference Link (Optional)"
            placeholder="e.g. https://curriculum.edu/..."
            type="url"
            value={syllabusLink}
            onChange={(e) => setSyllabusLink(e.target.value)}
          />
        </div>

        <Input
          label="Subject Notes / Description (Optional)"
          placeholder="e.g. 75% attendance criteria, 3 quizzes + Midsem"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Colour: swatch row + preview that mirrors the subject card */}
        {(() => {
          const curCol = (color || '').toLowerCase().trim();
          const selected = defaultColors.find((c) =>
            curCol === c.value.toLowerCase() ||
            curCol === c.key.toLowerCase() ||
            curCol === c.bg.toLowerCase()
          );
          const isCustom = !selected;
          return (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold text-fg">Colour</span>
                <span className="text-[13px] text-muted">
                  {isCustom ? 'Custom' : selected!.name}
                </span>
              </div>

              <div role="radiogroup" aria-label="Subject colour" className="flex flex-wrap gap-2.5">
                {defaultColors.map((c) => {
                  const on = selected?.key === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setColor(c.value)}
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 ring-offset-2 ring-offset-white dark:ring-offset-[#121317] ${
                        on ? 'ring-2' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value, ['--tw-ring-color' as any]: c.value }}
                    >
                      {on && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </button>
                  );
                })}

                {/* Custom colour: native picker behind a rainbow swatch */}
                <label
                  title="Custom colour"
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ring-offset-2 ring-offset-white dark:ring-offset-[#121317] ${
                    isCustom ? 'ring-2' : 'hover:scale-105'
                  } transition-transform`}
                  style={{
                    background: isCustom
                      ? color
                      : 'conic-gradient(#ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)',
                    ['--tw-ring-color' as any]: isCustom ? color : 'transparent',
                  }}
                >
                  {isCustom ? (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-surface flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-fg" />
                    </span>
                  )}
                  <input
                    type="color"
                    aria-label="Custom colour"
                    value={color && color.startsWith('#') ? color : '#334CC4'}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>

              {/* Preview: the real timetable card, so it always matches */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-muted">
                  Preview in timetable
                </span>
                <div className="pointer-events-none">
                  <ClassCard
                    canModify={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    session={{
                      id: 'preview',
                      subjectId: 'preview',
                      day: 'Monday',
                      startTime: '09:00',
                      endTime: isLab ? '10:55' : '09:55',
                      room: (isLab && labRoom.trim()) || room.trim() || 'LT-1',
                      isLab,
                    } as any}
                    subject={{
                      id: 'preview',
                      name: name.trim() || 'Subject name',
                      code: code.trim() || 'CODE',
                      color,
                      isLab,
                      facultyName: facultyName.trim() || 'Faculty',
                      room: room.trim() || 'LT-1',
                      labRoom,
                    } as any}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Lab Toggle */}
        <div className="flex flex-col gap-2 p-3 rounded-none bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="subIsLab"
              checked={isLab}
              onChange={(e) => setIsLab(e.target.checked)}
              className="w-4 h-4 rounded-none accent-black dark:accent-white cursor-pointer"
            />
            <label htmlFor="subIsLab" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
              Includes Practical Lab Sessions
            </label>
          </div>
          {isLab && (
            <Input
              label="Specific Lab Room"
              placeholder="e.g. AI & Vision Lab, CC-Lab 2"
              value={labRoom}
              onChange={(e) => setLabRoom(e.target.value)}
            />
          )}
        </div>

        {/* Elective Course Toggle */}
        <div className="flex flex-col gap-1.5 p-3 rounded-none bg-[#8067B5]/10 border border-[#8067B5]/30">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="subIsElective"
              checked={isElective}
              onChange={(e) => setIsElective(e.target.checked)}
              className="w-4 h-4 rounded-none accent-[#8067B5] cursor-pointer"
            />
            <label htmlFor="subIsElective" className="text-xs font-semibold text-fg cursor-pointer flex items-center gap-1.5">
              <span>Elective Course (Department / Open / Minor)</span>
              <span className="text-[12px] px-1.5 py-0.5 bg-[#8067B5]/20 text-[#8067B5] dark:text-[#C084FC] font-bold ">Elective</span>
            </label>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-6">
            Students can choose whether to enroll in this elective so it only appears in attending students&apos; routines.
          </p>
        </div>

        {/* Things to Carry Requirements */}
        <div className="flex flex-col gap-2 p-3.5 rounded-none bg-[#111111]/[0.03] dark:bg-white/[0.03] border border-line">
          <div className="flex items-center gap-1.5">
            <Backpack className="w-4 h-4 text-[#18A889]" />
            <h4 className="text-xs font-bold text-fg">
              Required Things to Carry for this Subject
            </h4>
          </div>
          <p className="text-[11px] text-muted">
            These items will automatically appear in your &quot;Carry Bag&quot; whenever this subject is scheduled.
          </p>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[11px] font-bold text-faint self-center mr-1">
              Quick Add:
            </span>
            {carryPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddCarryItem(preset)}
                className="text-[11px] font-medium px-2 py-0.5 rounded-none bg-surface border border-zinc-200 dark:border-zinc-700 hover:border-black/30 dark:hover:border-white/30 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              placeholder="e.g. Custom Item (e.g. Hardware Board, Record Book)"
              value={newCarryInput}
              onChange={(e) => setNewCarryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCarryItem();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-none text-fg placeholder:text-zinc-400 focus:outline-none"
            />
            <Button type="button" size="sm" variant="secondary" onClick={() => handleAddCarryItem()}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {carryReqs.map((req, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium"
              >
                <span>{req}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCarryItem(idx)}
                  className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {isReadOnlyOfficial ? 'Save Color Theme' : (subjectToEdit ? 'Save Changes' : 'Create Subject')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
