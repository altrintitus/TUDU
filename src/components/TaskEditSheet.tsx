import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet, useSheetDismiss } from './Sheet';
import { db, updateTask, deleteTask, INBOX_ID, type Task } from '../db';
import { todayStr, formatDue, addDays } from '../logic/dates';
import { EditableText } from './EditableText';
import { Calendar } from './icons';

export function TaskEditSheet({ open, task, onClose }: {
  open: boolean;
  task: Task | null;
  onClose(): void;
}) {
  const lists = useLiveQuery(() => db.lists.orderBy('sortOrder').toArray(), []);
  const inboxHasContent = useLiveQuery(async () => {
    const [t, i] = await Promise.all([
      db.tasks.where('listId').equals(INBOX_ID).count(),
      db.ideas.where('listId').equals(INBOX_ID).count()
    ]);
    return t + i > 0;
  }, []) ?? false;
  const savingRef = useRef(false);
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.dueDate ?? '');
  const [listId, setListId] = useState(task?.listId ?? '');
  const [confirming, setConfirming] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const { closing, close } = useSheetDismiss(onClose);

  if (!open || !task) return null;

  const today = todayStr();
  // Mirror capture: Inbox appears only when it holds something — but always keep
  // it selectable if the task already lives there.
  const pickable = (lists ?? []).filter(
    (l) => l.id !== INBOX_ID || inboxHasContent || l.id === task.listId
  );
  const spaceName = (lists ?? []).find((l) => l.id === listId)?.name ?? '…';

  const save = async () => {
    const t = title.trim();
    if (!t || savingRef.current) return;
    savingRef.current = true;
    await updateTask(task.id, { title: t, dueDate: due || null, listId });
    close();
  };

  const remove = async () => {
    await deleteTask(task.id);
    close();
  };

  return (
    <Sheet open={open} closing={closing} onClose={close} title="Edit task">
      <div className="field">
        <span className="field-label">Title</span>
        {/* contenteditable, not <input>: no iOS keyboard form-assistant bar */}
        <EditableText className="capture-input" ariaLabel="Title" value={title} onChange={setTitle} autoFocus onEnter={save} />
      </div>

      {/* Space + Due share one row; actions share one row — with the keyboard
          up the whole sheet fits on screen (no scrolling to reach Save) */}
      <div className="field-row">
        <div className="field">
          <span className="field-label">Space</span>
          <div className="capture-picker">
            <button type="button" className="capture-chip" aria-label="Space" onClick={() => { setSpaceOpen((o) => !o); setSchedOpen(false); }}>
              {spaceName} <span aria-hidden="true">▾</span>
            </button>
            {spaceOpen && (
              <div className="picker-menu" role="listbox">
                {pickable.map((l) => (
                  <button key={l.id} type="button" role="option" aria-selected={l.id === listId} onClick={() => { setListId(l.id); setSpaceOpen(false); }}>
                    {l.emoji ? `${l.emoji} ` : ''}{l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Due</span>
          <div className="capture-picker">
            <button type="button" className="capture-chip" aria-label="Schedule" onClick={() => { setSchedOpen((o) => !o); setSpaceOpen(false); }}>
              <Calendar /> {due ? formatDue(due, today) : 'No date'}
            </button>
            {schedOpen && (
              <div className="picker-menu sched">
                <button type="button" onClick={() => { setDue(today); setSchedOpen(false); }}>Today</button>
                <button type="button" onClick={() => { setDue(addDays(today, 1)); setSchedOpen(false); }}>Tomorrow</button>
                <button type="button" onClick={() => { setDue(''); setSchedOpen(false); }}>None</button>
                <input type="date" aria-label="Due date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sheet-actions row">
        {!confirming && <button className="btn-danger" onClick={() => setConfirming(true)}>Delete</button>}
        {confirming && <button className="btn-danger" onClick={remove}>Confirm delete</button>}
        <button className="btn-primary" onClick={save} disabled={!title.trim()}>Save</button>
      </div>
    </Sheet>
  );
}
