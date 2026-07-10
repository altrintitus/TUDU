// Tab / row iconography from design/Logo-Checkbox-Ideas. currentColor so they
// inherit active/muted state from the parent.

export function TasksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="2" y1="4.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="8.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12.5" x2="8" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 8-point burst: center dot + 4 cardinal + 4 shorter diagonals (dimmed)
export function IdeasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      <line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <g opacity="0.55">
        <line x1="3.1" y1="3.1" x2="5.2" y2="5.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="10.8" y1="10.8" x2="12.9" y2="12.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="12.9" y1="3.1" x2="10.8" y2="5.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="5.2" y1="10.8" x2="3.1" y2="12.9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  );
}
