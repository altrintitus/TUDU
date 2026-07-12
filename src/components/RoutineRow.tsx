import { useRef } from 'react';
import type { Routine } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { streak, last7 } from '../logic/routines';
import { Flame } from './icons';

export function RoutineRow({ routine, doneDates, today, checked, onToggle, onEdit, onDelete }: {
  routine: Routine;
  doneDates: Set<string>;
  today: string;
  checked: boolean;
  onToggle(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  const fired = useRef(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const s = streak(routine.days, doneDates, today);
  const dots = last7(routine.days, doneDates, today);
  return (
    <div className={checked ? 'routine-row done' : 'routine-row'} {...longPress} onPointerDownCapture={() => { fired.current = false; }}>
      <input type="checkbox" aria-label={routine.title} checked={checked} onChange={onToggle} />
      <button type="button" className="routine-main" onClick={() => { if (!fired.current) onEdit(); }}>
        <div className="routine-top">
          <span className="routine-title">{routine.title}</span>
          <span className={s > 0 ? 'routine-streak' : 'routine-streak zero'}>
            <Flame filled={s > 0} size={14} /> {s}
          </span>
        </div>
        <div className="routine-dots" aria-hidden="true">
          {dots.map((d, i) => <span key={i} className={`rdot ${d}`} />)}
        </div>
      </button>
    </div>
  );
}
