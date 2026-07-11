import { useRef, useState, type ReactNode } from 'react';

// Horizontal scroll-snap pager. `panes` are ordered full-width panels; the dot
// indicator's active state derives from scroll position. Landing pane via `initial`.
export function Pager({ panes, initial = 0 }: {
  panes: { key: string; node: ReactNode }[];
  initial?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initial);
  const seeded = useRef(false);

  const onTrackRef = (el: HTMLDivElement | null) => {
    trackRef.current = el;
    if (el && !seeded.current) {
      seeded.current = true;
      el.scrollLeft = initial * el.clientWidth; // land on the initial pane pre-paint
    }
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="pager">
      <div className="pager-track" ref={onTrackRef} onScroll={onScroll}>
        {panes.map((p, i) => (
          <section
            className={i === active ? 'pager-pane pager-pane-active' : 'pager-pane'}
            key={p.key}
          >
            {p.node}
          </section>
        ))}
      </div>
      <div className="pager-dots" role="tablist" aria-label="Pages">
        {panes.map((p, i) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={i === active}
            aria-label={p.key}
            className={i === active ? 'pager-dot active' : 'pager-dot'}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
