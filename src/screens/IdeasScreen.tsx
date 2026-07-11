import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteIdea } from '../db';
import { navigate } from '../hooks/useHashRoute';
import { firstLine } from '../logic/text';
import { IdeaRow } from '../components/IdeaRow';
import { CaptureSheet } from '../components/CaptureSheet';
import { Fab } from '../components/Fab';
import { Sheet } from '../components/Sheet';

export function IdeasScreen() {
  const [capturing, setCapturing] = useState(false);
  const [pending, setPending] = useState<{ label: string; run(): void } | null>(null);

  const data = useLiveQuery(async () => {
    const [ideas, lists] = await Promise.all([db.ideas.toArray(), db.lists.toArray()]);
    const names = new Map(lists.map((l) => [l.id, l.name]));
    return { ideas: ideas.sort((a, b) => b.updatedAt - a.updatedAt), names };
  });

  return (
    <div className="ideas-screen">
      <header className="screen-header"><h1 className="screen-title">Ideas</h1></header>

      <div className="rows">
        {data?.ideas.map((i) => (
          <IdeaRow
            key={i.id}
            idea={i}
            spaceName={data.names.get(i.listId) ?? ''}
            onOpen={() => navigate({ name: 'idea', id: i.id })}
            onDelete={() => setPending({ label: firstLine(i.text), run: () => void deleteIdea(i.id) })}
          />
        ))}
        {data && data.ideas.length === 0 && (
          <p className="empty-hint">No ideas yet — tap + to jot one down</p>
        )}
      </div>

      <Fab onPress={() => setCapturing(true)} />
      {capturing && <CaptureSheet open fixedType="idea" onClose={() => setCapturing(false)} />}

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
