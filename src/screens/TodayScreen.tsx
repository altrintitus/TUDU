import { useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, toggleTask, deleteTask, setRoutineDone, deleteRoutine, type Task, type Routine } from '../db';
import { todayStr, taskGroup, type TaskGroupKey } from '../logic/dates';
import { isScheduledOn } from '../logic/routines';
import { TaskListRow } from '../components/TaskListRow';
import { TaskEditSheet } from '../components/TaskEditSheet';
import { RoutineRow } from '../components/RoutineRow';
import { RoutineEditorSheet } from '../components/RoutineEditorSheet';
import { WaterMeter } from '../components/WaterMeter';
import { WaterGoalSheet } from '../components/WaterGoalSheet';
import { loadGoal, subscribeWaterGoal, formatL } from '../logic/water';
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
  const [addingRoutine, setAddingRoutine] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [editingWaterGoal, setEditingWaterGoal] = useState(false);
  const waterGoal = useSyncExternalStore(subscribeWaterGoal, loadGoal);

  const data = useLiveQuery(async () => {
    const [tasks, lists] = await Promise.all([db.tasks.toArray(), db.lists.toArray()]);
    const names = new Map(lists.map((l) => [l.id, l.name]));
    return { open: tasks.filter((t) => !t.done), names };
  });

  const rdata = useLiveQuery(async () => {
    const [routines, done] = await Promise.all([
      db.routines.orderBy('sortOrder').toArray(),
      db.routineDone.toArray()
    ]);
    const byRoutine = new Map<string, Set<string>>();
    for (const d of done) {
      let s = byRoutine.get(d.routineId);
      if (!s) { s = new Set(); byRoutine.set(d.routineId, s); }
      s.add(d.date);
    }
    return { routines, byRoutine };
  });

  const today = todayStr();
  const todaysRoutines = (rdata?.routines ?? []).filter((r) => isScheduledOn(r.days, today));
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

      <div className="today-routines">
        <div className="routines-header">
          <h2 className="section-label">Routines</h2>
          <button className="add-routine" aria-label="add routine" onClick={() => setAddingRoutine(true)}>＋</button>
        </div>
        {todaysRoutines.map((r) => {
          const dd = rdata!.byRoutine.get(r.id) ?? new Set<string>();
          const checked = dd.has(today);
          return (
            <RoutineRow
              key={r.id}
              routine={r}
              doneDates={dd}
              today={today}
              checked={checked}
              onToggle={() => void setRoutineDone(r.id, today, !checked)}
              onEdit={() => setEditingRoutine(r)}
              onDelete={() => setPending({ label: r.title, run: () => void deleteRoutine(r.id) })}
            />
          );
        })}
        {rdata && todaysRoutines.length === 0 && (
          <p className="routines-empty">No routines today — tap ＋ to add one</p>
        )}
      </div>

      <div className="today-water">
        <div className="routines-header">
          <h2 className="section-label">Water</h2>
          <button className="water-goal-edit" aria-label="set water goal" onClick={() => setEditingWaterGoal(true)}>
            {formatL(waterGoal)}
          </button>
        </div>
        <WaterMeter />
      </div>

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
      {addingRoutine && <RoutineEditorSheet open onClose={() => setAddingRoutine(false)} />}
      {editingRoutine && (
        <RoutineEditorSheet key={editingRoutine.id} open routine={editingRoutine} onClose={() => setEditingRoutine(null)} />
      )}
      {editingWaterGoal && <WaterGoalSheet open onClose={() => setEditingWaterGoal(false)} />}

      {editing && (
        <TaskEditSheet key={editing.id} open task={editing} onClose={() => setEditing(null)} />
      )}

      {pending && (
        <Sheet open onClose={() => setPending(null)}>
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
