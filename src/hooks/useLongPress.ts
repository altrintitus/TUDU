import { useRef } from 'react';

export function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
  };
  return {
    onPointerDown: () => { clear(); timer.current = setTimeout(onLongPress, ms); },
    onPointerUp: clear,
    onPointerMove: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  };
}
