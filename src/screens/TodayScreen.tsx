import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, toggleTask, deleteTask, type Task } from '../db';
import { todayStr, taskGroup, type TaskGroupKey } from '../logic/dates';
import { TaskListRow } from '../components/TaskListRow';
import { TaskEditSheet } from '../components/TaskEditSheet';
import { CaptureSheet } from '../components/CaptureSheet';
import { Fab } from '../components/Fab';
import { Sheet } from '../components/Sheet';

const GROUPS: { key: TaskGroupKey; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'nodate', label: 'No date' }
];

export function TodayScreen() {
  const [editing, setEditing] = useState<Task | null>(null);
  const [pending, setPending] = useState<{ label: string; run(): void } | null>(null);
  const [capturing, setCapturing] = useState(false);

  const data = useLiveQuery(async () => {
    const [tasks, lists] = await Promise.all([db.tasks.toArray(), db.lists.toArray()]);
    const names = new Map(lists.map((l) => [l.id, l.name]));
    return { open: tasks.filter((t) => !t.done), names };
  });

  const today = todayStr();
  const inGroup = (k: TaskGroupKey) =>
    (data?.open ?? [])
      .filter((t) => taskGroup(t, today) === k)
      .sort((a, b) => {
        const ad = a.dueDate ?? '';
        const bd = b.dueDate ?? '';
        return ad < bd ? -1 : ad > bd ? 1 : a.createdAt - b.createdAt;
      });

  const hasAny = (data?.open.length ?? 0) > 0;

  return (
    <div className="today-screen">
      <header className="screen-header"><h1 className="screen-title">Today</h1></header>

      <div className="rows">
        {GROUPS.map(({ key, label }) => {
          const items = inGroup(key);
          if (items.length === 0) return null;
          return (
            <div key={key} className="today-group">
              <h2 className={key === 'overdue' ? 'section-label danger' : 'section-label'}>{label}</h2>
              {items.map((t) => (
                <TaskListRow
                  key={t.id}
                  task={t}
                  spaceName={data!.names.get(t.listId) ?? ''}
                  onToggle={() => void toggleTask(t.id)}
                  onEdit={() => setEditing(t)}
                  onDelete={() => setPending({ label: t.title, run: () => void deleteTask(t.id) })}
                />
              ))}
            </div>
          );
        })}
        {data && !hasAny && <p className="empty-hint">No tasks — tap + to add one</p>}
      </div>

      <Fab onPress={() => setCapturing(true)} />
      {capturing && <CaptureSheet open fixedType="task" onClose={() => setCapturing(false)} />}

      {editing && (
        <TaskEditSheet key={editing.id} open task={editing} onClose={() => setEditing(null)} />
      )}

      {pending && (
        <Sheet open onClose={() => setPending(null)} title="Delete">
          <p className="confirm-text">Delete “{pending.label}”?</p>
          <div className="sheet-actions">
            <button className="btn-danger" onClick={() => { pending.run(); setPending(null); }}>
              Confirm — delete
            </button>
            <button className="btn-ghost" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
