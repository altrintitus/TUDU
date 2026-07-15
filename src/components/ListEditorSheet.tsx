import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet, useSheetDismiss } from './Sheet';
import { EditableText } from './EditableText';
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
  const { closing, close } = useSheetDismiss(onClose);

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
    close();
  };

  const del = async () => {
    if (!list || isInbox) return;
    await deleteList(list.id);
    close();
  };

  const title = list ? (isInbox ? 'Inbox' : 'Edit space') : 'New space';

  return (
    <Sheet open={open} closing={closing} onClose={close} title={title}>
      <div className="field">
        <span className="field-label">Name</span>
        {/* contenteditable, not <input>: no iOS keyboard form-assistant bar */}
        <EditableText className="capture-input" ariaLabel="Name" placeholder="Space name" value={name} onChange={setName} autoFocus onEnter={save} />
      </div>
      <div className="field">
        <span className="field-label">Emoji</span>
        <EditableText className="capture-input" ariaLabel="Emoji" placeholder="Optional" value={emoji} onChange={(v) => setEmoji([...v].slice(0, 2).join(''))} />
      </div>
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
