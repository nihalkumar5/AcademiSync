'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, MapPin, Search, GraduationCap, AlertTriangle, Copy, Check, BookOpen, ChevronRight, X } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';

interface FacultyEntry {
  id: string;
  name: string;
  title: string;
  department: string;
  office: string;
  email: string;
  avatarUrl: string;
  teachesYou: boolean;
  subjects: string[];
  onApp: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/\b(dr|prof|mr|mrs|ms|asst)\.?\s*/g, '').replace(/[^a-z]/g, '');

// Teachers without an app account get initials on a soft tint picked from their name (stable per person)
const TONES = [
  'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-400/20',
  'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20',
  'bg-teal-50 text-teal-700 border-teal-200/70 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20',
  'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
  'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/20',
  'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20',
  'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
];
const toneFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
};
/** "09:00","10:55" → "9:00–10:55 AM"; shows both periods only when they differ. */
const timeRange = (start: string, end: string) => {
  const part = (t: string) => {
    let [h, m] = (t || '').split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h)) return { text: t, period: '' };
    if (/pm/i.test(t) && h < 12) h += 12;
    if (/am/i.test(t) && h === 12) h = 0;
    return { text: `${h % 12 || 12}:${String(m || 0).padStart(2, '0')}`, period: h >= 12 ? 'PM' : 'AM' };
  };
  const a = part(start);
  const b = part(end);
  return a.period === b.period ? `${a.text}–${b.text} ${b.period}` : `${a.text} ${a.period}–${b.text} ${b.period}`;
};
const initials = (name: string) => {
  const words = name.replace(/^(dr|prof|mr|mrs|ms)\.?\s*/i, '').split(/[\s/]+/).filter(Boolean);
  return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
};

// Campus faculty for students: "Your teachers" first (linked to your batch, or named in your
// subjects), then everyone at your college, searchable by name, subject or department.
export const FacultyDirectoryView: React.FC = () => {
  const { user, subjects, timetable } = useApp();
  const [selected, setSelected] = useState<FacultyEntry | null>(null);
  const [list, setList] = useState<FacultyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('all');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { getAuthHeaders } = await import('@/lib/authHeaders');
        const res = await fetch('/api/faculty/directory', { headers: await getAuthHeaders({}) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.faculty)) throw new Error(data.error || 'failed');
        if (alive) setList(data.faculty.map((f: any) => ({ ...f, onApp: true })));
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Teachers named in the student's own subjects, matched to app accounts where possible
  const merged = useMemo(() => {
    const out = list.map((f) => ({ ...f, subjects: [...f.subjects] }));
    (subjects || []).forEach((s) => {
      const name = (s.facultyName || '').trim();
      if (!name || /^(tba|na|n\/a|-)$/i.test(name)) return;
      const hit = out.find((f) => (s.facultyEmail && f.email === s.facultyEmail.toLowerCase()) || norm(f.name) === norm(name));
      if (hit) {
        hit.teachesYou = true;
        if (!hit.subjects.includes(s.name)) hit.subjects.push(s.name);
      } else {
        const existing = out.find((f) => !f.onApp && norm(f.name) === norm(name));
        if (existing) {
          if (!existing.subjects.includes(s.name)) existing.subjects.push(s.name);
        } else {
          out.push({ id: `tt_${norm(name)}`, name: name.replace(/^(dr|prof)\.?\s*/i, ''), title: /^dr/i.test(name) ? 'Dr.' : /^prof/i.test(name) ? 'Prof.' : '', department: '', office: '', email: (s.facultyEmail || '').toLowerCase(), avatarUrl: '', teachesYou: true, subjects: [s.name], onApp: false });
        }
      }
    });
    return out;
  }, [list, subjects]);

  const mine = merged.filter((f) => f.teachesYou);
  const campus = merged.filter((f) => !f.teachesYou && f.onApp);
  const depts = Array.from(new Set(campus.map((f) => f.department).filter(Boolean))).sort();
  const q = query.trim().toLowerCase();
  const match = (f: FacultyEntry) => !q || f.name.toLowerCase().includes(q) || f.department.toLowerCase().includes(q) || f.subjects.some((s) => s.toLowerCase().includes(q));
  const campusShown = campus.filter((f) => (dept === 'all' || f.department === dept) && match(f));
  const mineShown = mine.filter(match);

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      setTimeout(() => setCopied(''), 1500);
    } catch {}
  };

  const fullName = (f: FacultyEntry) => [f.title, f.name].filter(Boolean).join(' ');

  const Avatar = ({ f, size }: { f: FacultyEntry; size: 'lg' | 'sm' }) => {
    const box = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
    if (f.onApp) {
      return (
        <span className={`${box} inline-flex shrink-0 rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-[#F4F4F6] ring-1 ring-line`}>
          <img src={getAvatarSrc(getAvatarSeed({ avatarUrl: f.avatarUrl, id: f.id, role: 'faculty' }))} alt="" className="w-full h-full object-cover scale-110 translate-y-[2px]" />
        </span>
      );
    }
    return (
      <span className={`${box} inline-flex shrink-0 rounded-full items-center justify-center border font-semibold tracking-tight ${size === 'lg' ? 'text-[18px]' : 'text-[14px]'} ${toneFor(f.name)}`} aria-hidden="true">
        {initials(f.name)}
      </span>
    );
  };

  const SubjectChips = ({ list, max }: { list: string[]; max: number }) => (
    <div className="flex flex-wrap gap-1.5">
      {list.slice(0, max).map((s) => (
        <span key={s} className="max-w-full h-7 px-2.5 inline-flex items-center gap-1.5 bg-surface-2 text-[12px] font-medium text-fg-2 dark:text-[#D4D4D8]">
          <BookOpen className="w-3.5 h-3.5 shrink-0 text-muted" />
          <span className="truncate">{s}</span>
        </span>
      ))}
      {list.length > max && <span className="h-7 px-2 inline-flex items-center text-[12px] font-medium text-muted">+{list.length - max} more</span>}
    </div>
  );

  // One thin row per person; tapping it opens the detail sheet. Mail stays one tap away on the right.
  const FacultyRow = ({ f }: { f: FacultyEntry }) => {
    const meta = f.teachesYou
      ? f.subjects.join(', ') || f.department || 'Faculty'
      : [f.department || 'Faculty', f.office, f.subjects.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
    return (
      <li className="flex items-center gap-f3 px-f4 py-f3 hover:bg-surface-2/60 transition-colors">
        <button type="button" onClick={() => setSelected(f)} className="flex-1 min-w-0 flex items-center gap-f3 text-left cursor-pointer" aria-label={`Open ${fullName(f)}`}>
          <Avatar f={f} size="sm" />
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-fg truncate">{fullName(f)}</span>
            <span className="block text-[13px] text-muted truncate">{meta}</span>
          </span>
        </button>
        {f.email ? (
          <a href={`mailto:${f.email}`} aria-label={`Email ${f.name}`} className="shrink-0 w-10 h-10 flex items-center justify-center border border-line text-fg hover:border-line-strong transition-colors">
            <Mail className="w-4 h-4" />
          </a>
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-faint" aria-hidden="true" />
        )}
      </li>
    );
  };

  // Detail sheet: everything about one teacher, and when you'll see them next (from your timetable)
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const classesWith = (f: FacultyEntry) => {
    const subjectIds = new Set(
      (subjects || [])
        .filter((s) => f.subjects.includes(s.name) || (f.email && (s.facultyEmail || '').toLowerCase() === f.email) || (s.facultyName && norm(s.facultyName) === norm(f.name)))
        .map((s) => s.id)
    );
    return (timetable || [])
      .filter((c) => subjectIds.has(c.subjectId))
      .map((c) => ({ ...c, subjectName: (subjects || []).find((s) => s.id === c.subjectId)?.name || c.subjectName || 'Class' }))
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.startTime.localeCompare(b.startTime));
  };

  const FacultyDetail = ({ f, onClose }: { f: FacultyEntry | null; onClose: () => void }) => {
    const sessions = f ? classesWith(f) : [];
    // One block per subject: name once, shared room once, each class as a small "Mon 9:00–10:55 AM" chip
    const groups = f
      ? Array.from(new Set([...f.subjects, ...sessions.map((c) => c.subjectName)])).map((name) => {
          const list = sessions.filter((c) => c.subjectName === name);
          const rooms = Array.from(new Set(list.map((c) => (c.room || '').trim()).filter(Boolean)));
          return { name, sessions: list, room: rooms.length === 1 ? rooms[0] : '' };
        })
      : [];
    return (
      <Modal isOpen={!!f} onClose={onClose} maxWidth="md" showCloseButton={false}>
        {f && (
          <div className="relative flex flex-col">
            <button type="button" onClick={onClose} aria-label="Close" className="absolute -top-2 -right-2 w-9 h-9 flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-f3 pb-f4 pr-8">
              <Avatar f={f} size="lg" />
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[19px] font-semibold tracking-tight text-fg leading-snug">{fullName(f)}</p>
                <p className="mt-0.5 text-[14px] text-muted">{f.department || 'Faculty'}</p>
                <div className="mt-f2 flex items-center gap-1.5 flex-wrap">
                  {f.teachesYou && <span className="inline-flex items-center h-6 px-2 text-[12px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-400/10">Teaches you</span>}
                  {f.onApp ? (
                    <span className="inline-flex items-center gap-1 h-6 px-2 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-400/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> On Intersemester
                    </span>
                  ) : (
                    <span className="inline-flex items-center h-6 px-2 text-[12px] font-medium text-muted bg-surface-2">From your timetable</span>
                  )}
                </div>
              </div>
            </div>

            {(f.email || f.office) && (
              <div className="border border-line divide-y divide-line-soft">
                {f.email && (
                  <div className="flex items-center gap-f3 px-f3 py-f3">
                    <Mail className="w-4 h-4 shrink-0 text-muted" />
                    <span className="flex-1 min-w-0 text-[14px] text-fg truncate">{f.email}</span>
                    <button type="button" onClick={() => copyEmail(f.email)} className="btn btn-ghost btn-sm h-8 px-2" aria-label="Copy email">
                      {copied === f.email ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                {f.office && (
                  <div className="flex items-center gap-f3 px-f3 py-f3">
                    <MapPin className="w-4 h-4 shrink-0 text-muted" />
                    <span className="flex-1 min-w-0 text-[14px] text-fg">{f.office}</span>
                  </div>
                )}
              </div>
            )}

            {groups.length > 0 && (
              <div className="mt-f5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint mb-f3">{f.teachesYou ? 'Teaches you' : 'Subjects'}</p>
                <div className="flex flex-col gap-f4">
                  {groups.map((g) => (
                    <div key={g.name}>
                      <p className="text-[15px] font-semibold text-fg leading-snug">{g.name}</p>
                      {g.room && <p className="mt-0.5 text-[13px] text-muted">{g.room}</p>}
                      {g.sessions.length > 0 && (
                        <div className="mt-f2 flex flex-wrap gap-1.5">
                          {g.sessions.map((c) => (
                            <span key={c.id} className="h-7 px-2 inline-flex items-center gap-1.5 bg-surface-2 text-[12px] text-fg tabular-nums">
                              <span className="font-semibold">{c.day.slice(0, 3)}</span>
                              <span className="text-muted">{timeRange(c.startTime, c.endTime)}</span>
                              {c.isLab && <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">LAB</span>}
                              {!g.room && c.room && <span className="text-muted">· {c.room}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-f5 flex flex-col gap-2">
              {f.email ? (
                <a href={`mailto:${f.email}`} className="btn btn-primary w-full h-12">
                  <Mail className="w-4 h-4" /> Email {f.title ? `${f.title} ` : ''}{f.name.split(/[\s/]+/)[0]}
                </a>
              ) : (
                <p className="text-center text-[13px] text-muted">No email shared yet. Ask your batch pilot to add it to the subject.</p>
              )}
              <button type="button" onClick={onClose} className="btn btn-secondary w-full h-12">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    );
  };

  const Skeleton = () => (
    <ul className="border border-line bg-surface divide-y divide-line-soft" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-f3 px-f4 py-f3">
          <span className="w-10 h-10 rounded-full bg-surface-2 animate-pulse" />
          <span className="flex-1 flex flex-col gap-2">
            <span className="h-3.5 w-1/2 bg-surface-2 animate-pulse" />
            <span className="h-3 w-1/3 bg-surface-2 animate-pulse" />
          </span>
        </li>
      ))}
    </ul>
  );


  return (
    <div className="flex flex-col gap-f5 sm:gap-f6 text-left max-w-4xl mx-auto w-full pb-f7">
      <div>
        <h2 className="page-title">
          Faculty,
          <br />
          Campus
        </h2>
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          <span className="tag bg-surface">{mine.length} teach you</span>
          {campus.length > 0 && <span className="tag bg-surface">{campus.length} on campus</span>}
        </div>
        <p className="text-[14px] text-muted leading-[20px] mt-4 max-w-md">Your teachers and everyone at your college. Tap a name for details.</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, subject or department"
          aria-label="Search faculty"
          className="w-full h-12 pl-10 pr-3 bg-surface border border-line text-[15px] text-fg placeholder:text-faint focus:outline-none focus:border-line-strong transition-colors"
        />
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-3 mb-f3">
          <h3 className="text-[17px] font-semibold text-fg">Your teachers</h3>
          {!loading && <span className="text-[13px] text-muted tabular-nums">{mineShown.length}</span>}
        </div>
        {loading ? (
          <Skeleton />
        ) : mineShown.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-f6 border border-dashed border-line">
            <span className="w-12 h-12 flex items-center justify-center border border-line-soft text-fg">
              <GraduationCap className="w-5 h-5" />
            </span>
            <p className="mt-f3 text-[15px] font-semibold text-fg">{q ? 'No teacher matches' : 'No teachers yet'}</p>
            <p className="mt-1 text-[13px] text-muted max-w-[300px]">Teachers appear here once they link your batch, or when your subjects list a faculty name.</p>
          </div>
        ) : (
          <ul className="border border-line bg-surface divide-y divide-line-soft">
            {mineShown.map((f) => (
              <FacultyRow key={f.id} f={f} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3 mb-f3">
          <h3 className="text-[17px] font-semibold text-fg">Campus faculty</h3>
          {!loading && user && !failed && <span className="text-[13px] text-muted tabular-nums">{campusShown.length}</span>}
        </div>
        {depts.length > 1 && (
          <div className="flex gap-f2 overflow-x-auto no-scrollbar mb-f3 -mx-f4 px-f4 sm:mx-0 sm:px-0">
            {['all', ...depts].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDept(d)}
                aria-pressed={dept === d}
                className={`shrink-0 h-9 px-3 border text-[13px] font-medium cursor-pointer transition-colors ${dept === d ? 'bg-ink text-on-ink border-line-strong' : 'border-line text-fg hover:border-line-strong'}`}
              >
                {d === 'all' ? 'All departments' : d}
              </button>
            ))}
          </div>
        )}
        {!user ? (
          <p className="px-f4 py-f4 text-[14px] text-muted border border-dashed border-line">Sign in to see faculty at your college.</p>
        ) : failed ? (
          <p className="flex items-center gap-2 px-f4 py-f4 text-[14px] text-muted border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Couldn&apos;t load campus faculty. Check your connection.
          </p>
        ) : loading ? null : campusShown.length === 0 ? (
          <p className="px-f4 py-f4 text-[14px] text-muted border border-dashed border-line">
            {q || dept !== 'all' ? 'No one matches.' : 'No other faculty from your college are on Intersemester yet.'}
          </p>
        ) : (
          <ul className="border border-line bg-surface divide-y divide-line-soft">
            {campusShown.map((f) => (
              <FacultyRow key={f.id} f={f} />
            ))}
          </ul>
        )}
      </section>

      <FacultyDetail f={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
