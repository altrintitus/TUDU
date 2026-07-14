import { useRef, useState } from 'react';
import type { Task } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { isOverdue, formatDue, todayStr } from '../logic/dates';

// Matches @keyframes strike (styles.css) — hold the row this long after a check
// so the strike-through can play before Today filters the task out.
const STRIKE_MS = 280;

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
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const onClick = () => { if (fired.current) { fired.current = false; return; } onEdit(); };
  const today = todayStr();
  const overdue = isOverdue(task, today);

  // A checked Today task is filtered out and unmounts on the next liveQuery tick
  // — too fast for the strike. Optimistically mark it done (class + checkbox),
  // let the animation run, then commit the toggle so the row drops.
  const check = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onToggle, STRIKE_MS);
  };

  const cls = ['task-row', overdue && 'overdue', leaving && 'done'].filter(Boolean).join(' ');
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
