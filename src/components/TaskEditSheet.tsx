import { useState } from 'react';
import { Sheet } from './Sheet';
import { updateTask, deleteTask, type Task } from '../db';

export function TaskEditSheet({ open, task, onClose }: {
  open: boolean;
  task: Task | null;
  onClose(): void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.dueDate ?? '');
  const [confirming, setConfirming] = useState(false);
  // readonly until focus → suppresses iOS contact AutoFill on this text field
  const [titleRO, setTitleRO] = useState(true);

  if (!open || !task) return null;

  const save = async () => {
    const t = title.trim();
    if (!t) return;
    await updateTask(task.id, { title: t, dueDate: due || null });
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
