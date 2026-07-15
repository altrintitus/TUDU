import { useRef, useState } from 'react';
import type { Task } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { isOverdue, formatDue, todayStr } from '../logic/dates';

// Exit choreography after a check (Today filters the row out on toggle):
// strike plays, the row collapses shut, then the DB toggle commits.
const STRIKE_MS = 280;
const COLLAPSE_MS = 220; // matches the .task-row.collapsing transition

// Task row for the Today page: like TaskRow but shows the source space label.
export function TaskListRow({ task, spaceName, onToggle, onEdit, onDelete }: {
  task: Task;
  spaceName: string;
  onToggle(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  const fired = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const onClick = () => { if (fired.current) { fired.current = false; return; } onEdit(); };
  const today = todayStr();
  const overdue = isOverdue(task, today);

  // A checked Today task is filtered out and unmounts on the next liveQuery tick
  // — too fast for any animation. Optimistically mark it done (class + checkbox),
  // play strike → collapse, then commit the toggle on an already-hidden row.
  const check = () => {
    if (leaving) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onToggle(); return; }
    setLeaving(true);
    setTimeout(() => setCollapsing(true), STRIKE_MS);
    setTimeout(onToggle, STRIKE_MS + COLLAPSE_MS);
  };

  const cls = ['task-row', overdue && 'overdue', leaving && 'done', collapsing && 'collapsing']
    .filter(Boolean).join(' ');
  return (
    <div className={cls} {...longPress} onPointerDownCapture={() => { fired.current = false; }}>
      <input
        type="checkbox"
        aria-label={task.title}
        checked={task.done || leaving}
        onChange={check}
        onClick={(e) => e.stopPropagation()}
      />
      <button className="task-main" onClick={onClick}>
        <span className="task-title">{task.title}</span>
        {task.dueDate && (
          <span className={overdue ? 'task-due overdue' : 'task-due'}>{formatDue(task.dueDate, today)}</span>
        )}
        <span className="task-space">{spaceName}</span>
      </button>
    </div>
  );
}
