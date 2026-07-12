import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, INBOX_ID, type List } from '../db';
import { navigate } from '../hooks/useHashRoute';
import { ListCard } from '../components/ListCard';
import { ListEditorSheet } from '../components/ListEditorSheet';
import { Fab } from '../components/Fab';
import { CaptureSheet } from '../components/CaptureSheet';
import { InstallHint } from '../components/InstallHint';

type Editing = { list: List | null };

export function SpacesScreen() {
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

  // Inbox (the capture fallback space) is hidden while empty, shown once it holds
  // anything, so nothing captured there becomes unreachable.
  const visibleLists = model
    ? model.lists.filter(
        (l) =>
          l.id !== INBOX_ID ||
          (model.openTasks.get(l.id) ?? 0) + (model.ideaCounts.get(l.id) ?? 0) > 0
      )
    : [];

  return (
    <div className="spaces-screen">
      <header className="screen-header spaces-header">
        <h1 className="screen-title">Spaces</h1>
      </header>

      <InstallHint />

      <section className="lists">
        <div className="list-grid">
          {visibleLists.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              openTaskCount={model!.openTasks.get(l.id) ?? 0}
              ideaCount={model!.ideaCounts.get(l.id) ?? 0}
              onOpen={() => navigate({ name: 'list', id: l.id })}
              onEdit={() => setEditing({ list: l })}
            />
          ))}
          <button className="list-add" onClick={() => setEditing({ list: null })}>+ New space</button>
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
