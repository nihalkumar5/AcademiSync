'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TaskFile, deleteTaskFile, isAllowedTaskFile, saveTaskFile, MAX_TASK_FILE_MB } from '@/lib/taskFiles';
import { FileTile } from '../homework/AddHomeworkModal';
import { FileText, Upload } from '@/components/ui/icons';
import { useApp } from '@/context/AppContext';
import { Subject } from '@/lib/types';
import { Modal } from '../ui/Modal';
import { Plus, X, Check } from '@/components/ui/icons';

import { PASTEL_THEMES, THEME_KEYS } from '@/lib/cardColors';
import { ClassCard } from '../timetable/ClassCard';

// Form pieces live outside the modal so inputs keep focus while typing
const field = 'w-full h-11 px-3 border border-line bg-surface text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-fg transition-colors disabled:bg-surface-2 disabled:text-muted';
const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block mb-1.5 text-[12px] font-semibold text-muted">
    {children}
  </label>
);
const Section: React.FC<{ title: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="flex flex-col gap-f3">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-fg tracking-tight">{title}</h3>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
    {children}
  </section>
);
const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ on, onChange, label, hint }) => (
  <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="w-full flex items-center gap-3 text-left cursor-pointer">
    <span className="flex-1 min-w-0">
      <span className="block text-[14px] font-medium text-fg">{label}</span>
      {hint && <span className="block mt-0.5 text-[12px] text-muted">{hint}</span>}
    </span>
    <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${on ? 'bg-ink' : 'bg-black/15 dark:bg-white/15'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </button>
);


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
  const [syllabusFiles, setSyllabusFiles] = useState<TaskFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const syllabusRef = useRef<HTMLInputElement>(null);
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
      setSyllabusFiles(subjectToEdit.syllabusFiles || []);
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
      setSyllabusFiles([]);
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
      syllabusFiles,
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

  const [moreOpen, setMoreOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setMoreOpen(!!(subjectToEdit?.driveLink || subjectToEdit?.syllabusLink || subjectToEdit?.notes || subjectToEdit?.isElective));
    setEmailOpen(!!subjectToEdit?.facultyEmail);
  }, [isOpen, subjectToEdit]);

  const curCol = (color || '').toLowerCase().trim();
  const selected = defaultColors.find((c) => curCol === c.value.toLowerCase() || curCol === c.key.toLowerCase() || curCol === c.bg.toLowerCase());
  const isCustom = !selected;
  const ro = isReadOnlyOfficial;

  const addSyllabus = async (list: FileList | null) => {
    const files = Array.from(list || []).filter(isAllowedTaskFile).filter((f) => f.size <= MAX_TASK_FILE_MB * 1024 * 1024).slice(0, 4 - syllabusFiles.length);
    if (!files.length) return;
    setUploading(true);
    try {
      const saved: TaskFile[] = [];
      for (const f of files) saved.push(await saveTaskFile(f));
      setSyllabusFiles((cur) => [...cur, ...saved]);
    } finally {
      setUploading(false);
    }
  };

  const footer = (
    <div className="px-5 sm:px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+8px),12px)] flex items-center gap-2">
      <button type="button" onClick={onClose} className="btn btn-secondary btn-lg">
        Cancel
      </button>
      <button type="submit" form="subject-form" disabled={!name.trim()} className="btn btn-primary btn-lg flex-1 min-w-0">
        {ro ? 'Save colour' : subjectToEdit ? 'Save changes' : 'Add subject'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ro ? 'Your subject colour' : subjectToEdit ? 'Edit subject' : 'New subject'}
      maxWidth="lg"
      mobileFullSheet
      footer={footer}
    >
      <form id="subject-form" onSubmit={handleSubmit} className="flex flex-col gap-f5 text-left">
        {/* What it will look like: the real timetable card */}
        <div className="pointer-events-none" aria-hidden="true">
          <ClassCard
            canModify={false}
            onEdit={() => {}}
            onDelete={() => {}}
            session={{ id: 'preview', subjectId: 'preview', day: 'Monday', startTime: '09:00', endTime: isLab ? '10:55' : '09:55', room: (isLab && labRoom.trim()) || room.trim() || 'Room', isLab } as any}
            subject={{ id: 'preview', name: name.trim() || 'Subject name', code: code.trim() || 'CODE', color, isLab, facultyName: facultyName.trim() || 'Teacher', room: room.trim() || 'Room', labRoom } as any}
          />
        </div>

        {ro && (
          <p className="-mt-2 text-[13px] leading-[19px] text-muted">
            Official course of your batch: name, room and teacher come from your batch pilot. The colour and your bag list are yours.
          </p>
        )}

        {!ro && (
          <Section title="Subject">
            <div>
              <Label htmlFor="sub-name">Name</Label>
              <input id="sub-name" className={field} placeholder="e.g. Machine Learning" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={!subjectToEdit} />
            </div>
            <div className="grid grid-cols-[1fr_1fr_76px] gap-2">
              <div>
                <Label htmlFor="sub-code">Course code</Label>
                <input id="sub-code" className={field} placeholder="CS302" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sub-short">Short name</Label>
                <input id="sub-short" className={field} placeholder="ML" value={shortName} onChange={(e) => setShortName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sub-credits">Credits</Label>
                <input id="sub-credits" className={field} type="number" inputMode="numeric" min={0} max={10} value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
              </div>
            </div>
          </Section>
        )}

        {!ro && (
          <Section title="Class">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="sub-room">Room</Label>
                <input id="sub-room" className={field} placeholder="e.g. LT-1, Room 204" value={room} onChange={(e) => setRoom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sub-fac">Teacher</Label>
                <input id="sub-fac" className={field} placeholder="e.g. Dr. Sharma" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} />
              </div>
            </div>
            {emailOpen ? (
              <div>
                <Label htmlFor="sub-email">Teacher&apos;s email</Label>
                <input id="sub-email" className={field} type="email" placeholder="name@college.ac.in" value={facultyEmail} onChange={(e) => setFacultyEmail(e.target.value)} />
              </div>
            ) : (
              <button type="button" onClick={() => setEmailOpen(true)} className="self-start inline-flex items-center gap-1 text-[13px] font-semibold text-fg-2 hover:text-fg cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Teacher&apos;s email
              </button>
            )}
            <div className="border-t border-line-soft pt-f3 flex flex-col gap-f3">
              <Switch on={isLab} onChange={setIsLab} label="Has lab sessions" hint="Lab classes show their own room" />
              {isLab && (
                <div>
                  <Label htmlFor="sub-lab">Lab room</Label>
                  <input id="sub-lab" className={field} placeholder="e.g. AI Lab, CC-Lab 2" value={labRoom} onChange={(e) => setLabRoom(e.target.value)} />
                </div>
              )}
            </div>
          </Section>
        )}

        <Section title="Colour" hint={isCustom ? 'Custom' : selected!.name}>
          <div role="radiogroup" aria-label="Subject colour" className="flex flex-wrap gap-2">
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 ring-offset-2 ring-offset-surface ${on ? 'ring-2' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c.value, ['--tw-ring-color' as any]: c.value }}
                >
                  {on && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
              );
            })}
            <label
              title="Custom colour"
              className={`relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ring-offset-2 ring-offset-surface transition-transform ${isCustom ? 'ring-2' : 'hover:scale-105'}`}
              style={{
                background: isCustom ? color : 'conic-gradient(#ef4444, #f59e0b, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)',
                ['--tw-ring-color' as any]: isCustom ? color : 'transparent',
              }}
            >
              {isCustom ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <span className="w-5 h-5 rounded-full bg-surface flex items-center justify-center"><Plus className="w-3 h-3 text-fg" /></span>}
              <input type="color" aria-label="Custom colour" value={color && color.startsWith('#') ? color : '#334CC4'} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>
        </Section>

        <Section title="In your bag" hint="Shows up the evening before this class">
          {carryReqs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {carryReqs.map((req, idx) => (
                <span key={`${req}_${idx}`} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 bg-ink text-on-ink text-[13px] font-medium">
                  {req}
                  <button type="button" onClick={() => handleRemoveCarryItem(idx)} aria-label={`Remove ${req}`} className="w-5 h-5 flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {carryPresets.some((p) => !carryReqs.includes(p)) && (
            <div className="flex flex-wrap gap-1.5">
              {carryPresets
                .filter((p) => !carryReqs.includes(p))
                .map((preset) => (
                  <button key={preset} type="button" onClick={() => handleAddCarryItem(preset)} className="inline-flex items-center gap-1 h-8 px-2.5 bg-surface-2 text-[13px] font-medium text-fg-2 hover:text-fg cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> {preset}
                  </button>
                ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={field}
              placeholder="Something else, e.g. Breadboard"
              value={newCarryInput}
              onChange={(e) => setNewCarryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCarryItem();
                }
              }}
            />
            <button type="button" onClick={() => handleAddCarryItem()} disabled={!newCarryInput.trim()} className="btn btn-secondary h-11 shrink-0">
              Add
            </button>
          </div>
        </Section>

        <Section title="Syllabus" hint="PDF or photos · kept on this phone">
          {syllabusFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {syllabusFiles.map((f) => (
                <FileTile
                  key={f.id}
                  file={f}
                  onRemove={() => {
                    deleteTaskFile(f.id);
                    setSyllabusFiles((cur) => cur.filter((x) => x.id !== f.id));
                  }}
                />
              ))}
            </div>
          )}
          {syllabusFiles.length < 4 && (
            <button
              type="button"
              onClick={() => syllabusRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-3 px-f3 h-14 border border-dashed border-line bg-surface-2/40 hover:bg-surface-2 text-left transition-colors cursor-pointer disabled:opacity-60"
            >
              <span className="w-9 h-9 shrink-0 flex items-center justify-center bg-surface border border-line">
                {syllabusFiles.length ? <Upload className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold text-fg">{uploading ? 'Saving…' : syllabusFiles.length ? 'Add another page' : 'Upload syllabus'}</span>
                <span className="block text-[12px] text-muted">Open it any time from this subject</span>
              </span>
            </button>
          )}
          <input ref={syllabusRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => { addSyllabus(e.target.files); e.target.value = ''; }} />
        </Section>

        {/* Less used: links, notes, elective */}
        <section className="border-t border-line pt-f3">
          <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className="w-full flex items-center justify-between gap-3 h-9 text-left cursor-pointer">
            <span className="text-[15px] font-semibold text-fg">Links and notes</span>
            <span className="text-[13px] text-muted">{moreOpen ? 'Hide' : 'Add'}</span>
          </button>
          {moreOpen && (
            <div className="mt-f3 flex flex-col gap-f3">
              <div>
                <Label htmlFor="sub-drive">Drive / Classroom link</Label>
                <input id="sub-drive" className={field} type="url" placeholder="https://" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sub-syl">Syllabus link (if it’s online)</Label>
                <input id="sub-syl" className={field} type="url" placeholder="https://" value={syllabusLink} onChange={(e) => setSyllabusLink(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="sub-notes">Notes</Label>
                <textarea id="sub-notes" rows={2} className={`${field} h-auto py-2.5 resize-none`} placeholder="e.g. 75% attendance needed, 3 quizzes + midsem" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {!ro && (
                <div className="border-t border-line-soft pt-f3">
                  <Switch on={isElective} onChange={setIsElective} label="Elective" hint="Students pick it in Your electives. Group slots in Electives setup." />
                </div>
              )}
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
};
