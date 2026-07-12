// Tab / row iconography. currentColor so they inherit active/muted state.

// Tasks: a checkbox with a tick (echoes the app's own checkbox).
export function TasksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.3" y="2.3" width="11.4" height="11.4" rx="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.2 8.1 L7.1 10 L10.9 5.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ideas: 8-point burst — center dot + 4 cardinal + 4 shorter diagonals (dimmed).
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

// Streak flame. filled = ink silhouette (streak ≥ 1); outline = dimmed (streak 0).
export function Flame({ filled = true, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'} strokeWidth={filled ? 0 : 1.3}>
      <path d="M8.5 1.4c.3 1.6-.5 2.7-1.4 3.7-1 1.1-2.2 2.3-2.2 4.3a3.6 3.6 0 0 0 7.2 0c0-1-.4-1.9-1-2.6-.2.5-.6.9-1.1 1.1.7-1.8 0-4.2-1.5-6.5z"
        strokeLinejoin="round" />
    </svg>
  );
}

// Calendar (schedule control).
export function Calendar({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.2" y="3.2" width="11.6" height="10.6" rx="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.2 6.2h11.6M5.3 2v2.4M10.7 2v2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// Water droplet.
export function Droplet({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.6c2.4 2.9 4.4 5.1 4.4 7.5a4.4 4.4 0 0 1-8.8 0c0-2.4 2-4.6 4.4-7.5z" />
    </svg>
  );
}
