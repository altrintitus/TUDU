import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateIdea, deleteIdea, type Idea } from '../db';
import { navigate } from '../hooks/useHashRoute';
import { Sheet } from '../components/Sheet';
import { firstLine } from '../logic/text';

export function IdeaScreen({ ideaId }: { ideaId: string }) {
  // null = resolved-but-missing, undefined = still loading.
  const idea = useLiveQuery(async () => (await db.ideas.get(ideaId)) ?? null, [ideaId]);
  // Set when the user deletes from the editor: that path navigates to the list
  // itself, so the "missing → home" redirect must not also fire (avoids a flash).
  const deleting = useRef(false);

  useEffect(() => {
    if (idea === null && !deleting.current) navigate({ name: 'home' });
  }, [idea]);

  if (!idea) return null;
  // Keyed by id so the editor's local state seeds once per idea and our own
  // autosaves (which re-emit this query) never clobber the textarea.
  return <IdeaEditor key={idea.id} idea={idea} onDelete={() => { deleting.current = true; }} />;
}

function IdeaEditor({ idea, onDelete }: { idea: Idea; onDelete(): void }) {
  const [text, setText] = useState(idea.text);
  const [confirmDel, setConfirmDel] = useState(false);
  const textRef = useRef(text);
  const savedRef = useRef(idea.text);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (textRef.current !== savedRef.current) {
      savedRef.current = textRef.current;
      void updateIdea(idea.id, textRef.current);
    }
  }, [idea.id]);

  // Flush any pending edit when leaving the screen.
  useEffect(() => flush, [flush]);

  // iOS can suspend/kill the tab without unmounting (backgrounding, app switch)
  // — flush on those signals so the last debounced edit isn't lost.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  const remove = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    onDelete(); // tell IdeaScreen to skip its missing→home redirect
    void deleteIdea(idea.id);
    navigate({ name: 'list', id: idea.listId });
  };

  // Autofocus with caret at end of existing text.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.focus();
    const n = el.value.length;
    el.setSelectionRange(n, n);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    textRef.current = v;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  };

  const back = () => {
    flush();
    navigate({ name: 'list', id: idea.listId });
  };

  return (
    <div className="idea-screen">
      <header className="screen-header">
        <button className="back-btn" aria-label="back" onClick={back}>
          ‹
        </button>
        <button className="icon-btn danger" aria-label="delete note" onClick={() => setConfirmDel(true)}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 5h12M7 5V3.6h4V5M6 5l.6 9h4.8L12 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>
      <textarea
        ref={taRef}
        className="idea-editor"
        aria-label="Note text"
        value={text}
        autoComplete="off"
        autoCorrect="off"
        onChange={onChange}
        onBlur={flush}
      />

      {confirmDel && (
        <Sheet open onClose={() => setConfirmDel(false)} title="Delete">
          <p className="confirm-text">Delete “{firstLine(idea.text)}”?</p>
          <div className="sheet-actions">
            <button className="btn-danger" onClick={remove}>Confirm — delete</button>
            <button className="btn-ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
