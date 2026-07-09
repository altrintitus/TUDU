import { useRef } from 'react';
import type { Idea } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { firstLine, relativeTime } from '../logic/text';

export function IdeaRow({ idea, onOpen, onDelete }: {
  idea: Idea;
  onOpen(): void;
  onDelete(): void;
}) {
  // A long-press ends in a pointerup that also emits a click on the inner button;
  // swallow that trailing click so the delete-confirm isn't followed by onOpen.
  const fired = useRef(false);
  const longPress = useLongPress(() => { fired.current = true; onDelete(); });
  const onClick = () => { if (fired.current) { fired.current = false; return; } onOpen(); };
  return (
    <div className="idea-row" {...longPress} onPointerDownCapture={() => { fired.current = false; }}>
      <button className="idea-main" onClick={onClick}>
        <span className="idea-title">{firstLine(idea.text)}</span>
        <span className="idea-time">{relativeTime(idea.updatedAt)}</span>
      </button>
    </div>
  );
}
