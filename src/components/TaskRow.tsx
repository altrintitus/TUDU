import { useRef } from 'react';
import type { Task } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { isOverdue, formatDue, todayStr } from '../logic/dates';

export function TaskRow({ task, listName, onToggle, onEdit, onDelete }: {
  task: Task;
  listName?: string;
  onToggle(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  // A long-press ends in a pointerup that also emits a click on the inner button;
  // swallow that trailing click so the delete-confirm isn't followed by onEdit.
  const fired = useRef(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const onClick = () => { if (fired.current) { fired.current = false; return; } onEdit(); };
  const today = todayStr();
  const overdue = isOverdue(task, today);
  const cls = task.done ? 'task-row done' : overdue ? 'task-row overdue' : 'task-row';

  return (
    <div className={cls} {...longPress} onPointerDownCapture={() => { fired.current = false; }}>
      <input
        type="checkbox"
        aria-label={task.title}
        checked={task.done}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <button className="task-main" onClick={onClick}>
        <span className="task-title">{task.title}</span>
        {task.dueDate && !task.done && (
          <span className={overdue ? 'task-due overdue' : 'task-due'}>{formatDue(task.dueDate, today)}</span>
        )}
        {listName && <span className="task-listname">{listName}</span>}
      </button>
    </div>
  );
}
