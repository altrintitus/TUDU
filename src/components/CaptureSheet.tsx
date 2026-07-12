import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createTask, createIdea, INBOX_ID } from '../db';
import { loadCaptureDefaults, saveCaptureDefaults, type CaptureType } from '../logic/captureDefaults';
import { todayStr, formatDue } from '../logic/dates';
import { EditableText } from './EditableText';
import { Calendar } from './icons';
import { toast } from './Toast';

// Mount fresh on open (parent renders conditionally) so state resets each time.
export function CaptureSheet({ open, onClose, fixedListId, defaultType, fixedType }: {
  open: boolean;
  onClose(): void;
  fixedListId?: string;
  defaultType?: CaptureType;
  fixedType?: CaptureType; // locks the type and hides the Task/Idea toggle
}) {
  const lists = useLiveQuery(() => db.lists.orderBy('sortOrder').toArray(), []);
  const savingRef = useRef(false);
  const [text, setText] = useState('');
  const [type, setType] = useState<CaptureType>(() => fixedType ?? defaultType ?? loadCaptureDefaults().type);
  const [listId, setListId] = useState<string>(() => fixedListId ?? loadCaptureDefaults().listId);
  const [due, setDue] = useState('');
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);

  if (!open) return null;

  // Prefer real spaces; Inbox only surfaces when the user has no other space.
  const real = (lists ?? []).filter((l) => l.id !== INBOX_ID);
  const pickable = real.length > 0 ? real : (lists ?? []);
  const effectiveListId = pickable.some((l) => l.id === listId) ? listId : (pickable[0]?.id ?? INBOX_ID);
  const spaceName = (lists ?? []).find((l) => l.id === effectiveListId)?.name ?? '…';
  const canSave = text.trim().length > 0;
  const today = todayStr();

  const save = async () => {
    const value = text.trim();
    if (!value || savingRef.current) return;
    savingRef.current = true;
    const targetList = fixedListId ?? effectiveListId;
    if (type === 'task') await createTask(targetList, value, due || undefined);
    else await createIdea(targetList, value);
    if (!fixedListId) {
      saveCaptureDefaults({ type: fixedType ? loadCaptureDefaults().type : type, listId: targetList });
    }
    const name = lists?.find((l) => l.id === targetList)?.name ?? 'list';
    onClose();
    toast(`Saved to ${name}`);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel capture"
        role="dialog"
        aria-modal="true"
        aria-label="Capture"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableText
          className="capture-input"
          ariaLabel="Capture text"
          placeholder={type === 'task' ? 'New task…' : 'New idea…'}
          value={text}
          onChange={setText}
          autoFocus
          multiline={type === 'idea'}
          onEnter={type === 'task' ? save : undefined}
        />

        <div className="capture-controls">
          {!fixedType && (
            <div className="segmented" role="group" aria-label="Type">
              {/* preventDefault on pointer-down keeps focus on the text field so
                  the keyboard doesn't drop when switching type. */}
              <button aria-pressed={type === 'task'} onPointerDown={(e) => e.preventDefault()} onClick={() => setType('task')}>Task</button>
              <button aria-pressed={type === 'idea'} onPointerDown={(e) => e.preventDefault()} onClick={() => setType('idea')}>Idea</button>
            </div>
          )}

          {!fixedListId && (
            <div className="capture-picker">
              <button type="button" className="capture-chip" aria-label="Space" onClick={() => { setSpaceOpen((o) => !o); setSchedOpen(false); }}>
                {spaceName} <span aria-hidden="true">▾</span>
              </button>
              {spaceOpen && (
                <div className="picker-menu" role="listbox">
                  {pickable.map((l) => (
                    <button key={l.id} type="button" role="option" aria-selected={l.id === effectiveListId} onClick={() => { setListId(l.id); setSpaceOpen(false); }}>
                      {l.emoji ? `${l.emoji} ` : ''}{l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {type === 'task' && (
            <div className="capture-picker">
              <button type="button" className="capture-chip" aria-label="Schedule" onClick={() => { setSchedOpen((o) => !o); setSpaceOpen(false); }}>
                <Calendar /> {due ? formatDue(due, today) : 'Schedule'}
              </button>
              {schedOpen && (
                <div className="picker-menu sched">
                  <button type="button" onClick={() => { setDue(today); setSchedOpen(false); }}>Today</button>
                  <button type="button" onClick={() => { setDue(todayStr(new Date(Date.now() + 86_400_000))); setSchedOpen(false); }}>Tomorrow</button>
                  <button type="button" onClick={() => { setDue(''); setSchedOpen(false); }}>None</button>
                  <input type="date" aria-label="Due date" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sheet-actions capture-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!canSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
