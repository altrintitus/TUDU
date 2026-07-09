import { useEffect, useState } from 'react';

// Module-level emitter so any component can raise a toast without prop-drilling
// or widening a frozen contract. A single <ToastHost /> renders them.
let emit: (msg: string) => void = () => {};

export function toast(msg: string): void {
  emit(msg);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    emit = (m: string) => {
      setMsg(m);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 1800);
    };
    return () => {
      emit = () => {};
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
}
