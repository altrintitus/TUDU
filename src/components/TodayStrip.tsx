import { useLiveQuery } from 'dexie-react-hooks';
import { db, toggleTask } from '../db';
import { isDueOrOverdue, isOverdue, compareTodayTasks, todayStr, formatDue } from '../logic/dates';

export function TodayStrip() {
  const today = todayStr();
  const data = useLiveQuery(async () => {
    const [tasks, lists] = await Promise.all([db.tasks.toArray(), db.lists.toArray()]);
    const due = tasks
      .filter((t) => isDueOrOverdue(t, today))
      .sort((a, b) => compareTodayTasks(a, b, today));
    const names = new Map(lists.map((l) => [l.id, l.name]));
    return { due, names };
  }, [today]);

  if (!data || data.due.length === 0) return null;

  return (
    <section className="today">
      <h2 className="section-label">Today</h2>
      <ul className="today-list">
        {data.due.map((t) => (
          <li key={t.id} className={isOverdue(t, today) ? 'today-row overdue' : 'today-row'}>
            <input
              type="checkbox"
              aria-label={t.title}
              checked={false}
              onChange={() => toggleTask(t.id)}
            />
            <span className="today-title">{t.title}</span>
            {isOverdue(t, today) && <span className="today-due">{formatDue(t.dueDate!, today)}</span>}
            <span className="today-listname">{data.names.get(t.listId) ?? ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
