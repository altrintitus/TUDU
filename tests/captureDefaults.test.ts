import { it, expect, beforeEach } from 'vitest';
import { loadCaptureDefaults, saveCaptureDefaults } from '../src/logic/captureDefaults';

const mem = (): Storage => {
  const m = new Map<string, string>();
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: k => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() { return m.size; }
  };
};

let s: Storage;
beforeEach(() => { s = mem(); });

it('defaults to task/inbox when empty or garbage', () => {
  expect(loadCaptureDefaults(s)).toEqual({ type: 'task', listId: 'inbox' });
  s.setItem('kin.capture.type', 'banana');
  expect(loadCaptureDefaults(s).type).toBe('task');
});

it('round-trips saved defaults', () => {
  saveCaptureDefaults({ type: 'idea', listId: 'abc' }, s);
  expect(loadCaptureDefaults(s)).toEqual({ type: 'idea', listId: 'abc' });
});
