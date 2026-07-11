import { useRef } from 'react';
import type { Idea } from '../db';
import { useLongPress } from '../hooks/useLongPress';
import { firstLine, relativeTime } from '../logic/text';
import { IdeasIcon } from './icons';

export function IdeaRow({ idea, spaceName, onOpen, onDelete }: {
  idea: Idea;
  spaceName?: string; // shown on the aggregated Ideas page
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
        <span className="idea-icon"><IdeasIcon /></span>
        <span className="idea-title">{firstLine(idea.text)}</span>
        {spaceName && <span className="idea-space">{spaceName}</span>}
        <span className="idea-time">{relativeTime(idea.updatedAt)}</span>
      </button>
    </div>
  );
}
