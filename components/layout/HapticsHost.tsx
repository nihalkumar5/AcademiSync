'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { haptic, setHapticsEnabled, type HapticKind } from '@/lib/haptics';

// App-wide haptics in one place: every tap on something you can press gets a light tick, so
// screens don't each have to remember. An element can ask for a different feel with
// data-haptic="success" | "medium" | ... , or opt out with data-haptic="off".
// Listens to `click` (not pointerdown) so starting a scroll never buzzes.

const PRESSABLE =
  'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="radio"], [role="menuitem"], [role="checkbox"], input[type="checkbox"], input[type="radio"], select, summary, label[for]';

const KINDS: HapticKind[] = ['selection', 'light', 'medium', 'success', 'warning', 'error'];

export const HapticsHost: React.FC = () => {
  const { settings } = useApp();

  useEffect(() => {
    setHapticsEnabled(settings?.hapticsEnabled !== false);
  }, [settings?.hapticsEnabled]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      const own = el.closest('[data-haptic]')?.getAttribute('data-haptic');
      if (own === 'off') return;
      haptic(own && (KINDS as string[]).includes(own) ? (own as HapticKind) : 'selection');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
};
