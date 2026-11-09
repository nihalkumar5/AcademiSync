'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Check, Globe, Crosshair, Search, Loader2, ImageIcon, AlertCircle, CheckCircle2 } from '@/components/ui/icons';
import { CampaignCategory } from '@/lib/types';
import { CollegeItem } from '@/lib/collegeDirectory';
import { SpotlightCardView, CAMPAIGN_CATEGORIES, getCategoryMeta } from '@/components/ads/CampusSpotlightCard';
import { btn, inputCls, muted, strong, surface } from './AdminUI';

export interface CampaignFormState {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  targetUrl: string;
  category: CampaignCategory;
  badgeText: string;
  targetAudienceType: 'all' | 'custom';
  targetColleges: string[];
  branchTargeting: 'all' | 'custom';
  targetBranches: string[];
  semesterTargeting: 'all' | 'custom';
  targetSemesters: number[];
  customCollegeInput: string;
  customBranchInput: string;
  isActive: boolean;
  expiresOn: string; // yyyy-mm-dd, '' = no end date
  sendPush?: boolean; // campus admins: also notify students' phones once
}

export const EMPTY_CAMPAIGN_FORM: CampaignFormState = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  ctaText: 'Learn more',
  targetUrl: '',
  category: 'general',
  badgeText: '',
  targetAudienceType: 'all',
  targetColleges: [],
  branchTargeting: 'all',
  targetBranches: [],
  semesterTargeting: 'all',
  targetSemesters: [],
  customCollegeInput: '',
  customBranchInput: '',
  isActive: true,
  expiresOn: '',
  sendPush: false,
};

const TITLE_MAX = 60;
const TAGLINE_MAX = 110;
const CTA_SUGGESTIONS = ['Learn more', 'Register', 'Get the deal', 'Pre-order', 'Watch trailer', 'Apply now'];

export const isValidHttpsUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' && !!u.hostname.includes('.');
  } catch {
    return false;
  }
};

// Downscale to 1200px wide JPEG so the banner stays well under Firestore's 1 MB document limit.
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, 1200 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let q = 0.82;
        let out = canvas.toDataURL('image/jpeg', q);
        while (out.length > 450_000 && q > 0.4) {
          q -= 0.12;
          out = canvas.toDataURL('image/jpeg', q);
        }
        resolve(out);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const Field: React.FC<{ label: string; hint?: React.ReactNode; counter?: string; error?: string; children: React.ReactNode; htmlFor?: string }> = ({
  label,
  hint,
  counter,
  error,
  children,
  htmlFor,
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className={`text-[14px] font-medium ${strong}`}>
        {label}
      </label>
      {counter && <span className={`text-[12px] tabular-nums ${muted}`}>{counter}</span>}
    </div>
    {children}
    {error ? (
      <p className="text-[13px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" /> {error}
      </p>
    ) : hint ? (
      <p className={`text-[13px] ${muted}`}>{hint}</p>
    ) : null}
  </div>
);

const Step: React.FC<{ n: number; title: string; description: string; children: React.ReactNode }> = ({ n, title, description, children }) => (
  <section className="flex flex-col gap-f4">
    <div className="flex items-start gap-f3">
      <span className={`w-7 h-7 shrink-0 flex items-center justify-center text-[13px] font-semibold border border-line tabular-nums ${strong}`}>{n}</span>
      <div>
        <h3 className={`text-[18px] font-semibold tracking-tight leading-tight ${strong}`}>{title}</h3>
        <p className={`mt-0.5 text-[14px] ${muted}`}>{description}</p>
      </div>
    </div>
    <div className="flex flex-col gap-f4 sm:pl-10">{children}</div>
  </section>
);

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 h-9 px-3 border text-[13px] font-medium transition-colors cursor-pointer ${
      on
        ? 'bg-ink text-on-ink border-line-strong'
        : `border-line ${strong} hover:border-line-strong`
    }`}
  >
    {children}
    {on && <Check className="w-3.5 h-3.5" />}
  </button>
);

export interface CampaignComposerProps {
  editing: boolean;
  form: CampaignFormState;
  setForm: React.Dispatch<React.SetStateAction<CampaignFormState>>;
  onClose: () => void;
  onSave: (publish: boolean) => Promise<boolean>;
  reach: number;
  totalStudents: number;
  collegeOptions: { name: string; count: number }[];
  branchOptions: string[];
  collegeQuery: string;
  setCollegeQuery: (v: string) => void;
  collegeSuggestions: CollegeItem[];
  isSearchingColleges: boolean;
  /** Campus admins: the audience is locked to this college (branch/semester can still be narrowed). */
  lockedCollege?: string;
  /** Show the 'notify students' switch (campus admins). */
  allowPush?: boolean;
  /** This notice already sent its notification. */
  pushAlreadySent?: boolean;
}

export const CampaignComposer: React.FC<CampaignComposerProps> = ({
  editing,
  form,
  setForm,
  onClose,
  onSave,
  reach,
  totalStudents,
  collegeOptions,
  branchOptions,
  collegeQuery,
  setCollegeQuery,
  collegeSuggestions,
  isSearchingColleges,
  lockedCollege,
  allowPush,
  pushAlreadySent,
}) => {
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState<null | 'draft' | 'publish'>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CampaignFormState>(k: K, v: CampaignFormState[K]) => setForm((p) => ({ ...p, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const titleErr = !form.title.trim() ? 'Add a headline' : '';
  const urlErr = !form.targetUrl.trim() ? 'Add the link people will open' : !isValidHttpsUrl(form.targetUrl) ? 'Use a full https:// link' : '';
  const audienceErr = form.targetAudienceType === 'custom' && form.targetColleges.length === 0 ? 'Pick at least one college, or choose Everyone' : '';
  const today = new Date().toISOString().split('T')[0];
  const dateErr = form.expiresOn && form.expiresOn < today ? 'End date is in the past' : '';
  const canPublish = !titleErr && !urlErr && !audienceErr && !dateErr;

  const checklist = [
    { ok: !titleErr, label: 'Headline' },
    { ok: !urlErr, label: 'Working https link' },
    { ok: !audienceErr, label: 'Audience' },
    { ok: !!form.imageUrl, label: 'Banner image (optional)', optional: true },
  ];

  const submit = async (publish: boolean) => {
    setTouched(true);
    if (publish && !canPublish) return;
    if (!publish && !form.title.trim()) return;
    setSaving(publish ? 'publish' : 'draft');
    const ok = await onSave(publish);
    setSaving(null);
    if (ok) onClose();
  };

  const onPickImage = async (file?: File) => {
    if (!file) return;
    setImageError('');
    if (!file.type.startsWith('image/')) return setImageError('Choose an image file');
    setImageBusy(true);
    try {
      set('imageUrl', await compressImage(file));
    } catch {
      setImageError("Couldn't read that image");
    } finally {
      setImageBusy(false);
    }
  };

  const meta = getCategoryMeta(form.category);
  const reachPct = totalStudents ? Math.round((reach / totalStudents) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-canvas overflow-y-auto font-sans" role="dialog" aria-modal="true" aria-label={editing ? 'Edit ad' : 'New ad'}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="min-h-full flex flex-col">
        {/* Top bar: always reachable save actions (Fitts: big, fixed targets) */}
        <header
          className="sheen sticky top-0 z-20 bg-[#FAFAF8]/90 dark:bg-[#0A0B0F]/85 backdrop-blur-xl border-b border-line"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}
        >
          <div className="max-w-6xl mx-auto px-f4 sm:px-f5 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button type="button" onClick={onClose} className={btn.icon} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
              <h2 className={`text-[17px] font-semibold truncate ${strong}`}>{editing ? 'Edit ad' : 'New ad'}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => submit(false)} disabled={!!saving} className={`${btn.secondary} hidden sm:inline-flex`}>
                {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save as paused
              </button>
              <button type="button" onClick={() => submit(true)} disabled={!!saving} className={btn.primary}>
                {saving === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing ? 'Save and publish' : 'Publish'}
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl w-full mx-auto px-f4 sm:px-f5 py-f5 sm:py-f6 grid grid-cols-1 lg:grid-cols-12 gap-f5 lg:gap-f6 items-start">
          {/* Live preview: what you see is what students get */}
          <aside className="lg:col-span-5 lg:order-2 lg:sticky lg:top-[88px] flex flex-col gap-f4">
            <div>
              <p className={`text-[13px] font-medium mb-2 ${muted}`}>Preview on a student&apos;s home screen</p>
              <SpotlightCardView campaign={{ ...form, ctaText: form.ctaText }} />
            </div>

            <div className={`${surface} p-f4`}>
              <p className={`text-[13px] ${muted}`}>Estimated reach</p>
              <p className={`mt-1 text-[30px] font-semibold tabular-nums leading-none ${strong}`}>
                {reach.toLocaleString()} <span className={`text-[15px] font-normal ${muted}`}>students</span>
              </p>
              <div className="mt-f3 h-1.5 bg-surface-3">
                <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${reachPct}%` }} />
              </div>
              <p className={`mt-2 text-[12px] ${muted}`}>
                {reachPct}% of {totalStudents.toLocaleString()} students · Pro members never see ads
              </p>
            </div>

            <ul className={`${surface} p-f4 flex flex-col gap-2.5`} aria-label="Ready to publish">
              {checklist.map((c) => (
                <li key={c.label} className={`flex items-center gap-2.5 text-[14px] ${c.ok ? strong : muted}`}>
                  {c.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full border ${c.optional ? 'border-dashed' : ''} border-[#BDBDBD] dark:border-white/25`} />
                  )}
                  {c.label}
                </li>
              ))}
            </ul>
          </aside>

          <form
            className="lg:col-span-7 lg:order-1 flex flex-col gap-f6"
            onSubmit={(e) => {
              e.preventDefault();
              submit(true);
            }}
          >
            <Step n={1} title="Message" description="One clear promise and one action. Short copy gets more taps.">
              <Field label="Category" hint="Sets the icon and default label on the card.">
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_CATEGORIES.map((c) => (
                    <Chip key={c.id} on={form.category === c.id} onClick={() => set('category', c.id)}>
                      <c.icon className="w-4 h-4" />
                      {c.label}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Headline" htmlFor="ad-title" counter={`${form.title.length}/${TITLE_MAX}`} error={touched ? titleErr : ''}>
                <input
                  id="ad-title"
                  className={inputCls}
                  maxLength={TITLE_MAX}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Batch '26 hoodies are here"
                />
              </Field>
              <Field label="Supporting line" htmlFor="ad-sub" counter={`${form.subtitle.length}/${TAGLINE_MAX}`} hint="Shown under the headline. Two lines at most on phones.">
                <textarea
                  id="ad-sub"
                  rows={2}
                  maxLength={TAGLINE_MAX}
                  className={`${inputCls} h-auto py-2.5 resize-none`}
                  value={form.subtitle}
                  onChange={(e) => set('subtitle', e.target.value)}
                  placeholder="Pre-orders close Friday. Pick up at the main gate."
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-f4">
                <Field label="Button" htmlFor="ad-cta" counter={`${form.ctaText.length}/20`}>
                  <input id="ad-cta" className={inputCls} maxLength={20} value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)} placeholder="Learn more" />
                  <div className="flex flex-wrap gap-1.5">
                    {CTA_SUGGESTIONS.filter((s) => s !== form.ctaText).slice(0, 4).map((s) => (
                      <button key={s} type="button" onClick={() => set('ctaText', s)} className={`h-7 px-2 text-[12px] border border-dashed border-line ${muted} hover:text-fg cursor-pointer`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Label" htmlFor="ad-badge" hint={`Leave empty to use “${meta.badge}”.`}>
                  <input id="ad-badge" className={inputCls} maxLength={24} value={form.badgeText} onChange={(e) => set('badgeText', e.target.value)} placeholder={meta.badge} />
                </Field>
              </div>
              <Field label="Link" htmlFor="ad-url" error={touched ? urlErr : ''} hint="Opens in the browser when someone taps the button.">
                <input
                  id="ad-url"
                  type="url"
                  inputMode="url"
                  className={inputCls}
                  value={form.targetUrl}
                  onChange={(e) => set('targetUrl', e.target.value)}
                  onBlur={() => form.targetUrl && !/^https?:\/\//i.test(form.targetUrl) && set('targetUrl', `https://${form.targetUrl.trim()}`)}
                  placeholder="https://"
                />
              </Field>
            </Step>

            <Step n={2} title="Look" description="A wide image makes the card stand out. Text in the image is hard to read on phones.">
              <Field label="Banner image" hint="Best at 16:7, like 1200 × 525. We shrink large photos for you." error={imageError}>
                {form.imageUrl ? (
                  <div className={`${surface} overflow-hidden`}>
                    <div className="aspect-[16/7] bg-[#F1F1EF] dark:bg-white/[0.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between px-f3 py-2">
                      <span className={`text-[12px] tabular-nums ${muted}`}>{Math.round((form.imageUrl.length * 0.75) / 1024)} KB</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => fileRef.current?.click()} className={btn.ghost}>
                          Replace
                        </button>
                        <button type="button" onClick={() => set('imageUrl', '')} className={`${btn.ghost} hover:text-rose-600`}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onPickImage(e.dataTransfer.files?.[0]);
                    }}
                    className={`w-full aspect-[16/7] max-h-56 flex flex-col items-center justify-center gap-2 border border-dashed border-[#CFCFCB] dark:border-white/[0.16] ${muted} hover:border-line-strong hover:text-fg transition-colors cursor-pointer`}
                  >
                    {imageBusy ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" strokeWidth={1.6} />}
                    <span className="text-[14px] font-medium">{imageBusy ? 'Preparing image…' : 'Upload or drop an image'}</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0])} />
              </Field>
            </Step>

            <Step n={3} title="Audience" description={lockedCollege ? 'Only students of your college see this. Narrow it by branch or semester if you like.' : 'Narrow audiences see fewer, more relevant ads.'}>
              {lockedCollege ? (
                <div className="flex items-center gap-3 p-f3 border border-line bg-surface-2">
                  <Crosshair className={`w-5 h-5 shrink-0 ${strong}`} strokeWidth={1.75} />
                  <span className="min-w-0">
                    <span className={`block text-[15px] font-semibold ${strong}`}>Your college</span>
                    <span className={`block text-[13px] truncate ${muted}`}>{lockedCollege}</span>
                  </span>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Who sees this">
                {[
                  { id: 'all' as const, icon: Globe, title: 'Everyone', body: `${totalStudents.toLocaleString()} students` },
                  { id: 'custom' as const, icon: Crosshair, title: 'Specific', body: 'By college, branch, semester' },
                ].map((o) => {
                  const on = form.targetAudienceType === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => set('targetAudienceType', o.id)}
                      className={`flex flex-col items-start gap-2 p-f3 text-left border transition-colors cursor-pointer ${
                        on ? 'border-line-strong ring-1 ring-[#111111] dark:ring-[#F4F4F6]' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <o.icon className={`w-5 h-5 ${strong}`} strokeWidth={1.75} />
                      <span className={`text-[15px] font-semibold ${strong}`}>{o.title}</span>
                      <span className={`text-[13px] ${muted}`}>{o.body}</span>
                    </button>
                  );
                })}
              </div>
              )}

              {form.targetAudienceType === 'custom' && (
                <div className="flex flex-col gap-f4">
                  {!lockedCollege && (
                  <Field label="Colleges" counter={`${form.targetColleges.length} selected`} error={touched ? audienceErr : ''}>
                    <div className="relative">
                      <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                      <input
                        className={`${inputCls} pl-10`}
                        value={collegeQuery}
                        onChange={(e) => {
                          setCollegeQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && collegeQuery.trim()) {
                            e.preventDefault();
                            set('targetColleges', Array.from(new Set([...form.targetColleges, collegeQuery.trim()])));
                            setCollegeQuery('');
                          }
                        }}
                        placeholder="Search any college"
                        aria-label="Search colleges"
                      />
                      {showSuggestions && (isSearchingColleges || collegeSuggestions.length > 0) && (
                        <ul className={`absolute z-30 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto ${surface} shadow-xl ${'divide-y divide-line-soft'}`}>
                          {isSearchingColleges && <li className={`px-3.5 py-2.5 text-[13px] ${muted}`}>Searching…</li>}
                          {collegeSuggestions.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onMouseDown={() => {
                                  set('targetColleges', Array.from(new Set([...form.targetColleges, c.name])));
                                  setCollegeQuery('');
                                }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-surface-2 cursor-pointer"
                              >
                                <span className={`block text-[14px] ${strong}`}>{c.name}</span>
                                {c.state && <span className={`block text-[12px] ${muted}`}>{c.state}</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set([...form.targetColleges, ...collegeOptions.map((c) => c.name)])).map((name) => {
                        const count = collegeOptions.find((c) => c.name === name)?.count;
                        return (
                          <Chip key={name} on={form.targetColleges.includes(name)} onClick={() => set('targetColleges', toggle(form.targetColleges, name))}>
                            <span className="max-w-[220px] truncate">{name}</span>
                            {typeof count === 'number' && <span className="opacity-60 tabular-nums">{count}</span>}
                          </Chip>
                        );
                      })}
                    </div>
                  </Field>
                  )}

                  <Field label="Branches" hint={form.branchTargeting === 'all' ? 'All branches in the chosen colleges.' : undefined}>
                    <div className="flex flex-wrap gap-2">
                      <Chip on={form.branchTargeting === 'all'} onClick={() => setForm((p) => ({ ...p, branchTargeting: 'all', targetBranches: [] }))}>
                        All branches
                      </Chip>
                      {branchOptions.map((b) => (
                        <Chip
                          key={b}
                          on={form.branchTargeting === 'custom' && form.targetBranches.includes(b)}
                          onClick={() =>
                            setForm((p) => {
                              const next = toggle(p.branchTargeting === 'custom' ? p.targetBranches : [], b);
                              return { ...p, branchTargeting: next.length ? 'custom' : 'all', targetBranches: next };
                            })
                          }
                        >
                          {b}
                        </Chip>
                      ))}
                    </div>
                  </Field>

                  <Field label="Semesters">
                    <div className="flex flex-wrap gap-2">
                      <Chip on={form.semesterTargeting === 'all'} onClick={() => setForm((p) => ({ ...p, semesterTargeting: 'all', targetSemesters: [] }))}>
                        All
                      </Chip>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <Chip
                          key={s}
                          on={form.semesterTargeting === 'custom' && form.targetSemesters.includes(s)}
                          onClick={() =>
                            setForm((p) => {
                              const next = toggle(p.semesterTargeting === 'custom' ? p.targetSemesters : [], s).sort((a, b) => a - b);
                              return { ...p, semesterTargeting: next.length ? 'custom' : 'all', targetSemesters: next };
                            })
                          }
                        >
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </Step>

            <Step n={4} title="Schedule" description="Ads stop by themselves after the end date, so nothing stale lingers.">
              <Field label="Runs until" htmlFor="ad-end" error={dateErr} hint={form.expiresOn ? `Hidden from students after ${new Date(form.expiresOn + 'T23:59:59').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.` : 'No end date. It runs until you pause it.'}>
                <div className="flex flex-wrap items-center gap-2">
                  <input id="ad-end" type="date" min={today} className={`${inputCls} w-auto`} value={form.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} />
                  {[7, 14, 30].map((d) => {
                    const v = new Date(Date.now() + d * 86400000).toISOString().split('T')[0];
                    return (
                      <Chip key={d} on={form.expiresOn === v} onClick={() => set('expiresOn', form.expiresOn === v ? '' : v)}>
                        {d} days
                      </Chip>
                    );
                  })}
                  {form.expiresOn && (
                    <button type="button" onClick={() => set('expiresOn', '')} className={btn.ghost}>
                      No end date
                    </button>
                  )}
                </div>
              </Field>
            </Step>

            {allowPush && (
              <Step n={5} title="Notification" description="Also send this to students' phones as a push notification. Limited to 3 a day for your college, once per notice.">
                {pushAlreadySent ? (
                  <p className={`text-[14px] ${muted}`}>A notification was already sent for this notice.</p>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!form.sendPush}
                    onClick={() => set('sendPush', !form.sendPush)}
                    className="w-full flex items-center justify-between gap-3 p-f3 border border-line hover:border-line-strong text-left transition-colors cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className={`block text-[15px] font-semibold ${strong}`}>Notify students</span>
                      <span className={`block text-[13px] ${muted}`}>Sent when you publish, to {reach.toLocaleString()} matching students.</span>
                    </span>
                    <span className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${form.sendPush ? 'bg-ink' : 'bg-black/15 dark:bg-white/20'}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${form.sendPush ? 'left-[22px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                )}
              </Step>
            )}

                        {/* Bottom actions for phones, where the top bar's secondary button is hidden */}
            <div className="flex flex-col sm:hidden gap-2 pb-f6">
              <button type="submit" disabled={!!saving} className={`${btn.primary} h-12`}>
                {editing ? 'Save and publish' : 'Publish'}
              </button>
              <button type="button" onClick={() => submit(false)} disabled={!!saving} className={`${btn.secondary} h-12`}>
                Save as paused
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
