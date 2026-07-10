import { useRef } from 'react';

// Movement beyond this (px) counts as a scroll/drag and cancels the press, so a
// real finger's micro-jitter doesn't stop the long-press from firing.
const MOVE_TOLERANCE = 10;

export function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const clear = () => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(onLongPress, ms);
    },
    onPointerUp: clear,
    onPointerMove: (e: React.PointerEvent) => {
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (dx * dx + dy * dy > MOVE_TOLERANCE * MOVE_TOLERANCE) clear();
    },
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  };
}
