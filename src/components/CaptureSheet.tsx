import { useLayoutEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createTask, createIdea, INBOX_ID } from '../db';
import { loadCaptureDefaults, saveCaptureDefaults, type CaptureType } from '../logic/captureDefaults';
import { toast } from './Toast';

// Mount this fresh on open (parent renders it conditionally) so state resets
// each time — no setState-in-effect needed.
export function CaptureSheet({ open, onClose, fixedListId, defaultType, fixedType }: {
  open: boolean;
  onClose(): void;
  fixedListId?: string;
  defaultType?: CaptureType;
  fixedType?: CaptureType; // locks the type and hides the Task/Idea toggle
}) {
  const lists = useLiveQuery(() => db.lists.orderBy('sortOrder').toArray(), []);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false);
  const [text, setText] = useState('');
  const [type, setType] = useState<CaptureType>(() => fixedType ?? defaultType ?? loadCaptureDefaults().type);
  const [listId, setListId] = useState<string>(() => fixedListId ?? loadCaptureDefaults().listId);
  const [due, setDue] = useState('');

  // Focus synchronously on mount (pre-paint, inside the tap's discrete-event
  // flush) so iOS raises the keyboard immediately.
  useLayoutEffect(() => {
    fieldRef.current?.focus();
  }, []);

  if (!open) return null;

  // Fall back to Inbox if the remembered list was deleted.
  const validListId = lists && !lists.some((l) => l.id === listId) ? INBOX_ID : listId;
  const canSave = text.trim().length > 0;

  const save = async () => {
    const value = text.trim();
    // Guard re-entry: a fast double-tap or auto-repeating Enter can fire again
    // while the first async write is still pending, creating duplicate entities.
    if (!value || savingRef.current) return;
    savingRef.current = true;
    const targetList = fixedListId ?? validListId;
    if (type === 'task') await createTask(targetList, value, due || undefined);
    else await createIdea(targetList, value);
    // Persist last-used space always; but only persist the type when the user
    // could actually choose it (a fixedType page must not clobber that memory).
    if (!fixedListId) {
      saveCaptureDefaults({ type: fixedType ? loadCaptureDefaults().type : type, listId: targetList });
    }
    const name = lists?.find((l) => l.id === targetList)?.name ?? 'list';
    onClose();
    toast(`Saved to ${name}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Task capture is single-line: Enter saves. Idea capture keeps Enter as newline.
    // Skip while an IME candidate is composing — Enter there commits the candidate.
    if (type === 'task' && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void save();
    }
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
        <textarea
          ref={fieldRef}
          className="capture-input"
          rows={2}
          value={text}
          placeholder={type === 'task' ? 'New task…' : 'New idea…'}
          aria-label="Capture text"
          autoComplete="off"
          autoCorrect="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="capture-controls">
          {!fixedType && (
            <div className="segmented" role="group" aria-label="Type">
              <button aria-pressed={type === 'task'} onClick={() => setType('task')}>Task</button>
              <button aria-pressed={type === 'idea'} onClick={() => setType('idea')}>Idea</button>
            </div>
          )}

          {!fixedListId && (
            <select
              className="capture-list"
              aria-label="Space"
              value={validListId}
              onChange={(e) => setListId(e.target.value)}
            >
              {lists?.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}

          {type === 'task' && (
            <input
              className="capture-due"
              type="date"
              aria-label="Due"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
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
