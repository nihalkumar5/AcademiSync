'use client';

import { routinesForDay, isDoneOn } from '@/lib/routines';
import React, { useEffect, useState } from 'react';
import {
  House,
  CalendarDays,
  CheckSquare,
  User,
  Users,
  ClipboardList,
  Utensils,
  CalendarRange,
  BookOpen,
  Bell,
  ChevronRight,
  Repeat,
  UserCheck,
  GraduationCap,
  FileText,
  Megaphone,
  NotebookPen,
  Search,
} from '@/components/ui/icons';
import { useApp, ActiveView } from '@/context/AppContext';
import { dedupeNotifications } from '@/lib/notificationDedupe';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// The floating tab bar sits this far above the bottom edge (clears the home indicator / gesture bar)
const NAV_BOTTOM = 'max(calc(env(safe-area-inset-bottom, 0px) + 6px), 14px)';

type MoreItem = { id: ActiveView; label: string; short?: string; hint: string; icon: React.ReactNode; badge?: number };

// Soft tinted tiles for the More sheet: pastel fill + deeper ink of the same hue (dark mode uses a
// low-alpha fill and a lighter ink so they glow without shouting). Full class strings so Tailwind keeps them.
const MORE_TONES: Record<string, string> = {
  carry: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
  friends: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  papers: 'bg-cyan-50 text-cyan-700 border-cyan-200/70 dark:bg-cyan-400/10 dark:text-cyan-300 dark:border-cyan-400/20',
  attendance: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/70 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:border-fuchsia-400/20',
  routines: 'bg-teal-50 text-teal-700 border-teal-200/70 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20',
  exams: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20',
  mess: 'bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/20',
  calendar: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/20',
  faculty: 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20',
  subjects: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  notes: 'bg-yellow-50 text-yellow-700 border-yellow-200/70 dark:bg-yellow-400/10 dark:text-yellow-300 dark:border-yellow-400/20',
  notices: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/20',
  notifications: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-400/20',
  settings: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-white/[0.06] dark:text-stone-300 dark:border-white/10',
};

export const MobileNav: React.FC = () => {
  const { activeView, setActiveView, homework, profile, exams, notifications, routines } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [moreQuery, setMoreQuery] = useState('');

  // The floating tab bar steps out of the way so it never sits on a form:
  // - scrolling down hides it (scrolling up brings it back), so Save buttons at the end of a page show
  // - typing in a field hides it (it would ride on top of the keyboard)
  // - an open modal/sheet hides it (Modal locks body scroll)
  const [scrollHidden, setScrollHidden] = useState(false);
  const [typing, setTyping] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (Math.abs(dy) < 8) return;
      setScrollHidden(dy > 0 && y > 80);
      lastY = y;
    };
    const FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]):not([type=file]), textarea, select, [contenteditable="true"]';
    const isField = (el: EventTarget | null) => el instanceof Element && el.matches(FIELD) && !el.closest('#mobile-nav');
    const onFocusIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onFocusOut = () => setTimeout(() => setTyping(isField(document.activeElement)), 0);
    const readLock = () => setLocked(document.body.style.overflow === 'hidden');
    const mo = new MutationObserver(readLock);
    mo.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    readLock();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // A new screen starts with the bar visible
  useEffect(() => setScrollHidden(false), [activeView]);

  const navHidden = !isMoreOpen && (scrollHidden || typing || locked);
  const isFaculty = profile?.role === 'faculty';

  const pendingHomework = homework.filter((h) => h.status !== 'Completed').length;
  const unreadNotifs = dedupeNotifications(notifications).filter((n) => !n.read).length;
  const routinesLeftToday = routinesForDay(routines, new Date()).filter((r) => !isDoneOn(r, new Date())).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAhead = todayStart.getTime() + 8 * 24 * 60 * 60 * 1000;
  const examsThisWeek = exams.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= todayStart.getTime() && t < weekAhead;
  }).length;

  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <House className="w-5 h-5" /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-5 h-5" /> },
    ...(isFaculty ? [{ id: 'attendance' as ActiveView, label: 'Attendance', icon: <UserCheck className="w-5 h-5" /> }] : []),
    {
      id: 'homework',
      label: 'Assignments',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: !isFaculty && pendingHomework > 0 ? pendingHomework : undefined,
    },
    ...(isFaculty ? [] : [{ id: 'routines' as ActiveView, label: 'Routines', icon: <Repeat className="w-5 h-5" />, badge: routinesLeftToday || undefined }]),
  ];

  // Everything that isn't a daily destination lives one tap away under "More".
  // Grouped so the eye finds things by purpose: what's urgent for studies first, then daily campus
  // life, then people. For students the header button is Chats, so Notifications lives here; Profile
  // sits in the header.
  type MoreGroup = { label: string; items: MoreItem[] };
  const moreGroups: MoreGroup[] = isFaculty
    ? [
        {
          label: 'Teaching',
          items: [
            { id: 'carry', label: 'Batches', hint: 'Linked batches & class codes', icon: <Users className="w-5 h-5" /> },
            { id: 'papers', label: 'Question papers', short: 'Papers', hint: 'Past papers for your college', icon: <FileText className="w-5 h-5" /> },
            { id: 'routines', label: 'Routines', hint: 'Your reminders & repeating to-dos', icon: <Repeat className="w-5 h-5" />, badge: routinesLeftToday || undefined },
          ],
        },
        {
          label: 'Campus',
          items: [
            { id: 'notices', label: 'Campus notices', short: 'Notices', hint: 'Events, deadlines & offers', icon: <Megaphone className="w-5 h-5" /> },
            { id: 'calendar', label: 'Academic calendar', short: 'Calendar', hint: 'Holidays, exams & breaks', icon: <CalendarRange className="w-5 h-5" /> },
          ],
        },
      ]
    : [
        {
          label: 'Studies',
          items: [
            { id: 'attendance', label: 'Attendance', hint: 'See how many classes you can skip', icon: <UserCheck className="w-5 h-5" /> },
            { id: 'notes', label: 'Notes', hint: 'Everything you saved in class', icon: <NotebookPen className="w-5 h-5" /> },
            { id: 'exams', label: 'Exams', hint: 'Dates, rooms & countdowns', icon: <ClipboardList className="w-5 h-5" />, badge: examsThisWeek || undefined },
          ],
        },
        {
          label: 'Classes',
          items: [
            { id: 'subjects', label: 'Subjects', hint: 'Rooms, teachers & what to carry', icon: <BookOpen className="w-5 h-5" /> },
            { id: 'faculty', label: 'Faculty', hint: 'Your teachers & campus faculty', icon: <GraduationCap className="w-5 h-5" /> },
            { id: 'papers', label: 'Question papers', short: 'Papers', hint: 'Past papers of your branch', icon: <FileText className="w-5 h-5" /> },
          ],
        },
        {
          label: 'Campus',
          items: [
            { id: 'mess', label: 'Mess menu', short: 'Mess', hint: "Today's meals & timings", icon: <Utensils className="w-5 h-5" /> },
            { id: 'notices', label: 'Campus notices', short: 'Notices', hint: 'Events, deadlines & offers', icon: <Megaphone className="w-5 h-5" /> },
            { id: 'calendar', label: 'Academic calendar', short: 'Calendar', hint: 'Holidays, exams & breaks', icon: <CalendarRange className="w-5 h-5" /> },
          ],
        },
        {
          label: 'People',
          items: [
            { id: 'friends', label: 'Friends', hint: "See who's free right now", icon: <Users className="w-5 h-5" /> },
            { id: 'notifications', label: 'Notifications', short: 'Alerts', hint: 'Class alerts & updates', icon: <Bell className="w-5 h-5" />, badge: unreadNotifs || undefined },
          ],
        },
      ];
  const moreItems: MoreItem[] = moreGroups.flatMap((g) => g.items);

  const isMoreActive = moreItems.some((item) => item.id === activeView);
  const moreBadge = moreItems.reduce((sum, item) => sum + (item.badge || 0), 0);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMoreOpen]);

  // The round search button opens this sheet: every section, plus a box to find one by name
  useEffect(() => {
    if (!isMoreOpen) setMoreQuery('');
  }, [isMoreOpen]);
  const q = moreQuery.trim().toLowerCase();
  const shownGroups: MoreGroup[] = q
    ? (() => {
        const seen = new Set<string>();
        const all: MoreItem[] = [
          ...tabs.map((t): MoreItem => ({ id: t.id, label: t.label, hint: "", icon: t.icon, badge: t.badge })),
          ...moreItems,
          { id: 'settings' as ActiveView, label: 'Profile & settings', short: 'Profile', hint: 'Your account and preferences', icon: <User className="w-5 h-5" /> },
        ].filter((it) => {
          if (seen.has(it.id)) return false;
          seen.add(it.id);
          return [it.label, it.short, it.hint].some((x) => x && x.toLowerCase().includes(q));
        });
        return all.length ? [{ label: 'Results', items: all }] : [];
      })()
    : moreGroups;

  const goTo = (view: ActiveView) => {
    setIsMoreOpen(false);
    setActiveView(view);
  };

  const renderTab = (id: string, label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void, badge?: number) => (
    <button
      key={id}
      type="button"
      onClick={onClick}
      aria-label={badge ? `${label}, ${badge} pending` : label}
      title={label}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'flex items-center justify-center relative cursor-pointer flex-1 h-full min-w-0 select-none transition-[color,transform] duration-200 active:scale-[0.92]',
        isActive ? 'text-fg' : 'text-muted hover:text-fg'
      )}
    >
      {/* Active tab: a drop of lighter glass glides between tabs (shared layoutId) */}
      {isActive && (
        <motion.div
          layoutId="mobile-nav-indicator"
          className="absolute inset-x-[3px] inset-y-[5px] rounded-full bg-fg/[0.08] dark:bg-white/[0.12]"
          transition={{ type: 'spring', stiffness: 480, damping: 38, mass: 0.8 }}
        />
      )}
      <div className="relative flex items-center justify-center [&>span>svg]:w-[23px] [&>span>svg]:h-[23px]">
        <span className="relative">{icon}</span>
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-[3px] bg-rose-500 text-white text-[9px] font-bold tabular-nums flex items-center justify-center leading-none rounded-full ring-[1.5px] ring-white/80 dark:ring-black/40">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

    </button>
  );

  return (
    <>
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              className="md:hidden fixed inset-0 z-[38] bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              key="more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="More sections"
              className="md:hidden fixed left-0 right-0 bottom-0 z-[39] bg-surface rounded-t-[28px] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.8)] pt-[13px] px-[21px]"
              style={{ paddingBottom: `calc(${NAV_BOTTOM} + 58px + 16px)` }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            >
              <div className="mx-auto mb-[13px] h-1 w-[34px] rounded-full bg-[#D9D9D6] dark:bg-white/15" />
              <label className="max-w-md mx-auto mb-[21px] flex items-center gap-2.5 h-11 px-4 rounded-full bg-surface-2 focus-within:ring-4 focus-within:ring-fg/[0.06] transition-shadow">
                <Search className="w-[18px] h-[18px] text-muted shrink-0" />
                <input
                  type="search"
                  value={moreQuery}
                  onChange={(e) => setMoreQuery(e.target.value)}
                  placeholder="Search sections"
                  aria-label="Search sections"
                  className="flex-1 min-w-0 bg-transparent text-[16px] text-fg placeholder:text-faint focus:outline-none"
                />
              </label>
              {/* Spacing follows the Fibonacci scale (8 · 13 · 21 · 34), each step ≈ the last × φ (1.618) */}
              <div className="max-w-md mx-auto max-h-[min(58vh,calc(100dvh-260px))] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-[21px] pb-[8px]">
                {q && shownGroups.length === 0 && (
                  <p className="py-6 text-center text-[14px] text-muted">Nothing called &ldquo;{moreQuery}&rdquo;.</p>
                )}
                {shownGroups.map((g) => (
                  <section key={g.label} aria-label={g.label}>
                    <p className="mb-[8px] text-[13px] font-semibold text-muted">{g.label}</p>
                    <ul className={clsx('grid gap-[8px]', g.items.length === 1 ? 'grid-cols-1' : 'grid-cols-3')}>
                      {g.items.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => goTo(item.id)}
                              aria-current={isActive ? 'page' : undefined}
                              aria-label={`${item.label}: ${item.hint}`}
                              className={clsx(
                                'rounded-tile relative w-full text-left border transition-colors cursor-pointer',
                                g.items.length === 1 ? 'h-[55px] px-[13px] flex items-center gap-[13px]' : 'h-[89px] p-[13px] flex flex-col items-start justify-between',
                                isActive
                                  ? 'bg-ink text-on-ink border-ink'
                                  : 'bg-surface border-line-soft hover:border-line active:bg-surface-2'
                              )}
                            >
                              <span
                                className={clsx(
                                  'rounded-full w-[34px] h-[34px] flex items-center justify-center border [&>svg]:w-[21px] [&>svg]:h-[21px]',
                                  isActive ? 'bg-on-ink/10 border-on-ink/20 text-on-ink' : MORE_TONES[item.id] || 'bg-surface-2 text-fg border-line-soft'
                                )}
                              >
                                {item.icon}
                              </span>
                              <span className={clsx('text-[13px] font-semibold leading-none truncate max-w-full', isActive ? 'text-on-ink' : 'text-fg')}>
                                {item.short || item.label}
                              </span>
                              {g.items.length === 1 && (
                                <span className={clsx('ml-auto text-[12px] truncate', isActive ? 'text-on-ink/70' : 'text-muted')}>{item.hint}</span>
                              )}
                              {item.badge ? (
                                <span className="absolute top-[8px] right-[8px] min-w-[21px] h-[21px] px-1 bg-rose-500 text-white text-[11px] font-bold tabular-nums flex items-center justify-center rounded-full">
                                  {item.badge}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating tab bar (like Substack): an icon-only glass pill for the sections, and a separate
          round button on the right for search, so the one action that isn't a place stands apart. */}
      <nav
        id="mobile-nav"
        aria-label="Main"
        className={clsx(
          'md:hidden fixed z-40 left-3 right-3 mx-auto max-w-[440px] flex items-center gap-2 select-none',
          'transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
          navHidden ? 'translate-y-[calc(100%+40px)] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        )}
        style={{ bottom: NAV_BOTTOM }}
        aria-hidden={navHidden || undefined}
      >
        <div className="lg lg-bar flex-1 min-w-0 rounded-full px-1.5 flex items-center relative h-[58px]">
          {tabs.map((tab) =>
            renderTab(tab.id, tab.label, tab.icon, !isMoreOpen && activeView === tab.id, () => goTo(tab.id), tab.badge)
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsMoreOpen((open) => !open)}
          aria-label={moreBadge ? `All sections and search, ${moreBadge} new` : 'All sections and search'}
          aria-expanded={isMoreOpen}
          aria-current={isMoreActive && !isMoreOpen ? 'page' : undefined}
          title="Search"
          className={clsx(
            'lg lg-bar relative shrink-0 w-[58px] h-[58px] rounded-full flex items-center justify-center cursor-pointer active:scale-[0.92] transition-transform',
            isMoreOpen || isMoreActive ? 'text-fg' : 'text-muted'
          )}
        >
          {(isMoreOpen || isMoreActive) && <span className="absolute inset-[5px] rounded-full bg-fg/[0.08] dark:bg-white/[0.12]" aria-hidden="true" />}
          <Search className="relative w-[23px] h-[23px]" />
          {moreBadge > 0 && (
            <span className="absolute top-2 right-2 min-w-[15px] h-[15px] px-[3px] bg-rose-500 text-white text-[9px] font-bold tabular-nums flex items-center justify-center leading-none rounded-full ring-[1.5px] ring-white/80 dark:ring-black/40">
              {moreBadge > 9 ? '9+' : moreBadge}
            </span>
          )}
        </button>
      </nav>
    </>
  );
};
