'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Subject } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, X, Backpack, Sparkles } from 'lucide-react';

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
  const { addSubject, updateSubject } = useApp();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shortName, setShortName] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [room, setRoom] = useState('LT-1');
  const [credits, setCredits] = useState(4);
  const [color, setColor] = useState('#3B82F6');
  const [isLab, setIsLab] = useState(false);
  const [labRoom, setLabRoom] = useState('');
  const [carryReqs, setCarryReqs] = useState<string[]>([]);
  const [newCarryInput, setNewCarryInput] = useState('');

  const defaultColors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ];

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setCode(subjectToEdit.code);
      setShortName(subjectToEdit.shortName);
      setFacultyName(subjectToEdit.facultyName);
      setFacultyEmail(subjectToEdit.facultyEmail || '');
      setRoom(subjectToEdit.room);
      setCredits(subjectToEdit.credits);
      setColor(subjectToEdit.color);
      setIsLab(subjectToEdit.isLab || false);
      setLabRoom(subjectToEdit.labRoom || '');
      setCarryReqs(subjectToEdit.carryRequirements || []);
    } else {
      setName('');
      setCode('');
      setShortName('');
      setFacultyName('');
      setFacultyEmail('');
      setRoom('LT-1');
      setCredits(4);
      setColor('#3B82F6');
      setIsLab(false);
      setLabRoom('');
      setCarryReqs(['Laptop (Charged)', 'Lecture Notebook']);
    }
  }, [subjectToEdit, isOpen]);

  const handleAddCarryItem = () => {
    if (!newCarryInput.trim()) return;
    if (!carryReqs.includes(newCarryInput.trim())) {
      setCarryReqs([...carryReqs, newCarryInput.trim()]);
    }
    setNewCarryInput('');
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
      code: code.trim().toUpperCase() || 'CS300',
      shortName: computedShortName,
      facultyName: facultyName.trim() || 'Faculty Member',
      facultyEmail: facultyEmail.trim() || undefined,
      room: room.trim() || 'LT-1',
      credits: Number(credits) || 3,
      color,
      isLab,
      labRoom: isLab ? labRoom.trim() || room.trim() : undefined,
      carryRequirements: carryReqs,
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
      title={subjectToEdit ? 'Edit Subject Details' : 'Add New Subject'}
      description="Configure subject code, faculty, classroom, and things to carry."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Subject Name"
              placeholder="e.g. Machine Learning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Input
            label="Course Code"
            placeholder="e.g. CS302"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Short Name / Acronym"
            placeholder="e.g. ML"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
          />
          <Input
            label="Default Classroom"
            placeholder="e.g. LT-1, Room 204"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            required
          />
          <Input
            label="Credits"
            type="number"
            min={1}
            max={6}
            value={credits}
            onChange={(e) => setCredits(Number(e.target.value))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Faculty In-Charge"
            placeholder="e.g. Dr. Debanjan Sadhukhan"
            value={facultyName}
            onChange={(e) => setFacultyName(e.target.value)}
          />
          <Input
            label="Faculty Email (Optional)"
            placeholder="e.g. debanjan@iiitnr.ac.in"
            type="email"
            value={facultyEmail}
            onChange={(e) => setFacultyEmail(e.target.value)}
          />
        </div>

        {/* Color Picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Subject Theme Tag Color
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {defaultColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center border border-white/20"
                style={{ backgroundColor: c }}
              >
                {color === c && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* Lab Toggle */}
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="subIsLab"
              checked={isLab}
              onChange={(e) => setIsLab(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="subIsLab" className="text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer">
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

        {/* Things to Carry Requirements (Critical Requirement) */}
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
          <div className="flex items-center gap-1.5">
            <Backpack className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Required Things to Carry for this Subject
            </h4>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            These items will automatically appear in your &quot;Tomorrow&apos;s Bag&quot; whenever this subject is scheduled.
          </p>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              placeholder="e.g. Laptop (CUDA), Lab Manual, Record Diary, Calculator"
              value={newCarryInput}
              onChange={(e) => setNewCarryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCarryItem();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Button type="button" size="sm" variant="secondary" onClick={handleAddCarryItem}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {carryReqs.map((req, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
              >
                <span>{req}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCarryItem(idx)}
                  className="text-zinc-400 hover:text-rose-500"
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
            {subjectToEdit ? 'Save Changes' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
