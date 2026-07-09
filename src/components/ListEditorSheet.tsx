import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { db, createList, renameList, deleteList, INBOX_ID, type List } from '../db';

export function ListEditorSheet({ open, list, onClose }: {
  open: boolean;
  list: List | null;
  onClose(): void;
}) {
  const isInbox = list?.id === INBOX_ID;
  const [name, setName] = useState(list?.name ?? '');
  const [emoji, setEmoji] = useState(list?.emoji ?? '');
  const [confirming, setConfirming] = useState(false);

  const counts = useLiveQuery(async () => {
    if (!list) return { t: 0, i: 0 };
    const [t, i] = await Promise.all([
      db.tasks.where('listId').equals(list.id).count(),
      db.ideas.where('listId').equals(list.id).count()
    ]);
    return { t, i };
  }, [list?.id]) ?? { t: 0, i: 0 };

  const save = async () => {
    const n = name.trim();
    if (!n || isInbox) return;
    if (list) await renameList(list.id, n, emoji.trim() || undefined);
    else await createList(n, emoji.trim() || undefined);
    onClose();
  };

  const del = async () => {
    if (!list || isInbox) return;
    await deleteList(list.id);
    onClose();
  };

  const title = list ? (isInbox ? 'Inbox' : 'Edit list') : 'New list';

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <label className="field">
        <span className="field-label">Name</span>
        <input
          aria-label="Name"
          value={name}
          disabled={isInbox}
          placeholder="List name"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">Emoji</span>
        <input
          aria-label="Emoji"
          value={emoji}
          disabled={isInbox}
          maxLength={2}
          placeholder="Optional"
          onChange={(e) => setEmoji(e.target.value)}
        />
      </label>
      <div className="sheet-actions">
        {list && !isInbox && !confirming && (
          <button className="btn-danger" onClick={() => setConfirming(true)}>Delete</button>
        )}
        {confirming && (
          <button className="btn-danger" onClick={del}>
            Confirm — delete {list?.name} &amp; {counts.t} tasks / {counts.i} ideas
          </button>
        )}
        <button className="btn-primary" onClick={save} disabled={isInbox || !name.trim()}>
          Save
        </button>
      </div>
    </Sheet>
  );
}
