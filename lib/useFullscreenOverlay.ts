'use client';

import { useEffect } from 'react';

// Full-screen screens (taking attendance, the QR screen, the class list) cover the whole app, so the
// floating tab bar and the header must go away while one is open, and the page behind must not scroll.
// This uses its own body class (not Modal's `modal-open`), so closing a small dialog on top of one of
// these screens doesn't bring the tab bar back. A counter keeps it right when screens stack.

let open = 0;

export const useFullscreenOverlay = (active = true) => {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    open += 1;
    const body = document.body;
    body.classList.add('fullscreen-open');
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      open = Math.max(0, open - 1);
      if (open === 0) {
        body.classList.remove('fullscreen-open');
        body.style.overflow = prevOverflow === 'hidden' ? '' : prevOverflow;
      }
    };
  }, [active]);
};
