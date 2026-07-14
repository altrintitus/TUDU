import type { List } from '../db';
import { TasksIcon, IdeasIcon } from './icons';

export function ListCard({ list, openTaskCount, ideaCount, onOpen, onEdit, editable = true }: {
  list: List;
  openTaskCount: number;
  ideaCount: number;
  onOpen(): void;
  onEdit(): void;
  editable?: boolean; // Inbox has nothing to edit — hide the ⋯ (no dead-end sheet)
}) {
  return (
    <div className="list-card">
      <button className="list-card-main" onClick={onOpen}>
        <span className="list-card-emoji" aria-hidden="true">{list.emoji ?? '•'}</span>
        <span className="list-card-name">{list.name}</span>
        <span className="list-card-counts">
          <span>{openTaskCount}<span className="ct-icon"><TasksIcon /></span></span>
          <span>{ideaCount}<span className="ct-icon"><IdeasIcon /></span></span>
        </span>
      </button>
      {editable && (
        <button className="list-card-edit" aria-label={`edit ${list.name}`} onClick={onEdit}>⋯</button>
      )}
    </div>
  );
}
