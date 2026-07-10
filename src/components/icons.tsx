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

// Ideas: a lightbulb (matches the 💡 idea marker used on list cards).
export function IdeasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.7 C5.4 1.7 3.4 3.7 3.4 6.2 C3.4 7.9 4.3 9.1 5.2 9.9 C5.7 10.3 6 10.8 6 11.4 L10 11.4 C10 10.8 10.3 10.3 10.8 9.9 C11.7 9.1 12.6 7.9 12.6 6.2 C12.6 3.7 10.6 1.7 8 1.7 Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <line x1="6.3" y1="13" x2="9.7" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="6.9" y1="14.4" x2="9.1" y2="14.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
