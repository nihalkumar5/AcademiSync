'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from '@/components/ui/icons';

// Page header actions, the same on every screen (pattern from Craft, Notion and Asana):
// the title sits on the left; on the right there is one round primary button and a "⋯" menu
// that holds every other action. Nothing stacks under the title, so content starts right away.
//
// Usage: render <PageTitle> where the title goes and <PageActions> anywhere in the same view,
// with ordinary <button className="btn btn-primary|btn-secondary"> children. The primary button
// becomes the round button (icon only when it has one), the rest become menu rows.

const SLOT_ID = 'page-actions-slot';

export const PageTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`flex items-start justify-between gap-3 ${className || ''}`}>
    <h2 className="page-title min-w-0">{children}</h2>
    <div id={SLOT_ID} className="shrink-0 flex items-center gap-2 pt-0.5 empty:hidden" />
  </div>
);

type Action = { key: string; label: string; icon: React.ReactNode; onClick?: (e: React.MouseEvent) => void; primary: boolean; disabled?: boolean };

const textOf = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf((node.props as any).children);
  return '';
};

const iconOf = (node: React.ReactNode): React.ReactNode => {
  const parts = React.Children.toArray(node);
  return parts.find((p) => React.isValidElement(p) && typeof (p as any).type !== 'string') || null;
};

export const PageActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-check after every render: the title can mount after (or be swapped out from under) the actions
  useEffect(() => {
    const el = document.getElementById(SLOT_ID);
    if (el !== slot) setSlot(el);
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const actions: Action[] = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((el, i) => {
      const p = (el as React.ReactElement<any>).props;
      return {
        key: String((el as any).key ?? i),
        label: textOf(p.children).replace(/\s+/g, ' ').trim(),
        icon: iconOf(p.children),
        onClick: p.onClick,
        disabled: p.disabled,
        primary: String(p.className || '').includes('btn-primary'),
      };
    });

  const primary = actions.find((a) => a.primary);
  const rest = actions.filter((a) => a !== primary);

  const ui = (
    <>
      {primary && (
        <button
          type="button"
          onClick={primary.onClick}
          disabled={primary.disabled}
          aria-label={primary.label}
          title={primary.label}
          className={`h-10 rounded-full bg-ink text-on-ink inline-flex items-center justify-center gap-1.5 font-semibold text-[14px] transition-[opacity,transform] hover:opacity-90 active:scale-95 disabled:opacity-45 cursor-pointer [&>svg]:w-[18px] [&>svg]:h-[18px] ${
            primary.icon ? 'w-10' : 'px-4'
          }`}
        >
          {primary.icon || primary.label}
        </button>
      )}
      {rest.length > 0 && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={open}
            className={`w-10 h-10 rounded-full inline-flex items-center justify-center text-fg transition-colors cursor-pointer ${
              open ? 'bg-surface-3' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                role="menu"
                className="absolute right-0 top-12 z-50 min-w-[220px] rounded-card bg-surface border border-line-soft p-1.5 shadow-[0_16px_40px_-12px_rgba(17,17,17,0.25)] origin-top-right animate-[pageMenuIn_.16s_ease-out]"
              >
                {rest.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    role="menuitem"
                    disabled={a.disabled}
                    onClick={(e) => {
                      setOpen(false);
                      a.onClick?.(e);
                    }}
                    className="w-full h-11 px-3 rounded-tile flex items-center gap-3 text-left text-[15px] font-medium text-fg hover:bg-surface-2 disabled:opacity-45 cursor-pointer [&>span>svg]:w-[18px] [&>span>svg]:h-[18px]"
                  >
                    <span className="w-5 flex items-center justify-center text-muted">{a.icon}</span>
                    <span className="truncate">{a.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes pageMenuIn { from { opacity: 0; transform: scale(.96) translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>
    </>
  );

  return slot ? createPortal(ui, slot) : null;
};
