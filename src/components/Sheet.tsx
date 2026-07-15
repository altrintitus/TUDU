import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Animated dismiss for sheets: plays a short 'closing' phase (backdrop fades,
// panel sinks) before the parent unmounts the sheet via onClose. Use the
// returned `close` everywhere the sheet should go away; pass `closing` to Sheet.
export function useSheetDismiss(onClose: () => void, ms = 180) {
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const close = () => {
    if (closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onCloseRef.current(); return; }
    setClosing(true);
    // reset after firing so a screen-level hook can serve the next open too
    timer.current = setTimeout(() => { onCloseRef.current(); setClosing(false); }, ms);
  };
  return { closing, close };
}

export function Sheet({ open, onClose, title, children, closing = false, className }: {
  open: boolean;
  onClose(): void;
  title?: string;
  children: ReactNode;
  closing?: boolean; // from useSheetDismiss — plays the sink-out animation
  className?: string; // extra panel class (e.g. capture)
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the first text field synchronously (pre-paint) so iOS raises the
  // keyboard immediately. Skip date inputs (would open the date picker) and
  // buttons. Runs in the tap's discrete-event flush, like CaptureSheet.
  useLayoutEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>('input:not([type=date]), textarea, [contenteditable="true"]')
      ?.focus();
  }, [open]);

  // Lock background scroll (the pager still scrolls under the backdrop otherwise).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape closes; Tab is trapped inside the panel so focus can't reach the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const f = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !panel.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={closing ? 'sheet-backdrop closing' : 'sheet-backdrop'} onClick={onClose}>
      <div
        className={`sheet-panel${className ? ` ${className}` : ''}`}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
