import { useEffect, useState } from 'react';

// Module-level emitter so any component can raise a toast without prop-drilling
// or widening a frozen contract. A single <ToastHost /> renders them.
let emit: (msg: string) => void = () => {};

export function toast(msg: string): void {
  emit(msg);
}

const SHOW_MS = 1550; // visible time before the exit animation
const OUT_MS = 250; // matches @keyframes toast-out

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  const [out, setOut] = useState(false);

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout>;
    let gone: ReturnType<typeof setTimeout>;
    emit = (m: string) => {
      clearTimeout(hide);
      clearTimeout(gone);
      setOut(false);
      setMsg(m);
      hide = setTimeout(() => setOut(true), SHOW_MS);
      gone = setTimeout(() => setMsg(null), SHOW_MS + OUT_MS);
    };
    return () => {
      emit = () => {};
      clearTimeout(hide);
      clearTimeout(gone);
    };
  }, []);

  if (!msg) return null;
  return <div className={out ? 'toast out' : 'toast'} role="status">{msg}</div>;
}
