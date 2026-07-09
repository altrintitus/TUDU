export type CaptureType = 'task' | 'idea';
const TYPE_KEY = 'kin.capture.type';
const LIST_KEY = 'kin.capture.listId';

export function loadCaptureDefaults(storage: Storage = localStorage): { type: CaptureType; listId: string } {
  const rawType = storage.getItem(TYPE_KEY);
  return {
    type: rawType === 'idea' ? 'idea' : 'task',
    listId: storage.getItem(LIST_KEY) ?? 'inbox'
  };
}

export function saveCaptureDefaults(d: { type: CaptureType; listId: string }, storage: Storage = localStorage): void {
  storage.setItem(TYPE_KEY, d.type);
  storage.setItem(LIST_KEY, d.listId);
}
