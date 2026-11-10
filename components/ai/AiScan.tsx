'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Illustration, IllustrationName } from '@/components/ui/Illustration';
import { AlertTriangle, Camera, Check, FileText, Plus, Sparkles, Upload, X } from '@/components/ui/icons';

// One look for every AI import (timetable, exams, calendar, mess menu, assignment sheet):
// AiUploadPanel: what to upload, drop / take photo / choose, page thumbnails, one Scan button.
// AiScanning: the pages being read (a scan line sweeps them) and the steps the AI is on.

export type AiScanKind = 'timetable' | 'exam' | 'calendar' | 'mess' | 'assignment';

const KINDS: Record<
  AiScanKind,
  { art: IllustrationName; title: string; sub: string; tips: string[]; steps: string[]; noun: string }
> = {
  timetable: {
    art: 'setup',
    title: 'Add your timetable',
    sub: 'A photo or PDF of your class routine. We turn it into your week.',
    tips: ['If the sheet has many branches, add only your section’s page', 'Several photos or a multi-page PDF are fine'],
    steps: ['Reading the pages', 'Finding days and times', 'Matching subjects, rooms and teachers', 'Building your week'],
    noun: 'timetable',
  },
  exam: {
    art: 'exam',
    title: 'Add the exam schedule',
    sub: 'The date sheet as a photo or PDF. We keep only your exams.',
    tips: ['Master sheets for all branches are fine', 'We pick your branch and semester'],
    steps: ['Reading the date sheet', 'Finding your branch and semester', 'Picking dates and timings', 'Listing your exams'],
    noun: 'date sheet',
  },
  calendar: {
    art: 'calendar',
    title: 'Add the academic calendar',
    sub: 'The whole calendar as a photo or PDF. Holidays, exams and events come out.',
    tips: ['All pages at once work best', 'Month-only dates are kept as tentative'],
    steps: ['Reading the calendar', 'Finding holidays and exams', 'Working out the dates', 'Listing events'],
    noun: 'calendar',
  },
  mess: {
    art: 'mess',
    title: 'Add the mess menu',
    sub: 'The weekly menu as a photo or PDF. Dishes and meal timings come out.',
    tips: ['The whole week in one go', 'Meal timings are picked up too'],
    steps: ['Reading the menu', 'Sorting meals by day', 'Picking up timings', 'Setting up your week'],
    noun: 'menu',
  },
  assignment: {
    art: 'papers',
    title: 'Scan the assignment sheet',
    sub: 'A photo or PDF of the handout. We fill in the subject, task and due date.',
    tips: ['Every page of the sheet is fine', 'Due dates like “next Friday” work'],
    steps: ['Reading the sheet', 'Finding the subject', 'Spotting the due date', 'Writing it up'],
    noun: 'sheet',
  },
};

const NO_FILES: File[] = [];
const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);

/** Object URLs for image files (revoked when the files change) */
function usePreviews(files: File[]) {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    const made = files.map((f) => (isImage(f) && f.size > 0 && !/heic|heif/i.test(f.type + f.name) ? URL.createObjectURL(f) : null));
    setUrls(made);
    return () => made.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}

const PageThumb: React.FC<{ file: File; url: string | null; index: number; onRemove?: () => void }> = ({ file, url, index, onRemove }) => (
  <div className="relative aspect-[3/4] border border-line bg-surface overflow-hidden">
    {url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-surface-2 px-2 text-center">
        <FileText className="w-6 h-6 text-muted" />
        <span className="text-[11px] font-semibold text-fg-2 line-clamp-2 break-all">{file.name}</span>
      </div>
    )}
    <span className="absolute left-1 bottom-1 min-w-[20px] h-5 px-1 bg-ink/85 text-on-ink text-[11px] font-semibold tabular-nums flex items-center justify-center">
      {index + 1}
    </span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute right-1 top-1 w-6 h-6 flex items-center justify-center bg-surface/90 border border-line text-fg hover:bg-surface cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export const AiUploadPanel: React.FC<{
  kind: AiScanKind;
  onScan: (files: File[]) => void;
  maxFiles?: number;
  /** Shown above the drop area, e.g. which branch the scan is for */
  context?: React.ReactNode;
  /** The last scan failed */
  error?: string | null;
  onRetry?: () => void;
  onDismissError?: () => void;
  /** e.g. "Or add classes by hand" */
  footer?: React.ReactNode;
}> = ({ kind, onScan, maxFiles = 10, context, error, onRetry, onDismissError, footer }) => {
  const k = KINDS[kind];
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [note, setNote] = useState('');
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const urls = usePreviews(files);

  const add = (list: FileList | File[] | null) => {
    const picked = Array.from(list || []).filter((f) => isPdf(f) || isImage(f));
    if (!picked.length) {
      if (list && Array.from(list).length) setNote('Only photos and PDFs work here.');
      return;
    }
    setNote('');
    setFiles((cur) => {
      const next = [...cur, ...picked];
      if (next.length > maxFiles) setNote(`Up to ${maxFiles} pages at a time.`);
      return next.slice(0, maxFiles);
    });
  };

  const pages = files.length;
  return (
    <div className="flex flex-col gap-f4 text-left">
      {error && (
        <div className="flex items-start gap-3 p-f3 border border-rose-200 bg-rose-50 dark:border-rose-400/25 dark:bg-rose-400/10" role="alert">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-rose-900 dark:text-rose-200">That scan didn’t work</p>
            <p className="mt-0.5 text-[13px] leading-[19px] text-rose-800/90 dark:text-rose-200/80">{error}</p>
            <div className="mt-2.5 flex items-center gap-3">
              {onRetry && (
                <button type="button" onClick={onRetry} className="btn btn-primary btn-sm">
                  Try again
                </button>
              )}
              {onDismissError && (
                <button type="button" onClick={onDismissError} className="text-[13px] font-semibold text-rose-800 dark:text-rose-200 underline underline-offset-4 cursor-pointer">
                  Use other files
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* What to add */}
      <div className="flex items-center gap-f4">
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] font-semibold text-fg tracking-tight">{k.title}</h3>
          <p className="mt-1 text-[14px] leading-[20px] text-muted">{k.sub}</p>
        </div>
        <Illustration name={k.art} className="h-[84px] sm:h-[96px] w-auto shrink-0" decorative />
      </div>

      {context}

      {/* Drop / pick */}
      {pages === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            add(e.dataTransfer.files);
          }}
          className={clsx(
            'border-2 border-dashed px-f4 py-f5 flex flex-col items-center text-center transition-colors',
            drag ? 'border-fg bg-surface-2' : 'border-line bg-surface-2/40'
          )}
        >
          <span className="w-11 h-11 flex items-center justify-center bg-surface-2 border border-line text-fg">
            <Upload className="w-5 h-5" />
          </span>
          <p className="mt-3 text-[15px] font-semibold text-fg">Drop your {k.noun} here</p>
          <p className="mt-0.5 text-[13px] text-muted">Photos or PDF · up to {maxFiles} pages</p>
          <div className="mt-f4 grid grid-cols-2 gap-2 w-full max-w-[340px]">
            <button type="button" onClick={() => camRef.current?.click()} className="btn btn-secondary h-11">
              <Camera className="w-4 h-4" /> Take photo
            </button>
            <button type="button" onClick={() => pickRef.current?.click()} className="btn btn-primary h-11">
              <Upload className="w-4 h-4" /> Choose files
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-line bg-surface p-f3">
          <div className="flex items-baseline justify-between gap-3 mb-f3">
            <p className="text-[14px] font-semibold text-fg">
              {pages} {pages === 1 ? 'page' : 'pages'} ready
            </p>
            <button type="button" onClick={() => setFiles([])} className="text-[13px] font-medium text-muted hover:text-fg cursor-pointer">
              Clear
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {files.map((f, i) => (
              <PageThumb key={`${f.name}_${i}`} file={f} url={urls[i]} index={i} onRemove={() => setFiles((cur) => cur.filter((_, j) => j !== i))} />
            ))}
            {pages < maxFiles && (
              <button
                type="button"
                onClick={() => pickRef.current?.click()}
                className="aspect-[3/4] border border-dashed border-line-strong bg-surface-2/50 flex flex-col items-center justify-center gap-1 text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[12px] font-semibold">Add page</span>
              </button>
            )}
          </div>
          <button type="button" onClick={() => onScan(files)} className="btn btn-primary btn-lg w-full mt-f3">
            <Sparkles className="w-4 h-4" /> Scan {pages} {pages === 1 ? 'page' : 'pages'}
          </button>
        </div>
      )}
      {note && <p className="-mt-2 text-[13px] text-amber-700 dark:text-amber-300">{note}</p>}

      <input ref={pickRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />

      {/* Tips */}
      <ul className="flex flex-col gap-1.5">
        {[...k.tips, 'Big photos are shrunk on your phone, so uploads stay quick'].map((t) => (
          <li key={t} className="flex items-start gap-2 text-[13px] leading-[19px] text-muted">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {t}
          </li>
        ))}
      </ul>

      {footer && <div className="pt-f2 border-t border-line-soft text-center">{footer}</div>}
    </div>
  );
};

/** While the AI reads: the pages with a scan line, and the step it's on */
export const AiScanning: React.FC<{ kind: AiScanKind; files?: File[]; images?: { name: string; base64: string; mimeType: string }[] }> = ({ kind, files: fileList, images }) => {
  const k = KINDS[kind];
  // Already-read images (data URLs) work too
  const files = useMemo(
    () => fileList || (images || []).map((im) => new File([], im.name || 'page', { type: im.mimeType })),
    [fileList, images]
  );
  const fileUrls = usePreviews(fileList || NO_FILES);
  const imageUrls = useMemo(() => (images || []).map((im) => (im.mimeType.startsWith('image/') ? im.base64 : null)), [images]);
  const urls = fileList ? fileUrls : imageUrls;
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, k.steps.length - 1)), 3200);
    return () => clearInterval(t);
  }, [kind, k.steps.length]);

  // Photos on top (the first one in front); a PDF shows as a page icon behind them
  const order = files.map((f, i) => i).sort((a, b) => Number(!urls[a]) - Number(!urls[b]) || a - b).slice(0, 3);
  const shown = order.slice().reverse();
  return (
    <div className="flex flex-col items-center text-center py-f3" role="status" aria-live="polite">
      {/* Pages being read */}
      <div className="relative h-[196px] pt-5 w-full flex items-center justify-center">
        {shown.length === 0 ? (
          <div className="ai-float">
            <Illustration name={k.art} className="h-[150px] w-auto" decorative />
          </div>
        ) : (
          <div className="relative w-[124px] h-[160px]">
            {shown.map((idx, i) => {
              const f = files[idx];
              const back = shown.length - 1 - i;
              return (
                <div
                  key={`${f.name}_${idx}`}
                  className="absolute inset-0 border border-line bg-surface shadow-[0_6px_18px_-8px_rgba(17,17,17,0.25)] overflow-hidden"
                  style={{ transform: `translate(${back * 10}px, ${-back * 8}px) rotate(${back * 3}deg)`, zIndex: i }}
                >
                  {urls[idx] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[idx]!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-2">
                      <FileText className="w-8 h-8 text-muted" />
                    </div>
                  )}
                  {i === shown.length - 1 && <span className="ai-scanline" aria-hidden="true" />}
                </div>
              );
            })}
            <span className="absolute -right-3 -top-3 z-10 w-8 h-8 rounded-full bg-ink text-on-ink flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 ai-twinkle" />
            </span>
          </div>
        )}
      </div>

      <h3 className="mt-f3 text-[18px] font-semibold text-fg tracking-tight">Reading your {k.noun}…</h3>
      <p className="mt-1 text-[13px] text-muted">Usually 10–20 seconds{files.length > 1 ? ` for ${files.length} pages` : ''}.</p>

      <div className="mt-f4 w-full max-w-[300px] h-1 bg-surface-3 overflow-hidden" aria-hidden="true">
        <div className="h-full w-1/3 bg-fg ai-progress" />
      </div>

      <ol className="mt-f4 w-full max-w-[300px] flex flex-col gap-2 text-left">
        {k.steps.map((s, i) => (
          <li key={s} className={clsx('flex items-center gap-2.5 text-[14px] transition-colors', i < step ? 'text-muted' : i === step ? 'text-fg font-semibold' : 'text-faint')}>
            <span
              className={clsx(
                'w-5 h-5 shrink-0 rounded-full flex items-center justify-center border',
                i < step ? 'bg-emerald-600 border-emerald-600 text-white' : i === step ? 'border-fg' : 'border-line'
              )}
            >
              {i < step ? <Check className="w-3 h-3" /> : i === step ? <span className="w-1.5 h-1.5 rounded-full bg-fg ai-pulse" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
};
