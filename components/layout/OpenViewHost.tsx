'use client';

import { useEffect } from 'react';
import { useApp, type ActiveView } from '@/context/AppContext';
import { OPEN_VIEW_EVENT, PENDING_VIEW_KEY } from '@/lib/pushNotifications';

// Opens the screen a notification points at, however the app was reached:
//  - web / PWA push: the notification link is /?view=routines
//  - app push tapped while running: an `app:open-view` event
//  - app push that launched the app: the view waits in sessionStorage until Home mounts

const VIEWS: ActiveView[] = [
  'home', 'timetable', 'homework', 'carry', 'routines', 'attendance', 'faculty', 'subjects',
  'calendar', 'exams', 'papers', 'notices', 'notes', 'friends', 'notifications', 'settings', 'mess',
];
const isView = (v: unknown): v is ActiveView => typeof v === 'string' && (VIEWS as string[]).includes(v);

export const OpenViewHost: React.FC = () => {
  const { setActiveView } = useApp();

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get('view');
      if (v) {
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
        if (isView(v)) setActiveView(v);
      }
      const pending = sessionStorage.getItem(PENDING_VIEW_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_VIEW_KEY);
        if (isView(pending)) setActiveView(pending);
      }
    } catch {}

    const onOpen = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (!isView(v)) return;
      try {
        sessionStorage.removeItem(PENDING_VIEW_KEY);
      } catch {}
      setActiveView(v);
    };
    window.addEventListener(OPEN_VIEW_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_VIEW_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
