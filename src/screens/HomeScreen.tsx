import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type List } from '../db';
import { navigate } from '../hooks/useHashRoute';
import { TodayStrip } from '../components/TodayStrip';
import { ListCard } from '../components/ListCard';
import { ListEditorSheet } from '../components/ListEditorSheet';
import { Fab } from '../components/Fab';
import { CaptureSheet } from '../components/CaptureSheet';
import { Logo } from '../components/Logo';
import { InstallHint } from '../components/InstallHint';

type Editing = { list: List | null };

export function HomeScreen() {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [capturing, setCapturing] = useState(false);

  const model = useLiveQuery(async () => {
    const [lists, tasks, ideas] = await Promise.all([
      db.lists.orderBy('sortOrder').toArray(),
      db.tasks.toArray(),
      db.ideas.toArray()
    ]);
    const openTasks = new Map<string, number>();
    const ideaCounts = new Map<string, number>();
    for (const t of tasks) if (!t.done) openTasks.set(t.listId, (openTasks.get(t.listId) ?? 0) + 1);
    for (const i of ideas) ideaCounts.set(i.listId, (ideaCounts.get(i.listId) ?? 0) + 1);
    return { lists, openTasks, ideaCounts };
  });

  const showHint =
    !!model && model.lists.length <= 1 && model.openTasks.size === 0 && model.ideaCounts.size === 0;

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="wordmark"><Logo className="wordmark-logo" /></h1>
        <button className="icon-btn" aria-label="settings" onClick={() => navigate({ name: 'settings' })}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10 1.6v2.2M10 16.2v2.2M18.4 10h-2.2M3.8 10H1.6M15.94 4.06l-1.56 1.56M5.62 14.38l-1.56 1.56M15.94 15.94l-1.56-1.56M5.62 5.62L4.06 4.06"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <InstallHint />

      <TodayStrip />

      <section className="lists">
        <h2 className="section-label">Lists</h2>
        <div className="list-grid">
          {model?.lists.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              openTaskCount={model.openTasks.get(l.id) ?? 0}
              ideaCount={model.ideaCounts.get(l.id) ?? 0}
              onOpen={() => navigate({ name: 'list', id: l.id })}
              onEdit={() => setEditing({ list: l })}
            />
          ))}
          <button className="list-add" onClick={() => setEditing({ list: null })}>+ New list</button>
        </div>
        {showHint && <p className="empty-hint">Capture something — tap +</p>}
      </section>

      {editing && (
        <ListEditorSheet
          key={editing.list?.id ?? 'new'}
          open
          list={editing.list}
          onClose={() => setEditing(null)}
        />
      )}

      <Fab onPress={() => setCapturing(true)} />
      {capturing && <CaptureSheet open onClose={() => setCapturing(false)} />}
    </div>
  );
}
