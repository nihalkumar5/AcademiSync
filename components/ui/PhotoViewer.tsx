'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut } from '@/components/ui/icons';

// Full-screen photo with its own zoom (the app viewport has pinch-zoom off).
// - Portaled to <body> above everything, so it also opens on top of sheets/modals.
// - Two-finger pinch, drag to pan when zoomed, double-tap / double-click to toggle zoom,
//   mouse wheel on desktop. Close with ✕, Escape, or a tap on the background when not zoomed.

const MIN = 1;
const MAX = 5;
const DOUBLE_TAP_SCALE = 2.5;

type Pt = { x: number; y: number };

export const PhotoViewer: React.FC<{ url: string | null; onClose: () => void; alt?: string }> = ({ url, onClose, alt = 'Photo' }) => {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 });
  const [animate, setAnimate] = useState(false);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ dist: number; scale: number; mid: Pt; pos: Pt } | null>(null);
  const drag = useRef<{ start: Pt; pos: Pt; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Fresh view for each photo; lock page scroll while open
  useEffect(() => {
    if (!url) return;
    setScale(1);
    setPos({ x: 0, y: 0 });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [url, onClose]);

  // Keep the photo from being dragged completely off screen
  const clampPos = useCallback((p: Pt, s: number): Pt => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || s <= 1) return { x: 0, y: 0 };
    const maxX = (box.width * (s - 1)) / 2;
    const maxY = (box.height * (s - 1)) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) };
  }, []);

  /** Zoom to `next` keeping the screen point `at` (relative to the centre) where it is. */
  const zoomAround = useCallback(
    (next: number, at: Pt, from = { scale, pos }) => {
      const s = Math.max(MIN, Math.min(MAX, next));
      const k = s / from.scale;
      const p = { x: at.x - (at.x - from.pos.x) * k, y: at.y - (at.y - from.pos.y) * k };
      setScale(s);
      setPos(clampPos(p, s));
    },
    [scale, pos, clampPos]
  );

  const centreOf = (clientX: number, clientY: number): Pt => {
    const box = boxRef.current?.getBoundingClientRect();
    return box ? { x: clientX - (box.left + box.width / 2), y: clientY - (box.top + box.height / 2) } : { x: 0, y: 0 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // capture is a nicety; the gesture still works without it
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnimate(false);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
        mid: centreOf((a.x + b.x) / 2, (a.y + b.y) / 2),
        pos,
      };
      drag.current = null;
    } else if (pointers.current.size === 1) {
      drag.current = { start: { x: e.clientX, y: e.clientY }, pos, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = Array.from(pointers.current.values());
      const g = gesture.current;
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / (g.dist || 1);
      zoomAround(g.scale * ratio, g.mid, { scale: g.scale, pos: g.pos });
      return;
    }
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.start.x;
      const dy = e.clientY - d.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
      if (scale > 1) setPos(clampPos({ x: d.pos.x + dx, y: d.pos.y + dy }, scale));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasPinch = pointers.current.size === 2;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (wasPinch) {
      // Settle: below 1x snaps back
      if (scale < 1.02) {
        setAnimate(true);
        setScale(1);
        setPos({ x: 0, y: 0 });
      }
      drag.current = null;
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    // A tap: double tap toggles zoom; a single tap on the background closes when not zoomed
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      setAnimate(true);
      if (scale > 1) {
        setScale(1);
        setPos({ x: 0, y: 0 });
      } else zoomAround(DOUBLE_TAP_SCALE, centreOf(e.clientX, e.clientY));
      return;
    }
    lastTap.current = now;
    const onImage = (e.target as Element).tagName === 'IMG';
    if (!onImage && scale <= 1) {
      setTimeout(() => lastTap.current && Date.now() - lastTap.current >= 270 && onClose(), 290);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    setAnimate(false);
    zoomAround(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), centreOf(e.clientX, e.clientY));
  };

  const step = (factor: number) => {
    setAnimate(true);
    if (scale * factor <= 1.01) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    } else zoomAround(scale * factor, { x: 0, y: 0 });
  };

  if (!mounted || !url) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100050] bg-black select-none" role="dialog" aria-modal="true" aria-label={alt}>
      <div
        ref={boxRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          draggable={false}
          className="max-w-full max-h-full object-contain will-change-transform"
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`,
            transition: animate ? 'transform 220ms cubic-bezier(.2,.8,.2,1)' : 'none',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
        />
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <button type="button" onClick={() => step(1 / 1.6)} aria-label="Zoom out" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/12 text-white hover:bg-white/20 cursor-pointer">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => step(1.6)} aria-label="Zoom in" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/12 text-white hover:bg-white/20 cursor-pointer">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close photo" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/12 text-white hover:bg-white/20 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      {scale === 1 && (
        <p className="absolute inset-x-0 bottom-0 pb-[max(env(safe-area-inset-bottom),16px)] text-center text-[12px] text-white/55 pointer-events-none">
          Pinch or double-tap to zoom
        </p>
      )}
    </div>,
    document.body
  );
};
