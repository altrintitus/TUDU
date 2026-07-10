import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteTask, deleteIdea, toggleTask, type Task, type Idea } from '../db';
import { navigate } from '../hooks/useHashRoute';
import { compareListTasks } from '../logic/dates';
import { firstLine } from '../logic/text';
import { TaskRow } from '../components/TaskRow';
import { IdeaRow } from '../components/IdeaRow';
import { TaskEditSheet } from '../components/TaskEditSheet';
import { CaptureSheet } from '../components/CaptureSheet';
import { Sheet } from '../components/Sheet';
import { TasksIcon, IdeasIcon } from '../components/icons';

type Tab = 'tasks' | 'ideas';
type Pending = { label: string; run(): void };

export function ListScreen({ listId }: { listId: string }) {
  const data = useLiveQuery(async () => {
    const list = await db.lists.get(listId);
    const tasks = await db.tasks.where('listId').equals(listId).toArray();
    const ideas = await db.ideas.where('listId').equals(listId).toArray();
    return { list, tasks, ideas };
  }, [listId]);

  const [tab, setTab] = useState<Tab>(
    () => (sessionStorage.getItem(`tudu.tab.${listId}`) as Tab) || 'tasks'
  );
  const [capturing, setCapturing] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  // Unknown list id (bad URL or deleted list) → home.
  const missing = data !== undefined && !data.list;
  useEffect(() => {
    if (missing) navigate({ name: 'home' });
  }, [missing]);

  if (!data || !data.list) return null;
  const { list, tasks, ideas } = data;

  const selectTab = (next: Tab) => {
    setTab(next);
    sessionStorage.setItem(`tudu.tab.${listId}`, next);
  };

  const open = tasks.filter((t) => !t.done).sort(compareListTasks);
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const sortedIdeas = [...ideas].sort((a, b) => b.updatedAt - a.updatedAt);

  const confirmTask = (t: Task) =>
    setPending({ label: t.title, run: () => void deleteTask(t.id) });
  const confirmIdea = (i: Idea) =>
    setPending({ label: firstLine(i.text), run: () => void deleteIdea(i.id) });

  return (
    <div className="list-screen">
      <header className="screen-header">
        <button className="back-btn" aria-label="back" onClick={() => navigate({ name: 'home' })}>
          ‹
        </button>
        <span className="screen-emoji">{list.emoji}</span>
        <h1 className="screen-title">{list.name}</h1>
      </header>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'tasks'}
          className={tab === 'tasks' ? 'tab active' : 'tab'}
          onClick={() => selectTab('tasks')}
        >
          <TasksIcon />
          Tasks
        </button>
        <button
          role="tab"
          aria-selected={tab === 'ideas'}
          className={tab === 'ideas' ? 'tab active' : 'tab'}
          onClick={() => selectTab('ideas')}
        >
          <IdeasIcon />
          Ideas
        </button>
      </div>

      {tab === 'tasks' && (
        // Open + done rows share ONE container so toggling `done` repositions a
        // row's DOM node (React keys) instead of unmounting it — the checkbox
        // stays attached across the toggle. Done rows hide via CSS when collapsed.
        <div className={doneOpen ? 'rows' : 'rows done-collapsed'}>
          {open.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => void toggleTask(t.id)}
              onEdit={() => setEditing(t)}
              onDelete={() => confirmTask(t)}
            />
          ))}
          {open.length === 0 && done.length === 0 && (
            <p className="empty-hint">No tasks yet</p>
          )}

          {done.length > 0 && (
            <button
              key="done-header"
              className="done-header"
              aria-expanded={doneOpen}
              onClick={() => setDoneOpen((v) => !v)}
            >
              Done ({done.length})
              <span className="done-chevron">{doneOpen ? '⌄' : '›'}</span>
            </button>
          )}
          {done.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => void toggleTask(t.id)}
              onEdit={() => setEditing(t)}
              onDelete={() => confirmTask(t)}
            />
          ))}
        </div>
      )}

      {tab === 'ideas' && (
        <div className="rows">
          {sortedIdeas.map((i) => (
            <IdeaRow
              key={i.id}
              idea={i}
              onOpen={() => navigate({ name: 'idea', id: i.id })}
              onDelete={() => confirmIdea(i)}
            />
          ))}
          {sortedIdeas.length === 0 && <p className="empty-hint">No ideas yet</p>}
        </div>
      )}

      <button
        className="fab"
        aria-label={`add to ${list.name}`}
        onClick={() => setCapturing(true)}
      >
        +
      </button>

      {capturing && (
        <CaptureSheet
          open
          fixedListId={list.id}
          defaultType={tab === 'ideas' ? 'idea' : 'task'}
          onClose={() => setCapturing(false)}
        />
      )}

      {editing && (
        <TaskEditSheet
          key={editing.id}
          open
          task={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {pending && (
        <Sheet open onClose={() => setPending(null)} title="Delete">
          <p className="confirm-text">Delete “{pending.label}”?</p>
          <div className="sheet-actions">
            <button
              className="btn-danger"
              onClick={() => {
                pending.run();
                setPending(null);
              }}
            >
              Confirm — delete
            </button>
            <button className="btn-ghost" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
