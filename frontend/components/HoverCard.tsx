'use client';
/* The floating readout that follows the pointer. Its content is React; its
   position is written straight to the element on every move, so following the
   pointer never re-renders the page. It is kept inside the viewport. */
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export type HoverCardHandle = {
  show: (content: ReactNode, x: number, y: number, title?: string) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
  isOn: () => boolean;
};

export const HoverCard = forwardRef<HoverCardHandle, { id?: string }>(function HoverCard({ id = 'card' }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const at = useRef({ x: 0, y: 0 });
  const [state, setState] = useState<{ content: ReactNode; title?: string; on: boolean; seq: number }>(
    { content: null, on: false, seq: 0 });

  const place = () => {
    const card = el.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const { x, y } = at.current;
    card.style.left = Math.max(8, Math.min(x + 18, innerWidth - r.width - 12)) + 'px';
    card.style.top = Math.max(8, Math.min(y + 14, innerHeight - r.height - 12)) + 'px';
  };

  useImperativeHandle(ref, () => ({
    show(content, x, y, title) {
      at.current = { x, y };
      setState(s => ({ content, title, on: true, seq: s.seq + 1 }));
    },
    move(x, y) { at.current = { x, y }; place(); },
    hide() { setState(s => (s.on ? { ...s, on: false } : s)); },
    isOn: () => !!el.current?.classList.contains('on'),
  }), []);

  // Measured after the new content is in, so the card is clamped by its real size.
  useLayoutEffect(() => { if (state.on) place(); }, [state.seq, state.on]);

  return (
    <div id={id} ref={el} className={state.on ? 'on' : undefined} role="status" aria-live="polite" title={state.title}>
      {state.content}
    </div>
  );
});
