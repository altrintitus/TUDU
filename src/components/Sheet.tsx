import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

export function Sheet({ open, onClose, title, children }: {
  open: boolean;
  onClose(): void;
  title?: string;
  children: ReactNode;
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel"
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
