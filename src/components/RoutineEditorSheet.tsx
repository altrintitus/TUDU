import { useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { createRoutine, updateRoutine, deleteRoutine, type Routine } from '../db';

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = JS getDay (0=Sun)
const DAILY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

// New routine when `routine` is absent; edit (with Delete) when present.
export function RoutineEditorSheet({ open, routine, onClose }: {
  open: boolean;
  routine?: Routine | null;
  onClose(): void;
}) {
  const [title, setTitle] = useState(routine?.title ?? '');
  const [days, setDays] = useState<number[]>(routine?.days ?? DAILY);
  const [confirming, setConfirming] = useState(false);
  const savingRef = useRef(false);

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)));

  const save = async () => {
    const t = title.trim();
    if (!t || days.length === 0 || savingRef.current) return;
    savingRef.current = true;
    if (routine) await updateRoutine(routine.id, { title: t, days });
    else await createRoutine(t, days);
    onClose();
  };

  const remove = async () => {
    if (!routine) return;
    await deleteRoutine(routine.id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={routine ? 'Edit routine' : 'New routine'}>
      <label className="field">
        <span className="field-label">Name</span>
        <input
          aria-label="Name"
          value={title}
          autoComplete="off"
          autoCorrect="off"
          data-1p-ignore
          data-lpignore="true"
          placeholder="Meditate"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="field">
        <span className="field-label">Repeat on</span>
        <div className="daychips" role="group" aria-label="Repeat days">
          {LABELS.map((l, d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              aria-label={`day ${d}`}
              className={days.includes(d) ? 'daychip on' : 'daychip'}
              onClick={() => toggleDay(d)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="presets">
          <button type="button" onClick={() => setDays(DAILY)}>Daily</button>
          <button type="button" onClick={() => setDays(WEEKDAYS)}>Weekdays</button>
        </div>
      </div>
      <div className="sheet-actions">
        {routine && !confirming && (
          <button className="btn-danger" onClick={() => setConfirming(true)}>Delete</button>
        )}
        {routine && confirming && (
          <button className="btn-danger" onClick={remove}>Confirm — delete routine</button>
        )}
        <button className="btn-primary" onClick={save} disabled={!title.trim() || days.length === 0}>
          Save
        </button>
      </div>
    </Sheet>
  );
}
