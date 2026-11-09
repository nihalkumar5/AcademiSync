'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Illustration } from '@/components/ui/Illustration';
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from '@/components/ui/icons';
import { processFileForAi } from '@/lib/fileCompressor';
import {
  MAX_PAPER_PAGES,
  MAX_PAPER_TOTAL_MB,
  PaperFields,
  PaperSummary,
  matchesPaperSearch,
  normKey,
  paperTitle,
} from '@/lib/questionPapers';

// Question papers: students, faculty and the campus admin upload past papers; AI reads each one and
// names it the way this college does; duplicates are refused; students only see their own branch.

type ListData = {
  scope: { role: string; college: string; branch: string; isStaff: boolean };
  examNames: string[];
  papers: PaperSummary[];
};

const api = async (method: 'GET' | 'POST', query = '', body?: unknown) => {
  const { getAuthHeaders } = await import('@/lib/authHeaders');
  const res = await fetch(`/api/question-papers${query}`, {
    method,
    headers: await getAuthHeaders(),
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const err: any = new Error(data?.error || 'Something went wrong. Try again.');
    err.code = data?.code;
    err.duplicate = data?.duplicate || null;
    throw err;
  }
  return data;
};

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className={clsx('chip', active && 'chip-active')}>
    {children}
  </button>
);

const PaperRow: React.FC<{ p: PaperSummary; isStaff: boolean; onOpen: () => void }> = ({ p, isStaff, onOpen }) => (
  <li>
    <button type="button" onClick={onOpen} className="group w-full flex items-center gap-3 px-f4 py-3 text-left hover:bg-surface-2 transition-colors cursor-pointer">
      <span className="w-10 h-10 shrink-0 flex items-center justify-center border border-line-soft text-fg-2">
        <FileText className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-medium text-fg truncate">{paperTitle(p)}</span>
        <span className="block mt-0.5 text-[13px] text-muted truncate">
          {[p.semester ? `Sem ${p.semester}` : null, isStaff ? p.branch : null, p.kind === 'pdf' ? 'PDF' : `${p.pageCount} ${p.pageCount === 1 ? 'page' : 'pages'}`]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      {p.status === 'hidden' && <span className="tag border-rose-300 text-rose-700 dark:text-rose-300 dark:border-rose-400/30">Hidden</span>}
      {isStaff && !!p.reports && p.status !== 'hidden' && <span className="tag text-amber-700 dark:text-amber-300">{p.reports} reports</span>}
      {p.official && <span className="tag">Official</span>}
      <ChevronRight className="w-4 h-4 text-faint shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  </li>
);

// ---------- Viewer ----------
const Viewer: React.FC<{
  paper: PaperSummary | null;
  isStaff: boolean;
  onClose: () => void;
  onChanged: () => void;
}> = ({ paper, isStaff, onClose, onChanged }) => {
  const { showToast } = useApp() as any;
  const [pages, setPages] = useState<{ url: string; type: string }[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    setPages(null);
    setError('');
    setConfirmRemove(false);
    if (!paper) return;
    api('GET', `?open=${encodeURIComponent(paper.id)}`)
      .then((d) => setPages(d.pages || []))
      .catch((e) => setError(e.message));
  }, [paper?.id]);

  const act = async (action: 'report' | 'remove' | 'restore') => {
    if (!paper) return;
    setBusy(action);
    try {
      const d = await api('POST', '', { action, id: paper.id });
      if (action === 'report') showToast?.('Reported', d.hidden ? 'This paper is hidden until someone reviews it' : 'Thanks, we will take a look', 'success');
      if (action === 'remove') showToast?.('Paper removed', paperTitle(paper), 'success');
      if (action === 'restore') showToast?.('Paper restored', paperTitle(paper), 'success');
      onChanged();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const openUrl = (url: string) => window.open(url, '_blank', 'noopener');

  return (
    <Modal isOpen={!!paper} onClose={onClose} title={paper?.subjectName || ''} description={paper ? [paperTitle(paper), paper.subjectCode].filter(Boolean).join(' · ') : ''} maxWidth="2xl" mobileFullSheet>
      {paper && (
        <div className="flex flex-col gap-f4">
          {error && (
            <p className="flex items-start gap-2 px-3 py-2.5 border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:border-rose-400/20 dark:text-rose-300 text-[14px]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </p>
          )}
          {!pages && !error && (
            <div className="flex items-center justify-center gap-2 py-f6 text-[14px] text-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Opening the paper…
            </div>
          )}
          {pages && paper.kind === 'pdf' && pages[0] && (
            <div className="flex flex-col items-center text-center border border-line px-5 py-f5">
              <span className="w-12 h-12 flex items-center justify-center border border-line-soft">
                <FileText className="w-5 h-5" />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-fg">PDF question paper</p>
              <p className="mt-1 text-[13px] text-muted">Opens in your browser or PDF app</p>
              <button type="button" onClick={() => openUrl(pages[0].url)} className="btn btn-primary mt-f4">
                <ExternalLink className="w-4 h-4" /> Open PDF
              </button>
            </div>
          )}
          {pages && paper.kind === 'images' && (
            <div className="flex flex-col gap-3">
              {pages.map((pg, i) => (
                <figure key={i} className="border border-line bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pg.url} alt={`Page ${i + 1}`} className="w-full h-auto block" loading={i < 2 ? 'eager' : 'lazy'} />
                  <figcaption className="flex items-center justify-between px-3 py-2 border-t border-line text-[12px] text-muted">
                    <span>
                      Page {i + 1} of {pages.length}
                    </span>
                    <button type="button" onClick={() => openUrl(pg.url)} className="inline-flex items-center gap-1 font-medium text-fg hover:underline underline-offset-4 cursor-pointer">
                      Full size <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isStaff && paper.status === 'hidden' && (
              <button type="button" onClick={() => act('restore')} disabled={!!busy} className="btn btn-secondary">
                {busy === 'restore' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Restore
              </button>
            )}
            {!isStaff && !paper.mine && (
              <button
                type="button"
                onClick={() => act('report')}
                disabled={!!busy || paper.reportedByMe}
                className="btn btn-secondary"
              >
                {busy === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                {paper.reportedByMe ? 'Reported' : 'Report wrong paper'}
              </button>
            )}
            {(paper.mine || isStaff) &&
              (confirmRemove ? (
                <button type="button" onClick={() => act('remove')} disabled={!!busy} className="btn btn-secondary text-rose-600 border-rose-300 dark:text-rose-400">
                  {busy === 'remove' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Yes, remove it
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmRemove(true)} className="btn btn-secondary">
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ---------- Upload ----------
type Picked = { file: File; preview: string | null };

const UploadSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  isStaff: boolean;
  branchOptions: string[];
  onDone: (p: PaperSummary) => void;
  onOpenPaper: (p: PaperSummary) => void;
}> = ({ open, onClose, isStaff, branchOptions, onDone, onOpenPaper }) => {
  const { showToast } = useApp() as any;
  const [step, setStep] = useState<'pick' | 'reading' | 'confirm'>('pick');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [branch, setBranch] = useState('');
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState<PaperSummary | null>(null);
  const [draftId, setDraftId] = useState('');
  const [fields, setFields] = useState<PaperFields | null>(null);
  const [examNames, setExamNames] = useState<string[]>([]);
  const [possibleDup, setPossibleDup] = useState<PaperSummary | null>(null);
  const [publishing, setPublishing] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    picked.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    setStep('pick');
    setPicked([]);
    setError('');
    setDuplicate(null);
    setDraftId('');
    setFields(null);
    setPossibleDup(null);
  };
  const close = () => {
    if (draftId) api('POST', '', { action: 'discard', id: draftId }).catch(() => {});
    reset();
    onClose();
  };

  const isPdf = picked.length === 1 && (picked[0].file.type === 'application/pdf' || picked[0].file.name.toLowerCase().endsWith('.pdf'));
  const addFiles = (list: FileList | null, pdf: boolean) => {
    setError('');
    setDuplicate(null);
    if (!list || !list.length) return;
    const files = Array.from(list);
    if (pdf) {
      picked.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setPicked([{ file: files[0], preview: null }]);
      return;
    }
    const base = isPdf ? [] : picked;
    const next = [...base, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, MAX_PAPER_PAGES);
    if (base.length + files.length > MAX_PAPER_PAGES) setError(`Up to ${MAX_PAPER_PAGES} pages at a time`);
    setPicked(next);
  };
  const removeAt = (i: number) =>
    setPicked((p) => {
      p[i]?.preview && URL.revokeObjectURL(p[i].preview!);
      return p.filter((_, j) => j !== i);
    });

  const read = async () => {
    setError('');
    setDuplicate(null);
    if (isStaff && !branch.trim()) {
      setError('Choose the branch this paper is for');
      return;
    }
    setStep('reading');
    try {
      const files = await Promise.all(picked.map((p) => processFileForAi(p.file)));
      const rawBytes = files.reduce((n, f) => n + Math.floor((f.base64.length - f.base64.indexOf(',') - 1) * 0.75), 0);
      if (rawBytes > MAX_PAPER_TOTAL_MB * 1024 * 1024) throw new Error(`That's too big. Keep the whole paper under ${MAX_PAPER_TOTAL_MB} MB.`);
      const d = await api('POST', '', { action: 'scan', files: files.map((f) => ({ base64: f.base64, mimeType: f.mimeType, name: f.name })), branch });
      setDraftId(d.draftId);
      setFields(d.fields);
      setExamNames(d.examNames || []);
      setPossibleDup(d.possibleDuplicate || null);
      setStep('confirm');
    } catch (e: any) {
      setError(e.message);
      setDuplicate(e.duplicate || null);
      setStep('pick');
    }
  };

  const publish = async () => {
    if (!fields) return;
    setPublishing(true);
    setError('');
    try {
      const d = await api('POST', '', { action: 'publish', draftId, fields: { ...fields, branch } });
      showToast?.('Paper added', `${d.paper.subjectName} · ${paperTitle(d.paper)}`, 'success');
      setDraftId('');
      reset();
      onDone(d.paper);
    } catch (e: any) {
      setError(e.message);
      setDuplicate(e.duplicate || null);
    } finally {
      setPublishing(false);
    }
  };

  const set = (patch: Partial<PaperFields>) => setFields((f) => (f ? { ...f, ...patch } : f));
  const label = 'block text-[13px] font-medium text-fg-2 mb-1.5';
  const input = 'w-full h-11 px-3 bg-surface border border-line text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-line-strong';
  const years = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() + 1 - i);

  const dupCard = (p: PaperSummary, text: string) => (
    <div className="border border-amber-200/80 bg-amber-50/70 dark:bg-amber-400/[0.06] dark:border-amber-400/20 p-f3">
      <p className="flex items-start gap-2 text-[14px] font-semibold text-fg">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" /> {text}
      </p>
      <button
        type="button"
        onClick={() => {
          close();
          onOpenPaper(p);
        }}
        className="mt-2.5 w-full flex items-center gap-3 border border-line bg-surface px-3 py-2.5 text-left hover:bg-surface-2 cursor-pointer"
      >
        <FileText className="w-4 h-4 shrink-0 text-fg-2" />
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-medium text-fg truncate">{p.subjectName}</span>
          <span className="block text-[12px] text-muted truncate">{paperTitle(p)}</span>
        </span>
        <span className="text-[13px] font-semibold text-fg">Open</span>
      </button>
    </div>
  );

  return (
    <Modal isOpen={open} onClose={close} title={step === 'confirm' ? 'Check the details' : 'Upload a question paper'} description={step === 'confirm' ? 'Read from the paper. Fix anything that looks wrong.' : 'Photos of each page, or one PDF'} maxWidth="lg" mobileFullSheet>
      {step === 'reading' && (
        <div className="flex flex-col items-center text-center py-f6">
          <Loader2 className="w-7 h-7 animate-spin text-fg" />
          <p className="mt-f3 text-[16px] font-semibold text-fg">Reading the paper…</p>
          <p className="mt-1 text-[13px] text-muted">Finding the subject, exam and year. This takes a few seconds.</p>
        </div>
      )}

      {step === 'pick' && (
        <div className="flex flex-col gap-f4">
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { addFiles(e.target.files, false); e.target.value = ''; }} />
          <input ref={pdfInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { addFiles(e.target.files, true); e.target.value = ''; }} />

          {picked.length === 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => photoInput.current?.click()} className="flex flex-col items-start gap-3 border border-line p-f4 text-left hover:bg-surface-2 cursor-pointer">
                <Camera className="w-6 h-6 text-fg" />
                <span>
                  <span className="block text-[15px] font-semibold text-fg">Photos</span>
                  <span className="block mt-0.5 text-[12px] text-muted">One photo per page, in order</span>
                </span>
              </button>
              <button type="button" onClick={() => pdfInput.current?.click()} className="flex flex-col items-start gap-3 border border-line p-f4 text-left hover:bg-surface-2 cursor-pointer">
                <FileText className="w-6 h-6 text-fg" />
                <span>
                  <span className="block text-[15px] font-semibold text-fg">PDF</span>
                  <span className="block mt-0.5 text-[12px] text-muted">Up to {MAX_PAPER_TOTAL_MB} MB</span>
                </span>
              </button>
            </div>
          ) : isPdf ? (
            <div className="flex items-center gap-3 border border-line px-3 py-3">
              <FileText className="w-5 h-5 shrink-0" />
              <span className="flex-1 min-w-0 text-[14px] font-medium text-fg truncate">{picked[0].file.name}</span>
              <button type="button" onClick={() => setPicked([])} aria-label="Remove" className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {picked.map((p, i) => (
                  <div key={i} className="relative aspect-[3/4] border border-line bg-surface-2 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.preview && <img src={p.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />}
                    <span className="absolute left-1 top-1 px-1.5 text-[11px] font-semibold bg-ink text-on-ink">{i + 1}</span>
                    <button type="button" onClick={() => removeAt(i)} aria-label={`Remove page ${i + 1}`} className="absolute right-1 top-1 w-6 h-6 flex items-center justify-center bg-surface/90 border border-line text-fg cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {picked.length < MAX_PAPER_PAGES && (
                  <button type="button" onClick={() => photoInput.current?.click()} className="aspect-[3/4] flex flex-col items-center justify-center gap-1 border border-dashed border-line text-muted hover:text-fg hover:border-line-strong cursor-pointer">
                    <Plus className="w-5 h-5" />
                    <span className="text-[12px] font-medium">Add page</span>
                  </button>
                )}
              </div>
              <p className="mt-2 text-[12px] text-muted">{picked.length} of {MAX_PAPER_PAGES} pages</p>
            </div>
          )}

          {isStaff && (
            <div>
              <label className={label} htmlFor="qp-branch">Branch</label>
              <input id="qp-branch" list="qp-branches" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Computer Science and Engineering" className={input} />
              <datalist id="qp-branches">
                {branchOptions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <p className="mt-1.5 text-[12px] text-muted">Only students of this branch will see it.</p>
            </div>
          )}

          {error && !duplicate && (
            <p className="flex items-start gap-2 px-3 py-2.5 border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:border-rose-400/20 dark:text-rose-300 text-[14px]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </p>
          )}
          {duplicate && dupCard(duplicate, 'This paper is already uploaded')}
          {error && duplicate === null && error.includes('already') && (
            <p className="text-[13px] text-muted">It's in another branch's list, so it isn't shown here.</p>
          )}

          <button type="button" onClick={read} disabled={picked.length === 0} className="btn btn-primary w-full">
            <Upload className="w-4 h-4" /> Read paper
          </button>
        </div>
      )}

      {step === 'confirm' && fields && (
        <div className="flex flex-col gap-f4">
          {possibleDup && dupCard(possibleDup, 'Looks like this paper is already here')}

          <div>
            <label className={label} htmlFor="qp-subject">Subject</label>
            <input id="qp-subject" value={fields.subjectName} onChange={(e) => set({ subjectName: e.target.value })} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label} htmlFor="qp-code">Course code</label>
              <input id="qp-code" value={fields.subjectCode} onChange={(e) => set({ subjectCode: e.target.value.toUpperCase() })} placeholder="Optional" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="qp-sem">Semester</label>
              <select id="qp-sem" value={fields.semester ?? ''} onChange={(e) => set({ semester: e.target.value ? Number(e.target.value) : null })} className={input}>
                <option value="">Not sure</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="qp-exam">Exam</label>
            <input id="qp-exam" value={fields.examName} onChange={(e) => set({ examName: e.target.value })} className={input} />
            {examNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {examNames.map((n) => (
                  <Chip key={n} active={normKey(n) === normKey(fields.examName)} onClick={() => set({ examName: n })}>
                    {n}
                  </Chip>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[12px] text-muted">Use the name your college uses, so papers group together.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label} htmlFor="qp-month">Month</label>
              <select id="qp-month" value={MONTHS.includes(fields.examMonth) ? fields.examMonth : fields.examMonth ? '__custom' : ''} onChange={(e) => set({ examMonth: e.target.value === '__custom' ? fields.examMonth : e.target.value })} className={input}>
                <option value="">Not sure</option>
                {!MONTHS.includes(fields.examMonth) && fields.examMonth && <option value="__custom">{fields.examMonth}</option>}
                {MONTHS.filter(Boolean).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="qp-year">Year</label>
              <select id="qp-year" value={fields.examYear} onChange={(e) => set({ examYear: Number(e.target.value) })} className={input}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {error && !duplicate && (
            <p className="flex items-start gap-2 px-3 py-2.5 border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:border-rose-400/20 dark:text-rose-300 text-[14px]">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </p>
          )}
          {duplicate && dupCard(duplicate, 'This paper is already uploaded')}

          <div className="flex gap-2.5">
            <button type="button" onClick={close} className="btn btn-secondary flex-1">Cancel</button>
            <button type="button" onClick={publish} disabled={publishing || !!duplicate} className="btn btn-primary flex-1">
              {publishing && <Loader2 className="w-4 h-4 animate-spin" />} {possibleDup ? "It's a different paper, add" : 'Add paper'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ---------- Page ----------
export const QuestionPapersView: React.FC = () => {
  const { user, profile, setActiveView } = useApp();
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [query, setQuery] = useState('');
  const [exam, setExam] = useState('all');
  const [sem, setSem] = useState<number | 'all'>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [openPaper, setOpenPaper] = useState<PaperSummary | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await api('GET'));
    } catch (e: any) {
      setError({ message: e.message, code: e.code });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    load();
  }, [load]);

  const isStaff = !!data?.scope.isStaff;
  const papers = data?.papers || [];
  const examsPresent = useMemo(() => Array.from(new Set(papers.map((p) => p.examName))).sort(), [papers]);
  const semsPresent = useMemo(() => Array.from(new Set(papers.map((p) => p.semester).filter((s): s is number => !!s))).sort((a, b) => a - b), [papers]);
  const branchesPresent = useMemo(() => Array.from(new Set(papers.map((p) => p.branch).filter(Boolean))).sort(), [papers]);
  const branchOptions = useMemo(() => {
    const linked = ((profile as any)?.facultyLinkedBatches || []).map((b: any) => b?.branch).filter(Boolean);
    const seen = new Map<string, string>();
    [...linked, ...branchesPresent].forEach((b: string) => seen.has(normKey(b)) || seen.set(normKey(b), b));
    return Array.from(seen.values());
  }, [profile, branchesPresent]);

  const shown = papers.filter(
    (p) =>
      (exam === 'all' || p.examName === exam) &&
      (sem === 'all' || p.semester === sem) &&
      (branchFilter === 'all' || p.branch === branchFilter) &&
      (!query.trim() || matchesPaperSearch(p, query))
  );
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; code: string; list: PaperSummary[] }>();
    shown.forEach((p) => {
      const k = normKey(p.subjectCode) || normKey(p.subjectName);
      const g = m.get(k) || { name: p.subjectName, code: p.subjectCode, list: [] };
      g.list.push(p);
      m.set(k, g);
    });
    return Array.from(m.values())
      .map((g) => ({ ...g, list: g.list.sort((a, b) => b.examYear - a.examYear || a.examName.localeCompare(b.examName)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shown]);

  const subtitle = data ? [data.scope.college, isStaff ? 'All branches' : data.scope.branch].filter(Boolean).join(' · ') : 'Past papers from your college';

  let body: React.ReactNode;
  if (!user?.id) {
    body = (
      <section className="border border-line bg-surface px-5 py-6 flex flex-col items-center text-center">
        <Illustration name="exam" className="h-[150px] w-auto" />
        <h3 className="mt-4 text-[18px] font-semibold text-fg">Sign in to see question papers</h3>
        <p className="mt-1.5 text-[14px] text-muted max-w-sm">Papers are shared within your college and branch, so you need to be signed in.</p>
        <button type="button" onClick={() => setActiveView('settings')} className="btn btn-primary mt-5">Go to Profile</button>
      </section>
    );
  } else if (loading && !data) {
    body = (
      <ul className="border border-line bg-surface divide-y divide-line-soft" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-3 px-f4 py-3">
            <span className="w-10 h-10 bg-surface-2 animate-pulse" />
            <span className="flex-1 flex flex-col gap-2">
              <span className="h-3.5 w-1/2 bg-surface-2 animate-pulse" />
              <span className="h-3 w-1/3 bg-surface-2 animate-pulse" />
            </span>
          </li>
        ))}
      </ul>
    );
  } else if (error && !data) {
    const needsProfile = error.code === 'no-college' || error.code === 'no-branch';
    body = (
      <section className="border border-line bg-surface px-5 py-6 flex flex-col items-center text-center">
        <Illustration name="exam" className="h-[150px] w-auto" />
        <h3 className="mt-4 text-[18px] font-semibold text-fg">{needsProfile ? 'One detail missing' : "Couldn't load papers"}</h3>
        <p className="mt-1.5 text-[14px] text-muted max-w-sm">{error.message}</p>
        <button type="button" onClick={() => (needsProfile ? setActiveView('settings') : load())} className="btn btn-primary mt-5">
          {needsProfile ? 'Go to Profile' : 'Try again'}
        </button>
      </section>
    );
  } else if (papers.length === 0) {
    body = (
      <section className="border border-line bg-surface px-5 py-6 flex flex-col items-center text-center">
        <Illustration name="exam" className="h-[160px] w-auto" />
        <h3 className="mt-4 text-[18px] font-semibold text-fg">No papers yet</h3>
        <p className="mt-1.5 text-[14px] text-muted max-w-sm">
          Be the first to add one. Snap the pages of any past paper, and it helps everyone in your branch.
        </p>
        <button type="button" onClick={() => setUploadOpen(true)} className="btn btn-primary mt-5">
          <Upload className="w-4 h-4" /> Upload paper
        </button>
      </section>
    );
  } else {
    body = (
      <div className="flex flex-col gap-f4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, code or year"
            aria-label="Search question papers"
            className="w-full h-12 pl-10 pr-3 bg-surface border border-line text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-line-strong transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          {isStaff && branchesPresent.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              <Chip active={branchFilter === 'all'} onClick={() => setBranchFilter('all')}>All branches</Chip>
              {branchesPresent.map((b) => (
                <Chip key={b} active={branchFilter === b} onClick={() => setBranchFilter(b)}>{b}</Chip>
              ))}
            </div>
          )}
          {examsPresent.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              <Chip active={exam === 'all'} onClick={() => setExam('all')}>All exams</Chip>
              {examsPresent.map((n) => (
                <Chip key={n} active={exam === n} onClick={() => setExam(n)}>{n}</Chip>
              ))}
            </div>
          )}
          {semsPresent.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              <Chip active={sem === 'all'} onClick={() => setSem('all')}>All semesters</Chip>
              {semsPresent.map((n) => (
                <Chip key={n} active={sem === n} onClick={() => setSem(n)}>Sem {n}</Chip>
              ))}
            </div>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-f6 border border-dashed border-line">
            <Search className="w-5 h-5 text-muted" />
            <p className="mt-f3 text-[15px] font-semibold text-fg">No paper matches</p>
            <p className="mt-1 text-[13px] text-muted">Try another word, or clear the filters.</p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={`${g.code}_${g.name}`}>
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="min-w-0 text-[16px] font-semibold text-fg tracking-tight truncate">
                  {g.name}
                  {g.code && <span className="ml-2 text-[12px] font-mono font-medium text-muted">{g.code}</span>}
                </h3>
                <span className="shrink-0 text-[12px] text-muted tabular-nums">
                  {g.list.length} {g.list.length === 1 ? 'paper' : 'papers'}
                </span>
              </div>
              <ul className="border border-line bg-surface divide-y divide-line-soft">
                {g.list.map((p) => (
                  <PaperRow key={p.id} p={p} isStaff={isStaff} onOpen={() => setOpenPaper(p)} />
                ))}
              </ul>
            </section>
          ))
        )}

        <p className="flex items-start gap-2 text-[12px] leading-[17px] text-muted">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-px" />
          <span>
            {isStaff
              ? 'Students only see papers of their own branch. Papers reported by 3 students are hidden until you restore or remove them.'
              : 'Only students of your college and branch can see these papers. Spot a wrong one? Open it and report it.'}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-3xl mx-auto w-full pb-f7">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="page-title">Question papers</h2>
          <p className="text-[14px] text-muted mt-1.5 truncate">{subtitle}</p>
        </div>
        {user?.id && data && (
          <button type="button" onClick={() => setUploadOpen(true)} className="btn btn-primary self-start sm:self-auto">
            <Upload className="w-4 h-4" /> Upload paper
          </button>
        )}
      </div>

      {body}

      <Viewer paper={openPaper} isStaff={isStaff} onClose={() => setOpenPaper(null)} onChanged={load} />
      <UploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        isStaff={isStaff}
        branchOptions={branchOptions}
        onDone={(p) => {
          setUploadOpen(false);
          load();
          setOpenPaper(p);
        }}
        onOpenPaper={(p) => {
          setUploadOpen(false);
          setOpenPaper(p);
        }}
      />
    </div>
  );
};
