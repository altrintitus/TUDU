import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { db, updateTask, deleteTask, type Task } from '../db';

export function TaskEditSheet({ open, task, onClose }: {
  open: boolean;
  task: Task | null;
  onClose(): void;
}) {
  const lists = useLiveQuery(() => db.lists.orderBy('sortOrder').toArray(), []);
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.dueDate ?? '');
  const [listId, setListId] = useState(task?.listId ?? '');
  const [confirming, setConfirming] = useState(false);
  // readonly until focus → suppresses iOS contact AutoFill on this text field
  const [titleRO, setTitleRO] = useState(true);

  if (!open || !task) return null;

  const save = async () => {
    const t = title.trim();
    if (!t) return;
    await updateTask(task.id, { title: t, dueDate: due || null, listId });
    onClose();
  };

  const remove = async () => {
    await deleteTask(task.id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit task">
      <label className="field">
        <span className="field-label">Title</span>
        <input aria-label="Title" value={title} readOnly={titleRO} onFocus={() => setTitleRO(false)} autoComplete="off" autoCorrect="off" onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Space</span>
        <select aria-label="Space" value={listId} onChange={(e) => setListId(e.target.value)}>
          {lists?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Due</span>
        <input type="date" aria-label="Due" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <div className="sheet-actions">
        {!confirming && <button className="btn-danger" onClick={() => setConfirming(true)}>Delete</button>}
        {confirming && <button className="btn-danger" onClick={remove}>Confirm — delete task</button>}
        <button className="btn-primary" onClick={save} disabled={!title.trim()}>Save</button>
      </div>
    </Sheet>
  );
}
