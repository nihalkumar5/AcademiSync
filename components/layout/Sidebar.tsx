'use client';

import React from 'react';
import {
  House,
  CalendarDays,
  CheckSquare,
  BookOpen,
  CalendarRange,
  Bell,
  Search,
  Users,
  Repeat,
  UserCheck,
  ClipboardList,
  Utensils,
  Sun,
  Moon,
  Settings,
  GraduationCap,
  FileText,
  Megaphone,
} from '@/components/ui/icons';
import { useApp, ActiveView } from '@/context/AppContext';
import { dedupeNotifications } from '@/lib/notificationDedupe';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { getAvatarSeed, getAvatarSrc } from '@/lib/avatar';
import { getShortCollegeName } from '@/lib/timetableUtils';
import { routinesForDay, isDoneOn } from '@/lib/routines';

type NavItem = { id: ActiveView; label: string; icon: React.ElementType; count?: number; alert?: boolean };

// Desktop navigation. One quiet plane beside the page: the active screen is a raised white tile,
// counts are plain numbers, and only unread notifications get an ink pill (colour = meaning).
export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, profile, homework, notifications, routines, settings, updateSettings, setCommandPaletteOpen, user, isClerkLoaded } = useApp();
  const router = useRouter();

  const isFaculty = profile?.role === 'faculty';
  const pendingTasks = homework.filter((h) => h.status !== 'Completed').length;
  const unread = dedupeNotifications(notifications).filter((n) => !n.read).length;
  const routinesLeft = routinesForDay(routines, new Date()).filter((r) => !isDoneOn(r, new Date())).length;

  const groups: { label?: string; items: NavItem[] }[] = isFaculty
    ? [
        {
          items: [
            { id: 'home', label: 'Home', icon: House },
            { id: 'timetable', label: 'Timetable', icon: CalendarDays },
            { id: 'attendance', label: 'Attendance', icon: UserCheck },
            { id: 'homework', label: 'Assignments', icon: CheckSquare },
            { id: 'carry', label: 'Batches', icon: Users },
          ],
        },
        {
          label: 'Plan',
          items: [
            { id: 'routines', label: 'Routines', icon: Repeat, count: routinesLeft || undefined },
            { id: 'calendar', label: 'Academic calendar', icon: CalendarRange },
            { id: 'papers', label: 'Question papers', icon: FileText },
            { id: 'notices', label: 'Campus notices', icon: Megaphone },
          ],
        },
      ]
    : [
        {
          items: [
            { id: 'home', label: 'Home', icon: House },
            { id: 'timetable', label: 'Timetable', icon: CalendarDays },
            { id: 'homework', label: 'Assignments', icon: CheckSquare, count: pendingTasks || undefined },
            { id: 'exams', label: 'Exams', icon: ClipboardList },
            { id: 'papers', label: 'Question papers', icon: FileText },
            { id: 'routines', label: 'Routines', icon: Repeat, count: routinesLeft || undefined },
            { id: 'attendance', label: 'Attendance', icon: UserCheck },
          ],
        },
        {
          label: 'Campus',
          items: [
            { id: 'mess', label: 'Mess menu', icon: Utensils },
            { id: 'notices', label: 'Campus notices', icon: Megaphone },
            { id: 'subjects', label: 'Subjects', icon: BookOpen },
            { id: 'faculty', label: 'Faculty', icon: GraduationCap },
            { id: 'calendar', label: 'Academic calendar', icon: CalendarRange },
            { id: 'friends', label: 'Friends', icon: Users },
          ],
        },
      ];

  const subtitle = isFaculty
    ? [profile.facultyDepartment, profile.college ? getShortCollegeName(profile.college) : null].filter(Boolean).join(' · ') || 'Faculty'
    : [profile.programme && profile.branch ? `${profile.programme} ${profile.branch}` : null, profile.semester ? `Sem ${profile.semester}` : null].filter(Boolean).join(' · ') || 'Student';
  const displayName = isFaculty ? `${profile.facultyTitle || 'Prof.'} ${(profile.name || 'Faculty').split(' ').slice(-1)[0]}` : profile.name || 'Student';
  const signedIn = isClerkLoaded && !!user;
  const onSettings = activeView === 'settings';

  const renderNav = (item: NavItem) => {
    const active = activeView === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveView(item.id)}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'group relative flex items-center gap-f3 w-full h-11 px-f3 text-left text-[15px] border transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] dark:focus-visible:ring-[#F4F4F6]',
          active
            ? 'bg-[#F1F1EF] dark:bg-white/[0.07] border-[#E4E4E1] dark:border-white/[0.08] text-fg font-semibold'
            : 'border-transparent text-[#55555A] dark:text-[#A1A1AA] font-medium hover:bg-black/[0.035] dark:hover:bg-white/[0.04] hover:text-fg'
        )}
      >
        <Icon
          className={clsx('w-5 h-5 shrink-0', active ? 'text-fg' : 'text-faint group-hover:text-fg')}
          strokeWidth={active ? 2 : 1.75}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {item.alert && item.count ? (
          <span className="min-w-[21px] h-[21px] px-1.5 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[12px] font-bold tabular-nums">
            {item.count > 99 ? '99+' : item.count}
          </span>
        ) : item.count ? (
          <span className="text-[13px] font-mono tabular-nums text-faint">{item.count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-[288px] shrink-0 h-screen sticky top-0 z-30 select-none bg-white/95 dark:bg-[#0A0B0F]/95 backdrop-blur-xl border-r border-line shadow-[4px_0_20px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_25px_rgba(0,0,0,0.4)]">
      {/* Brand: same height as the page header so their bottom lines meet */}
      <div className="sheen h-[72px] shrink-0 flex items-center justify-between gap-f2 pl-f5 pr-f4 border-b border-line">
        <div className="leading-none min-w-0">
          <p className="text-[24px] tracking-tighter text-fg">
            <span className="font-extrabold">inter</span>
            <span className="font-normal opacity-70">semester</span>
          </p>
          <p className="mt-f1 text-[13px] text-muted">{isFaculty ? 'Faculty edition' : 'Student edition'}</p>
        </div>
        <button
          type="button"
          onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={settings.theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="w-11 h-11 shrink-0 flex items-center justify-center text-muted hover:text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          {settings.theme === 'dark' ? <Sun className="w-5 h-5" strokeWidth={1.75} /> : <Moon className="w-5 h-5" strokeWidth={1.75} />}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-f4 pt-f4 pb-f3 flex flex-col">
        {/* Search / jump */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-f3 w-full h-11 px-f3 mb-f4 bg-[#FAFAF9] dark:bg-white/[0.04] border border-line text-[15px] text-faint hover:border-[#BDBDB8] dark:hover:border-white/20 transition-colors cursor-pointer text-left"
        >
          <Search className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">Search or jump to</span>
          <kbd className="text-[12px] font-mono text-muted px-1.5 h-[21px] inline-flex items-center border border-[#E2E2DF] dark:border-white/[0.1] bg-surface-2">⌘K</kbd>
        </button>

        <nav aria-label="Main" className="flex flex-col gap-f4">
          {groups.map((g, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {g.label && <p className="px-f3 pb-f2 text-[13px] font-semibold text-faint">{g.label}</p>}
              {g.items.map(renderNav)}
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-f4 flex flex-col gap-0.5">
          {renderNav({ id: 'notifications', label: 'Notifications', icon: Bell, count: unread || undefined, alert: true })}
        </div>
      </div>

      {/* You: the character you picked, opens Profile & settings */}
      <div className="sheen shrink-0 px-f4 py-f3 border-t border-line shadow-[0_-4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.4)]">
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          aria-current={onSettings ? 'page' : undefined}
          title="Profile & settings"
          className={clsx(
            'w-full flex items-center gap-f3 p-f2 pl-f3 text-left border transition-colors cursor-pointer',
            onSettings
              ? 'bg-[#F1F1EF] dark:bg-white/[0.07] border-[#E4E4E1] dark:border-white/[0.08]'
              : 'border-transparent hover:bg-black/[0.035] dark:hover:bg-white/[0.04]'
          )}
        >
          <span className="w-11 h-11 shrink-0 rounded-full overflow-hidden bg-white dark:bg-[#F4F4F6] border border-[#E2E2DF] dark:border-transparent">
            <img src={getAvatarSrc(getAvatarSeed(profile))} alt="" className="w-full h-full object-cover scale-110 translate-y-[2px]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold text-fg truncate">{displayName}</span>
            <span className="block text-[13px] text-muted truncate">{signedIn ? subtitle : 'Guest mode'}</span>
          </span>
          <Settings className="w-5 h-5 shrink-0 text-faint" strokeWidth={1.75} />
        </button>
        {!signedIn && isClerkLoaded && (
          <button
            type="button"
            onClick={() => router.push('/sign-in')}
            className="mt-f2 w-full h-11 bg-ink text-on-ink text-[14px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Sign in to sync
          </button>
        )}
      </div>
    </aside>
  );
};
