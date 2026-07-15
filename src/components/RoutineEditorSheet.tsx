import { useRef, useState } from 'react';
import { Sheet, useSheetDismiss } from './Sheet';
import { EditableText } from './EditableText';
import { createRoutine, updateRoutine, deleteRoutine, type Routine } from '../db';

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = JS getDay (0=Sun)
// Full names for screen readers — the visible S/M/T/W/T/F/S repeat, so the
// single-letter labels are ambiguous when announced.
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  const { closing, close } = useSheetDismiss(onClose);

  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)));

  const save = async () => {
    const t = title.trim();
    if (!t || days.length === 0 || savingRef.current) return;
    savingRef.current = true;
    if (routine) await updateRoutine(routine.id, { title: t, days });
    else await createRoutine(t, days);
    close();
  };

  const remove = async () => {
    if (!routine) return;
    await deleteRoutine(routine.id);
    close();
  };

  return (
    <Sheet open={open} closing={closing} onClose={close} title={routine ? 'Edit routine' : 'New routine'}>
      <div className="field">
        <span className="field-label">Name</span>
        {/* contenteditable, not <input>: no iOS keyboard form-assistant bar */}
        <EditableText className="capture-input" ariaLabel="Name" placeholder="Meditate" value={title} onChange={setTitle} autoFocus onEnter={save} />
      </div>
      <div className="field">
        <span className="field-label">Repeat on</span>
        <div className="daychips" role="group" aria-label="Repeat days">
          {LABELS.map((l, d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              aria-label={DAY_NAMES[d]}
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
      <div className="sheet-actions row">
        {routine && !confirming && (
          <button className="btn-danger" onClick={() => setConfirming(true)}>Delete</button>
        )}
        {routine && confirming && (
          <button className="btn-danger" onClick={remove}>Confirm delete</button>
        )}
        <button className="btn-primary" onClick={save} disabled={!title.trim() || days.length === 0}>
          Save
        </button>
      </div>
    </Sheet>
  );
}
