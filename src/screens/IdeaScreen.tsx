import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateIdea, type Idea } from '../db';
import { navigate } from '../hooks/useHashRoute';

export function IdeaScreen({ ideaId }: { ideaId: string }) {
  // null = resolved-but-missing, undefined = still loading.
  const idea = useLiveQuery(async () => (await db.ideas.get(ideaId)) ?? null, [ideaId]);

  useEffect(() => {
    if (idea === null) navigate({ name: 'home' });
  }, [idea]);

  if (!idea) return null;
  // Keyed by id so the editor's local state seeds once per idea and our own
  // autosaves (which re-emit this query) never clobber the textarea.
  return <IdeaEditor key={idea.id} idea={idea} />;
}

function IdeaEditor({ idea }: { idea: Idea }) {
  const [text, setText] = useState(idea.text);
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
      </header>
      <textarea
        ref={taRef}
        className="idea-editor"
        aria-label="Idea text"
        value={text}
        autoComplete="off"
        autoCorrect="off"
        onChange={onChange}
        onBlur={flush}
      />
    </div>
  );
}
