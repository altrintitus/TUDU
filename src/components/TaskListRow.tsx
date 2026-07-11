import { useRef } from 'react';
import type { Task } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { isOverdue, formatDue, todayStr } from '../logic/dates';

// Task row for the Today page: like TaskRow but shows the source space label.
export function TaskListRow({ task, spaceName, onToggle, onEdit, onDelete }: {
  task: Task;
  spaceName: string;
  onToggle(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  const fired = useRef(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const onClick = () => { if (fired.current) { fired.current = false; return; } onEdit(); };
  const today = todayStr();
  const overdue = isOverdue(task, today);
  return (
    <div
      className={overdue ? 'task-row overdue' : 'task-row'}
      {...longPress}
      onPointerDownCapture={() => { fired.current = false; }}
    >
      <input
        type="checkbox"
        aria-label={task.title}
        checked={task.done}
        onChange={onToggle}
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
