'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { getAuthHeaders } from '@/lib/authHeaders';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { btn, surface, divider, muted, strong, PageTitle, SectionHead, Badge, SearchField, Empty } from '@/components/admin/AdminUI';
import { AlertTriangle, CalendarRange, Copy, Edit2, Layers, Loader2, Plus, Trash2, Upload, X } from '@/components/ui/icons';
import { prepareAiUpload, readAiResponse } from '@/lib/fileCompressor';
import { CampusCalendar, CalendarYears, SetupBatch, expandCalendar, yearLabel, yearsLabel } from '@/lib/campusSetup';

// Campus admin → Set up: every batch of the college in one place.
// Changes go live at once for batches without a CR; batches with a CR get them as a request.

type SetupData = { college: string; batches: SetupBatch[]; calendars: CampusCalendar[] };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPES = ['holiday', 'exam', 'event', 'assignment'] as const;
const field = 'h-10 px-2.5 bg-surface border border-line text-[14px] text-fg focus:outline-none focus:border-line-strong min-w-0';
const label = (b: SetupBatch) => [b.programme, b.branch, b.semester ? `Sem ${b.semester}` : ''].filter(Boolean).join(' · ');

const ErrorLine: React.FC<{ msg: string }> = ({ msg }) => (
  <p className="flex items-start gap-2 px-3 py-2.5 border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:border-rose-400/20 dark:text-rose-300 text-[14px]">
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {msg}
  </p>
);

/** Pick photos / a PDF and read them with one of the app's AI readers. */
const ReadFile: React.FC<{ text: string; busy: boolean; onFiles: (files: File[]) => void }> = ({ text, busy, onFiles }) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) onFiles(f); }} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="w-full flex items-center justify-center gap-2 h-20 border border-dashed border-line text-[14px] font-medium text-fg hover:bg-surface-2 cursor-pointer disabled:cursor-default">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? 'Reading… this takes a few seconds' : text}
      </button>
    </>
  );
};

export const CampusSetup: React.FC<{ withPreview: (p: string) => string; openBatch?: string | null; onOpened?: () => void }> = ({ withPreview, openBatch, onOpened }) => {
  const { showToast } = useApp() as any;
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [ttBatch, setTtBatch] = useState<SetupBatch | null>(null);
  const [calEdit, setCalEdit] = useState<CampusCalendar | 'new' | null>(null);
  const [calDelete, setCalDelete] = useState<CampusCalendar | null>(null);
  const [crBatch, setCrBatch] = useState<SetupBatch | null>(null);

  const api = useCallback(
    async (method: 'GET' | 'POST', body?: any, q = '') => {
      const res = await fetch(withPreview(`/api/campus-admin/setup${q}`), { method, headers: await getAuthHeaders(), cache: 'no-store', ...(body ? { body: JSON.stringify(body) } : {}) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.success === false) throw new Error(d.error || 'Something went wrong. Try again.');
      return d;
    },
    [withPreview]
  );
  const load = useCallback(async () => {
    try {
      setData(await api('GET'));
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }, [api]);
  useEffect(() => {
    load();
  }, [load]);

  // Opened from an approved CR request: go straight to that batch's timetable
  useEffect(() => {
    if (!openBatch || !data) return;
    const b = data.batches.find((x) => x.id === openBatch);
    if (b) setTtBatch(b);
    onOpened?.();
  }, [openBatch, data, onOpened]);

  const byYear = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.batches || []).filter((b) => !q || `${label(b)} ${b.inviteCode} ${b.crNames.join(' ')}`.toLowerCase().includes(q));
    const groups = new Map<string, SetupBatch[]>();
    list.forEach((b) => {
      const k = b.year ? yearLabel(b.year) : 'Other';
      groups.set(k, [...(groups.get(k) || []), b]);
    });
    return Array.from(groups.entries());
  }, [data, query]);

  if (error && !data) return <ErrorLine msg={error} />;
  if (!data)
    return (
      <div className="flex items-center gap-2 text-[14px] text-muted py-f5">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your campus…
      </div>
    );

  const noTimetable = data.batches.filter((b) => b.classes === 0).length;
  const waiting = data.batches.filter((b) => b.pending.length > 0).length;

  return (
    <div className="flex flex-col gap-f5">
      <PageTitle
        title="Set up your campus"
        description="Batches, timetables and academic calendars for every class. Batches without a CR get changes at once; batches with a CR get them as a request their CR approves."
        action={
          <button type="button" onClick={() => setAddOpen(true)} className={btn.primary}>
            <Plus className="w-4 h-4" /> Add batches
          </button>
        }
      />

      <div className="grid grid-cols-3 border border-line bg-surface divide-x divide-line-soft">
        {[
          { v: data.batches.length, l: 'Batches' },
          { v: noTimetable, l: 'Need a timetable', warn: noTimetable > 0 },
          { v: waiting, l: 'Waiting for CR' },
        ].map((s) => (
          <div key={s.l} className="px-3 py-3.5 sm:px-f4">
            <p className={clsx('text-[24px] font-semibold leading-none tabular-nums', s.warn ? 'text-amber-600 dark:text-amber-400' : strong)}>{s.v}</p>
            <p className={`mt-1.5 text-[12px] font-medium ${muted}`}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Calendars */}
      <section>
        <SectionHead
          title="Academic calendars"
          meta="One for everyone, or one per year"
          action={
            <button type="button" onClick={() => setCalEdit('new')} className={btn.ghost}>
              <Plus className="w-4 h-4" /> New
            </button>
          }
        />
        {data.calendars.length === 0 ? (
          <Empty icon={CalendarRange} title="No calendar yet" body="Upload your college's academic calendar once. Every batch of the chosen years gets it." action={<button type="button" onClick={() => setCalEdit('new')} className={btn.primary}>Add calendar</button>} />
        ) : (
          <div className={`${surface} ${divider}`}>
            {data.calendars.map((c) => {
              const linked = data.batches.filter((b) => b.calendarId === c.id).length;
              return (
                <div key={c.id} className="flex items-center gap-3 px-f4 py-3">
                  <CalendarRange className="w-5 h-5 shrink-0 text-fg-2" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] font-medium truncate ${strong}`}>{c.name}</p>
                    <p className={`text-[13px] truncate ${muted}`}>
                      {yearsLabel(c.years)} · {c.events.length} dates · {linked} {linked === 1 ? 'batch' : 'batches'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setCalEdit(c)} className={btn.icon} aria-label={`Edit ${c.name}`}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setCalDelete(c)} className={btn.icon} aria-label={`Delete ${c.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Batches */}
      <section className="flex flex-col gap-f3">
        <SectionHead title="Batches" meta={`${data.batches.length} in ${data.college}`} />
        <SearchField value={query} onChange={setQuery} placeholder="Search branch, semester, code or CR" />
        {data.batches.length === 0 ? (
          <Empty icon={Layers} title="No batches yet" body="Add every branch and semester in one go. Students join with the batch code." action={<button type="button" onClick={() => setAddOpen(true)} className={btn.primary}>Add batches</button>} />
        ) : (
          byYear.map(([year, list]) => (
            <div key={year}>
              <p className={`mb-1.5 text-[12px] font-semibold ${muted}`}>{year}</p>
              <div className={`${surface} ${divider}`}>
                {list.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 px-f4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-medium truncate ${strong}`}>{label(b)}</p>
                      <p className={`text-[13px] truncate ${muted}`}>
                        {b.classes ? `${b.subjects} subjects · ${b.classes} classes` : 'No timetable yet'} · {b.members} {b.members === 1 ? 'student' : 'students'} · {b.hasCr ? `CR: ${b.crNames.join(', ')}` : 'No CR'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {b.pending.map((p) => (
                          <Badge key={p.id} tone="amber" dot>
                            {p.kind === 'timetable' ? 'Timetable' : 'Calendar'} waiting for CR
                          </Badge>
                        ))}
                        {!b.classes && !b.pending.length && <Badge tone="amber">Needs timetable</Badge>}
                      </div>
                    </div>
                    {b.inviteCode && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(b.inviteCode).then(() => showToast?.('Join code copied', `${label(b)} · ${b.inviteCode}`, 'success'))}
                        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2 border border-line font-mono text-[13px] font-semibold text-fg cursor-pointer"
                        title="Copy join code"
                      >
                        {b.inviteCode} <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => setCrBatch(b)} className={btn.ghost}>
                      CR
                    </button>
                    <button type="button" onClick={() => setTtBatch(b)} className={btn.secondary}>
                      Timetable
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <AddBatchesSheet open={addOpen} onClose={() => setAddOpen(false)} data={data} api={api} onDone={load} />
      <CrSheet batch={crBatch} onClose={() => setCrBatch(null)} api={api} onDone={load} />
      <TimetableSheet batch={ttBatch} college={data.college} onClose={() => setTtBatch(null)} api={api} onDone={load} />
      <CalendarSheet editing={calEdit} calendars={data.calendars} onClose={() => setCalEdit(null)} api={api} onDone={load} />
      <ConfirmModal
        isOpen={!!calDelete}
        onClose={() => setCalDelete(null)}
        onConfirm={async () => {
          if (!calDelete) return;
          try {
            await api('POST', { action: 'deleteCalendar', id: calDelete.id });
            showToast?.('Calendar deleted', 'Batches keep the dates they already have', 'success');
            load();
          } catch (e: any) {
            showToast?.("Couldn't delete", e.message, 'error');
          }
          setCalDelete(null);
        }}
        title="Delete this calendar?"
        description="Batches keep the dates they already have. New batches won't get it."
        highlightText={calDelete?.name}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

// ---------- Add batches in bulk ----------
const AddBatchesSheet: React.FC<{ open: boolean; onClose: () => void; data: SetupData; api: any; onDone: () => void }> = ({ open, onClose, data, api, onDone }) => {
  const { showToast } = useApp() as any;
  const programmes = useMemo(() => Array.from(new Set(data.batches.map((b) => b.programme).filter(Boolean))), [data]);
  const knownBranches = useMemo(() => Array.from(new Set(data.batches.map((b) => b.branch).filter(Boolean))).sort(), [data]);
  const [programme, setProgramme] = useState('B.Tech');
  const [branches, setBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState('');
  const [sems, setSems] = useState<number[]>([1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setProgramme(programmes[0] || 'B.Tech');
      setBranches([]);
      setBranchInput('');
      setSems([1]);
      setError('');
    }
  }, [open, programmes]);
  const addBranch = (b: string) => {
    const v = b.trim();
    if (v && !branches.some((x) => x.toLowerCase() === v.toLowerCase())) setBranches((p) => [...p, v]);
    setBranchInput('');
  };
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const all = branchInput.trim() ? [...branches, branchInput.trim()] : branches;
      const d = await api('POST', { action: 'createBatches', programme, branches: all, semesters: sems });
      showToast?.(`${d.created} ${d.created === 1 ? 'batch' : 'batches'} added`, d.skipped ? `${d.skipped} already existed` : 'Share each join code with the class', 'success');
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const count = (branches.length + (branchInput.trim() ? 1 : 0)) * sems.length;
  return (
    <Modal isOpen={open} onClose={onClose} title="Add batches" description="Every branch × semester you pick becomes a batch with its own join code" maxWidth="lg" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-2">Programme</p>
          <input list="cs-programmes" value={programme} onChange={(e) => setProgramme(e.target.value)} className={`${field} w-full`} />
          <datalist id="cs-programmes">{['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BBA', 'MBA', 'B.Sc', 'M.Sc', ...programmes].map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-2">Branches</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {branches.map((b) => (
              <span key={b} className="chip chip-active">
                {b}
                <button type="button" aria-label={`Remove ${b}`} onClick={() => setBranches((p) => p.filter((x) => x !== b))} className="ml-1 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addBranch(branchInput);
              }
            }}
            placeholder="Type a branch and press Enter, e.g. Computer Science and Engineering"
            className={`${field} w-full`}
          />
          {knownBranches.filter((b) => !branches.includes(b)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {knownBranches.filter((b) => !branches.includes(b)).map((b) => (
                <button key={b} type="button" onClick={() => addBranch(b)} className="chip">
                  + {b}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-2">Semesters</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
              <button key={s} type="button" aria-pressed={sems.includes(s)} onClick={() => setSems((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s].sort((a, b) => a - b)))} className={clsx('chip', sems.includes(s) && 'chip-active')}>
                Sem {s}
              </button>
            ))}
          </div>
        </div>
        {error && <ErrorLine msg={error} />}
        <button type="button" onClick={create} disabled={busy || count === 0 || !programme.trim()} className={`${btn.primary} w-full`}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Add {count} {count === 1 ? 'batch' : 'batches'}
        </button>
        <p className={`text-[12px] ${muted}`}>Batches that already exist are skipped. A batch gets the calendar for its year automatically.</p>
      </div>
    </Modal>
  );
};

// ---------- Timetable for one batch ----------
type Row = { day: string; startTime: string; endTime: string; subjectName: string; subjectCode: string; room: string; faculty: string; isLab: boolean };

const TimetableSheet: React.FC<{ batch: SetupBatch | null; college: string; onClose: () => void; api: any; onDone: () => void }> = ({ batch, college, onClose, api, onDone }) => {
  const { showToast } = useApp() as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batch) return;
    setError('');
    setRows([]);
    setLoading(true);
    api('GET', undefined, `?batch=${encodeURIComponent(batch.id)}`)
      .then((d: any) => {
        const subj = new Map((d.subjects || []).map((s: any) => [s.id, s]));
        setRows(
          (d.timetable || []).map((t: any) => {
            const s: any = subj.get(t.subjectId) || {};
            return { day: t.day, startTime: t.startTime, endTime: t.endTime, subjectName: s.name || t.subjectName || '', subjectCode: s.code || '', room: t.room || '', faculty: t.faculty || s.facultyName || '', isLab: !!(t.isLab || s.isLab) };
          })
        );
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [batch, api]);

  const read = async (files: File[]) => {
    if (!batch) return;
    setReading(true);
    setError('');
    try {
      const images = await prepareAiUpload(files, { maxDim: 2200 });
      const res = await fetch('/api/extract-timetable', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ fileName: files[0]?.name, images, studentContext: { college, programme: batch.programme, branch: batch.branch, semester: batch.semester, year: batch.year } }),
      });
      const d = await readAiResponse(res);
      if (!res.ok || !Array.isArray(d.sessions) || !d.sessions.length) throw new Error(d.error || "Couldn't read that timetable. Try a clearer photo.");
      setRows(d.sessions.map((s: any) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime, subjectName: s.subjectName || '', subjectCode: s.subjectCode || '', room: s.room || '', faculty: s.faculty || '', isLab: !!s.isLab })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReading(false);
    }
  };

  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    if (!batch) return;
    setSaving(true);
    setError('');
    try {
      const d = await api('POST', { action: 'setTimetable', batchKey: batch.id, rows });
      showToast?.(d.result === 'applied' ? 'Timetable is live' : 'Sent to the CR', d.result === 'applied' ? `${label(batch)} · ${d.classes} classes` : `${label(batch)} · goes live when the CR approves`, 'success');
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const sorted = rows.map((r, i) => ({ r, i })).sort((a, b) => DAYS.indexOf(a.r.day) - DAYS.indexOf(b.r.day) || a.r.startTime.localeCompare(b.r.startTime));

  return (
    <Modal isOpen={!!batch} onClose={onClose} title={batch ? label(batch) : 'Timetable'} description={batch?.hasCr ? `Changes go to the CR (${batch.crNames.join(', ')}) for approval` : 'No CR yet, so changes go live at once'} maxWidth="4xl" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <ReadFile text={rows.length ? 'Replace from a photo or PDF of the timetable' : 'Upload a photo or PDF of the timetable'} busy={reading} onFiles={read} />
        {loading ? (
          <div className="flex items-center gap-2 text-[14px] text-muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : rows.length > 0 ? (
          <div className="border border-line overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="bg-surface-2 text-left text-muted">
                  {['Day', 'Start', 'End', 'Subject', 'Code', 'Room', 'Lab', ''].map((h) => (
                    <th key={h} className="px-2 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {sorted.map(({ r, i }) => (
                  <tr key={i}>
                    <td className="px-1.5 py-1.5"><select value={r.day} onChange={(e) => set(i, { day: e.target.value })} className={field}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></td>
                    <td className="px-1.5 py-1.5"><input type="time" value={r.startTime} onChange={(e) => set(i, { startTime: e.target.value })} className={`${field} w-[110px]`} /></td>
                    <td className="px-1.5 py-1.5"><input type="time" value={r.endTime} onChange={(e) => set(i, { endTime: e.target.value })} className={`${field} w-[110px]`} /></td>
                    <td className="px-1.5 py-1.5"><input value={r.subjectName} onChange={(e) => set(i, { subjectName: e.target.value })} className={`${field} w-full`} /></td>
                    <td className="px-1.5 py-1.5"><input value={r.subjectCode} onChange={(e) => set(i, { subjectCode: e.target.value })} className={`${field} w-[90px]`} /></td>
                    <td className="px-1.5 py-1.5"><input value={r.room} onChange={(e) => set(i, { room: e.target.value })} className={`${field} w-[90px]`} /></td>
                    <td className="px-1.5 py-1.5 text-center"><input type="checkbox" checked={r.isLab} onChange={(e) => set(i, { isLab: e.target.checked })} aria-label="Lab" /></td>
                    <td className="px-1.5 py-1.5"><button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className={btn.icon} aria-label="Remove class"><X className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={`text-[14px] ${muted}`}>No classes yet. Upload the timetable, or add classes one by one.</p>
        )}
        <button type="button" onClick={() => setRows((r) => [...r, { day: 'Monday', startTime: '09:00', endTime: '09:55', subjectName: '', subjectCode: '', room: '', faculty: '', isLab: false }])} className={`${btn.ghost} self-start`}>
          <Plus className="w-4 h-4" /> Add a class
        </button>
        {error && <ErrorLine msg={error} />}
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${btn.secondary} flex-1`}>Cancel</button>
          <button type="button" onClick={save} disabled={saving || rows.length === 0} className={`${btn.primary} flex-1`}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {batch?.hasCr ? 'Send to CR' : 'Save timetable'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ---------- Calendar ----------
type EventRow = { id: string; date: string; title: string; type: (typeof TYPES)[number] };

const CalendarSheet: React.FC<{ editing: CampusCalendar | 'new' | null; calendars: CampusCalendar[]; onClose: () => void; api: any; onDone: () => void }> = ({ editing, calendars, onClose, api, onDone }) => {
  const { showToast } = useApp() as any;
  const [name, setName] = useState('');
  const [years, setYears] = useState<CalendarYears>('all');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!editing) return;
    setError('');
    if (editing === 'new') {
      setName('');
      setYears(calendars.some((c) => c.years === 'all') ? [1] : 'all');
      setEvents([]);
    } else {
      setName(editing.name);
      setYears(editing.years);
      setEvents(editing.events.map((e: any) => ({ id: e.id, date: e.date, title: e.title, type: TYPES.includes(e.type) ? e.type : 'event' })));
    }
  }, [editing, calendars]);

  const read = async (files: File[]) => {
    setReading(true);
    setError('');
    try {
      const images = await prepareAiUpload(files, { maxDim: 2200 });
      const res = await fetch('/api/extract-calendar', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ fileName: files[0]?.name, images }) });
      const d = await readAiResponse(res);
      if (!res.ok || !Array.isArray(d.events) || !d.events.length) throw new Error(d.error || "Couldn't read that calendar. Try a clearer photo or the PDF.");
      const out = expandCalendar(d.events, `campus_${Date.now().toString(36)}`);
      setEvents(out.map((e: any) => ({ id: e.id, date: e.date, title: e.title, type: TYPES.includes(e.type) ? e.type : 'event' })));
      if (!name) setName(`${new Date().getFullYear()}–${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')} calendar`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const d = await api('POST', { action: 'saveCalendar', id: editing !== 'new' && editing ? editing.id : undefined, name, years, events });
      const parts = [d.applied ? `live for ${d.applied} ${d.applied === 1 ? 'batch' : 'batches'}` : '', d.proposed ? `sent to ${d.proposed} ${d.proposed === 1 ? 'CR' : 'CRs'} to approve` : ''].filter(Boolean);
      showToast?.('Calendar saved', parts.join(', ') || 'No batches use it yet', 'success');
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const setEv = (i: number, patch: Partial<EventRow>) => setEvents((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleYear = (y: number) => setYears((cur) => (cur === 'all' ? [y] : cur.includes(y) ? cur.filter((x) => x !== y) : [...cur, y].sort()));

  return (
    <Modal isOpen={!!editing} onClose={onClose} title={editing === 'new' ? 'New academic calendar' : 'Edit calendar'} description="Holidays and exams go to every batch of the years you pick" maxWidth="2xl" mobileFullSheet>
      <div className="flex flex-col gap-f4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-2">Name</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026–27 Odd semester" className={`${field} w-full`} />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg-2">Used by</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={years === 'all'} onClick={() => setYears('all')} className={clsx('chip', years === 'all' && 'chip-active')}>
              Same for all years
            </button>
            {[1, 2, 3, 4, 5].map((y) => (
              <button key={y} type="button" aria-pressed={years !== 'all' && years.includes(y)} onClick={() => toggleYear(y)} className={clsx('chip', years !== 'all' && years.includes(y) && 'chip-active')}>
                {yearLabel(y)}
              </button>
            ))}
          </div>
          <p className={`mt-1.5 text-[12px] ${muted}`}>A year&apos;s own calendar wins over the &ldquo;all years&rdquo; one. 1st year = Sem 1–2, 2nd year = Sem 3–4…</p>
        </div>
        <ReadFile text={events.length ? 'Replace from the calendar PDF or photo' : 'Upload the academic calendar (PDF or photo)'} busy={reading} onFiles={read} />
        {events.length > 0 && (
          <div className="border border-line divide-y divide-line-soft max-h-[45vh] overflow-y-auto">
            {events.map((e, i) => (
              <div key={e.id + i} className="flex items-center gap-1.5 px-2 py-1.5">
                <input type="date" value={e.date} onChange={(x) => setEv(i, { date: x.target.value })} className={`${field} w-[150px]`} />
                <select value={e.type} onChange={(x) => setEv(i, { type: x.target.value as EventRow['type'] })} className={`${field} w-[110px]`}>
                  {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </select>
                <input value={e.title} onChange={(x) => setEv(i, { title: x.target.value })} className={`${field} flex-1`} />
                <button type="button" onClick={() => setEvents((r) => r.filter((_, j) => j !== i))} className={btn.icon} aria-label="Remove date">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => setEvents((r) => [...r, { id: `campus_m_${Date.now()}_${r.length}`, date: new Date().toISOString().slice(0, 10), title: '', type: 'holiday' }])} className={`${btn.ghost} self-start`}>
          <Plus className="w-4 h-4" /> Add a date
        </button>
        {error && <ErrorLine msg={error} />}
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className={`${btn.secondary} flex-1`}>Cancel</button>
          <button type="button" onClick={save} disabled={saving || !events.length || !name.trim()} className={`${btn.primary} flex-1`}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save &amp; send to batches
          </button>
        </div>
        <p className={`text-[12px] ${muted}`}>Batches without a CR get it right away. Batches with a CR get a request; it goes live when their CR approves. Dates the CR added themselves are kept.</p>
      </div>
    </Modal>
  );
};

// ---------- CRs of one batch ----------
type Person = { uid: string; name: string; email: string; rollNumber: string; member: boolean; cr: boolean };

const CrSheet: React.FC<{ batch: SetupBatch | null; onClose: () => void; api: any; onDone: () => void }> = ({ batch, onClose, api, onDone }) => {
  const { showToast } = useApp() as any;
  const [people, setPeople] = useState<Person[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (!batch) return;
    setError('');
    api('GET', undefined, `?people=${encodeURIComponent(batch.id)}`)
      .then((d: any) => setPeople(d.people || []))
      .catch((e: any) => setError(e.message));
  }, [batch, api]);
  useEffect(() => {
    setPeople(null);
    setQ('');
    load();
  }, [load]);

  const act = async (p: Person, make: boolean) => {
    if (!batch) return;
    setBusy(p.uid);
    try {
      await api('POST', { action: make ? 'assignCr' : 'removeCr', batchKey: batch.id, uid: p.uid });
      showToast?.(make ? `${p.name} is now CR` : `${p.name} is no longer CR`, label(batch), 'success');
      load();
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };
  const ql = q.trim().toLowerCase();
  const shown = (people || []).filter((p) => !ql || `${p.name} ${p.email} ${p.rollNumber}`.toLowerCase().includes(ql));

  return (
    <Modal isOpen={!!batch} onClose={onClose} title={batch ? `CR · ${label(batch)}` : 'CR'} description="Make a student CR, or remove one. They get a notification." maxWidth="md" mobileFullSheet>
      <div className="flex flex-col gap-f3">
        <SearchField value={q} onChange={setQ} placeholder="Search name, email or roll number" />
        {error && <ErrorLine msg={error} />}
        {!people ? (
          <div className="flex items-center gap-2 text-[14px] text-muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading students…</div>
        ) : shown.length === 0 ? (
          <p className={`text-[14px] ${muted}`}>No students from this branch and semester have joined yet. Share the batch code {batch?.inviteCode} with the class.</p>
        ) : (
          <div className={`${surface} ${divider}`}>
            {shown.map((p) => (
              <div key={p.uid} className="flex items-center gap-3 px-f3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium truncate ${strong}`}>{p.name}</p>
                  <p className={`text-[12px] truncate ${muted}`}>{[p.rollNumber !== 'N/A' ? p.rollNumber : '', p.email, p.member ? 'In this batch' : 'Same branch & semester'].filter(Boolean).join(' · ')}</p>
                </div>
                {p.cr && <Badge tone="violet">CR</Badge>}
                <button type="button" disabled={!!busy} onClick={() => act(p, !p.cr)} className={p.cr ? btn.danger : btn.secondary}>
                  {busy === p.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : p.cr ? 'Remove' : 'Make CR'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
