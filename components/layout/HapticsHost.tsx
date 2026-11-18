'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { haptic, type HapticKind, setHapticsEnabled } from '@/lib/haptics';

// Haptics are kept for moments that matter (completing something, a toast, marking attendance,
// joining a plan). A buzz on every tap gets tiring and stops meaning anything, so ordinary
// taps are silent. A control opts in with data-haptic="selection" | "success" | ...
// Listens to `click` (not pointerdown) so starting a scroll never buzzes.

const KINDS: HapticKind[] = ['selection', 'light', 'medium', 'success', 'warning', 'error'];

export const HapticsHost: React.FC = () => {
  const { settings } = useApp();

  useEffect(() => {
    setHapticsEnabled(settings?.hapticsEnabled !== false);
  }, [settings?.hapticsEnabled]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-haptic]') as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      const kind = el.getAttribute('data-haptic');
      if (kind && (KINDS as string[]).includes(kind)) haptic(kind as HapticKind);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
};
