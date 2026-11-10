'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Plus,
  Calendar,
  CheckSquare,
  Upload,
  Sparkles,
  Users,
  Repeat,
  UserCheck,
} from '@/components/ui/icons';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { useApp } from '@/context/AppContext';
import { dedupeNotifications } from '@/lib/notificationDedupe';
import { AddHomeworkModal } from '../homework/AddHomeworkModal';
import { TimetableImportModal } from '../timetable/TimetableImportModal';
import { HomeworkScanModal } from '../homework/HomeworkScanModal';
import { CalendarImportModal } from '../calendar/CalendarImportModal';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    notifications,
    setCommandPaletteOpen,
    profile,
  } = useApp();
  const isFacultyUser = profile?.role === 'faculty';

    const [addMenuOpen, setAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    if (addMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [addMenuOpen]);
  const [showAddHwModal, setShowAddHwModal] = useState(false);
  const [showTimetableImportModal, setShowTimetableImportModal] = useState(false);
  const [showHwScanModal, setShowHwScanModal] = useState(false);
  const [showCalendarImportModal, setShowCalendarImportModal] = useState(false);

  // Desktop context line: date and time to the minute (a ticking seconds clock is noise)
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const date = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      setCurrentTime(`${date} · ${time}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifs = dedupeNotifications(notifications).filter((n) => !n.read).length;

  // Same names as the sidebar, so the header always says where you are
  const viewTitles: Record<string, string> = {
    home: 'Home',
    timetable: 'Timetable',
    exams: 'Exams',
    papers: 'Question papers',
    notices: 'Campus notices',
    notes: 'Notes',
    friends: 'Friends',
    homework: 'Assignments',
    carry: isFacultyUser ? 'Batches' : 'Bag',
    routines: 'Routines',
    attendance: 'Attendance',
    faculty: 'Faculty',
    subjects: 'Subjects',
    calendar: 'Academic calendar',
    mess: 'Mess menu',
    notifications: 'Notifications',
    settings: 'Profile & settings',
  };

  // Quick-create menu: grouped (Create / Import), each action with a tinted icon and a one-line hint.
  const TONE = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-400/20',
    violet: 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20',
    teal: 'bg-teal-50 text-teal-700 border-teal-200/70 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
    sky: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/20',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
  };
  const goAndOpen = (view: any, event?: string) => {
    setActiveView(view);
    // Let the target screen mount, then ask it to open its sheet
    if (event) setTimeout(() => window.dispatchEvent(new Event(event)), 60);
  };
  type CreateItem = { label: string; hint: string; icon: React.ComponentType<{ className?: string }>; tone: string; run: () => void };
  const createSections: { title: string; items: CreateItem[] }[] = isFacultyUser
    ? [
        {
          title: 'Create',
          items: [
            { label: 'Take attendance', hint: 'Mark present & absent for a class', icon: UserCheck, tone: TONE.emerald, run: () => goAndOpen('attendance') },
            { label: 'New assignment', hint: 'Post work to your batches', icon: CheckSquare, tone: TONE.indigo, run: () => goAndOpen('homework', 'faculty:new-assignment') },
            { label: 'New reminder', hint: 'A repeating to-do for yourself', icon: Repeat, tone: TONE.teal, run: () => goAndOpen('routines', 'routines:new') },
          ],
        },
        {
          title: 'Manage',
          items: [
            { label: 'Connect a batch', hint: 'Link a class with its batch code', icon: Users, tone: TONE.violet, run: () => goAndOpen('carry', 'faculty:connect-batch') },
            { label: 'My timetable', hint: 'See and edit your lectures', icon: Calendar, tone: TONE.sky, run: () => goAndOpen('timetable') },
          ],
        },
      ]
    : [
        {
          title: 'Create',
          items: [
            { label: 'New assignment', hint: 'Homework, lab or submission', icon: CheckSquare, tone: TONE.indigo, run: () => setShowAddHwModal(true) },
            { label: 'Scan homework', hint: 'Snap a photo, AI fills it in', icon: Sparkles, tone: TONE.violet, run: () => setShowHwScanModal(true) },
            { label: 'New routine', hint: 'Study, gym or sleep reminders', icon: Repeat, tone: TONE.teal, run: () => goAndOpen('routines', 'routines:new') },
          ],
        },
        {
          title: 'Import',
          items: [
            { label: 'Import timetable', hint: 'From a photo or PDF of your schedule', icon: Upload, tone: TONE.sky, run: () => setShowTimetableImportModal(true) },
            { label: 'Import academic calendar', hint: 'Holidays, exams and breaks', icon: Calendar, tone: TONE.rose, run: () => setShowCalendarImportModal(true) },
          ],
        },
      ];

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full isolate flex items-center justify-center px-4 sm:px-8 md:px-0 md:h-[72px] md:!py-0"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 12px), 28px)',
          paddingBottom: '12px',
        }}
      >
        {/* Frosted glass bar (light mode); solid in dark mode — see .lg-header-bar */}
        <div aria-hidden="true" className="lg-header-bar pointer-events-none absolute inset-0 -z-10" />
        <div className="flex items-center justify-between w-full max-w-6xl mx-auto relative md:px-f5">
          <div className="flex items-center gap-3 select-none">
          {/* Logo only shown on mobile where sidebar is hidden */}
          <h1 className="md:hidden text-[21px] sm:text-2xl leading-none text-fg tracking-tighter font-sans">
            <span className="font-extrabold">inter</span>
            <span className="font-normal opacity-80">semester</span>
          </h1>

          {/* Desktop: where you are (the logo already lives in the sidebar) */}
          <h1 className="hidden md:block text-[24px] font-semibold tracking-tight text-fg">
            {viewTitles[activeView] || 'Home'}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium tracking-tight text-fg">
          {/* Date and time, quietly */}
          {currentTime && (
            <span className="hidden lg:inline mr-f3 text-[15px] text-muted tabular-nums">{currentTime}</span>
          )}

          {/* Notifications: a small Liquid Glass circle */}
          <button
            type="button"
            onClick={() => setActiveView('notifications')}
            className="lg lg-press relative w-[34px] h-[34px] md:w-[38px] md:h-[38px] rounded-full flex items-center justify-center text-fg cursor-pointer"
            title={`Notifications (${unreadNotifs} unread)`}
            aria-label={unreadNotifs ? `Notifications, ${unreadNotifs} unread` : 'Notifications'}
          >
            <Bell className="w-4 h-4 md:w-[17px] md:h-[17px] text-fg" strokeWidth={1.9} />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] bg-rose-500 text-white text-[9px] font-bold tabular-nums flex items-center justify-center ring-[1.5px] ring-canvas leading-none rounded-full">
                {unreadNotifs > 99 ? '99+' : unreadNotifs}
              </span>
            )}
          </button>
          
          {/* Quick Create Dropdown: Original clean icon on mobile */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="lg lg-ink lg-press w-[34px] h-[34px] md:w-auto md:h-[38px] md:pl-3 md:pr-4 md:ml-1 md:gap-1.5 rounded-full flex items-center justify-center cursor-pointer"
              title="Create" aria-label="Create" aria-expanded={addMenuOpen}
            >
              <Plus className={`w-4 h-4 stroke-[2.25] transition-transform duration-200 ${addMenuOpen ? 'rotate-45' : ''}`} />
              <span className="hidden md:inline text-[14px] font-semibold">New</span>
            </button>

            {addMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setAddMenuOpen(false)} />
                <div
                  role="menu"
                  className="lg lg-menu absolute right-[-48px] md:right-0 mt-2.5 w-[min(320px,calc(100vw-24px))] rounded-[22px] overflow-hidden z-50 text-left origin-top-right animate-[menuIn_160ms_cubic-bezier(0.16,1,0.3,1)]"
                >
                  {createSections.map((section, si) => (
                    <div key={section.title} className={si > 0 ? 'border-t border-black/[0.06] dark:border-white/[0.08]' : ''}>
                      <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{section.title}</p>
                      <div className="px-1.5 pb-1.5">
                        {section.items.map((item) => (
                          <button
                            key={item.label}
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setAddMenuOpen(false);
                              item.run();
                            }}
                            className="group flex items-center gap-3 w-full px-2.5 py-2 text-left rounded-[14px] hover:bg-black/[0.05] active:bg-black/[0.08] dark:hover:bg-white/[0.07] dark:active:bg-white/[0.1] transition-colors cursor-pointer"
                          >
                            <span className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center border ${item.tone}`}>
                              <item.icon className="w-[18px] h-[18px]" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14px] font-semibold text-fg leading-tight">{item.label}</span>
                              <span className="block mt-0.5 text-[12px] text-muted leading-tight truncate">{item.hint}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile: the character the user picked, opens Profile */}
          <button
            type="button"
            onClick={() => setActiveView('settings')}
            title="Profile" aria-label="Open profile"
            aria-current={activeView === 'settings' ? 'page' : undefined}
            className="lg lg-press ml-0.5 w-[38px] h-[38px] p-[2px] md:hidden rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className={`block w-full h-full rounded-full overflow-hidden bg-[#F1EFEA] dark:bg-[#F4F4F6] ${
              activeView === 'settings' ? 'ring-[1.5px] ring-fg' : ''
            }`}>
              <img src={getAvatarSrc(getAvatarSeed(profile))} alt="" className="w-full h-full object-cover scale-110 translate-y-[2px]" />
            </span>
          </button>
        </div>
        </div>
      </header>

      {/* Modals */}
      <AddHomeworkModal isOpen={showAddHwModal} onClose={() => setShowAddHwModal(false)} />
      <TimetableImportModal isOpen={showTimetableImportModal} onClose={() => setShowTimetableImportModal(false)} />
      <HomeworkScanModal isOpen={showHwScanModal} onClose={() => setShowHwScanModal(false)} />
      <CalendarImportModal isOpen={showCalendarImportModal} onClose={() => setShowCalendarImportModal(false)} />
    </>
  );
};
