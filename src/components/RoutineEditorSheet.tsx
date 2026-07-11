import { useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { createRoutine } from '../db';

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = JS getDay (0=Sun)
const DAILY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export function RoutineEditorSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const [title, setTitle] = useState('');
  const [ro, setRo] = useState(true); // readonly-until-focus → suppress iOS autofill
  const [days, setDays] = useState<number[]>(DAILY);
  const savingRef = useRef(false);

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  const save = async () => {
    const t = title.trim();
    // Guard re-entry: a fast double-tap can fire again before the first write
    // resolves, creating a duplicate routine.
    if (!t || days.length === 0 || savingRef.current) return;
    savingRef.current = true;
    await createRoutine(t, days);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="New routine">
      <label className="field">
        <span className="field-label">Name</span>
        <input
          aria-label="Name"
          value={title}
          readOnly={ro}
          onFocus={() => setRo(false)}
          autoComplete="off"
          autoCorrect="off"
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
        <button className="btn-primary" onClick={save} disabled={!title.trim() || days.length === 0}>
          Save
        </button>
      </div>
    </Sheet>
  );
}
