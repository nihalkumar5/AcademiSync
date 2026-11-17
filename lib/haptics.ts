// Haptics for the whole app. One place decides how each kind of feedback feels.
// Android (app + Chrome) vibrates through navigator.vibrate; the app already has the VIBRATE
// permission. Where vibration isn't supported (iPhone Safari, desktop) this does nothing.
//
// Kinds, from lightest to strongest:
//   selection – a tap on any button, tab, toggle or link (fired app-wide by HapticsHost)
//   light     – a small confirmation (opening a sheet, sending)
//   medium    – a firmer press (primary actions, long-press)
//   success   – something got done (marked done, shared, saved)
//   warning   – needs attention
//   error     – something failed

export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

const PATTERNS: Record<HapticKind, number | number[]> = {
  selection: 6,
  light: 10,
  medium: 18,
  success: [10, 70, 16],
  warning: [16, 90, 16],
  error: [22, 60, 22, 60, 22],
};

let enabled = true;
let last = 0;

/** Follows the "Haptics" setting (settings.hapticsEnabled). */
export const setHapticsEnabled = (on: boolean) => {
  enabled = on !== false;
};

export const haptic = (kind: HapticKind = 'selection') => {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = Date.now();
  // A tap that also triggers a success buzz shouldn't stutter: a stronger kind replaces a recent tick
  if (kind === 'selection' && now - last < 60) return;
  last = now;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // vibration is best effort
  }
};
