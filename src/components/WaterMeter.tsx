import { useRef, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setWater } from '../db';
import { todayStr } from '../logic/dates';
import { loadGoal, formatL, fillFraction, snap, STEP, subscribeWaterGoal } from '../logic/water';
import { Droplet } from './icons';

// Draggable daily water meter. Interactive on Today; pass readOnly for Progress.
export function WaterMeter({ readOnly = false }: { readOnly?: boolean }) {
  const today = todayStr();
  const row = useLiveQuery(() => db.water.get(today), [today]);
  const ml = row?.ml ?? 0;
  const goal = useSyncExternalStore(subscribeWaterGoal, loadGoal); // shared across panes
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    void setWater(today, snap(frac * goal));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (readOnly || !dragging.current) return;
    setFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); void setWater(today, Math.min(goal, snap(ml + STEP))); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); void setWater(today, snap(ml - STEP)); }
  };

  const pct = fillFraction(ml, goal) * 100;

  return (
    <div className="water">
      <div
        className={readOnly ? 'water-track readonly' : 'water-track'}
        ref={trackRef}
        role="slider"
        aria-label="Water intake"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={ml}
        aria-valuetext={`${formatL(ml)} of ${formatL(goal)}`}
        tabIndex={readOnly ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="water-fill" style={{ width: `${pct}%` }} />
        <span className="water-label"><Droplet /> {formatL(ml)} / {formatL(goal)}</span>
      </div>
    </div>
  );
}
