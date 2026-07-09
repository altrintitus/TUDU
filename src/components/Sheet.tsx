import { useEffect, useRef, type ReactNode } from 'react';

export function Sheet({ open, onClose, title, children }: {
  open: boolean;
  onClose(): void;
  title?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
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
