# Phase 4 — Capture sheet

**Goal:** The 3-second capture: global FAB → bottom sheet, keyboard up, Task/Idea toggle (remembers last), list chip (defaults last-used), optional due date, Enter saves.

**Prerequisite:** Phase 3 done (Sheet component + home exist).

**Files:**
- Create: `src/components/CaptureSheet.tsx`, `src/components/Fab.tsx`, `src/logic/captureDefaults.ts`
- Modify: `src/screens/HomeScreen.tsx` (mount Fab + CaptureSheet), `src/styles.css`
- Test: `tests/captureDefaults.test.ts`, `e2e/capture.spec.ts`

**Contracts (frozen):**

```tsx
// Fab.tsx
export function Fab(props: { onPress(): void }): JSX.Element; // fixed bottom-right, respects safe-area, aria-label "capture"

// CaptureSheet.tsx
export function CaptureSheet(props: {
  open: boolean;
  onClose(): void;
  fixedListId?: string; // set by phase 5's per-list [+]: hides the list chip
}): JSX.Element;

// logic/captureDefaults.ts — localStorage-backed, pure enough to unit test with a stubbed Storage
export type CaptureType = 'task' | 'idea';
export function loadCaptureDefaults(storage?: Storage): { type: CaptureType; listId: string };
export function saveCaptureDefaults(d: { type: CaptureType; listId: string }, storage?: Storage): void;
```

localStorage keys: `kin.capture.type`, `kin.capture.listId`. Unknown/missing values fall back to `{ type: 'task', listId: 'inbox' }`.

---

### Task 1: captureDefaults (TDD)

- [x] **Step 1: Failing test** — `tests/captureDefaults.test.ts`

```ts
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
```

- [x] **Step 2: FAIL** → **Step 3: Implement** — `src/logic/captureDefaults.ts`

```ts
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
```

- [x] **Step 4: PASS** → commit `git commit -am "feat(capture): capture defaults persistence"`

### Task 2: Behavior checklist (Fab + CaptureSheet)

- [x] Fab visible on home, above safe-area-bottom, doesn't cover last list card (bottom padding on list).
- [x] Open → text input **autofocused** (keyboard up immediately on iOS: focus synchronously in the open handler, not in an effect after animation).
- [x] Segmented toggle `Task | Idea` initialized from `loadCaptureDefaults`; list chip = `<select>` of all lists (native select = free iOS wheel UI) initialized likewise; if saved list no longer exists → Inbox.
- [x] Due-date `<input type="date">` rendered **only** when type = task. Empty = no due date.
- [x] Save disabled while text is empty/whitespace. Enter key in the text input saves (task mode; in idea mode Enter inserts newline — idea input is a `<textarea>`, task input single-line).
- [x] Save → `createTask(listId, title.trim(), due || undefined)` or `createIdea(listId, text.trim())` → `saveCaptureDefaults` → sheet closes → brief non-blocking toast ("Saved to Work").
- [x] `fixedListId` prop set → list chip hidden, saves go to that list, defaults NOT overwritten.
- [x] Dismiss: tap dimmed backdrop or Cancel. No data written on dismiss.

### Task 3: e2e — `e2e/capture.spec.ts`

- [x] **Step 1: Write the spec** (same `beforeEach` DB-wipe block as `lists.spec.ts` — copy it verbatim)

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(dbs.map(d => new Promise(res => {
      const req = indexedDB.deleteDatabase(d.name!);
      req.onsuccess = req.onerror = req.onblocked = () => res(null);
    })));
  });
  await page.reload();
});

const iso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('capture a task due today → appears in Today strip', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  // date input also exposes role=textbox, so target the capture field by its label
  await page.getByRole('textbox', { name: 'Capture text' }).fill('finish report');
  await page.getByLabel(/due/i).fill(iso());
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByText('finish report')).toBeVisible();
});

test('capture an idea into a chosen list; sheet remembers it', async ({ page }) => {
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();

  await page.getByRole('button', { name: /capture/i }).click();
  await page.getByRole('button', { name: /idea/i }).click();
  await page.getByLabel(/list/i).selectOption({ label: 'Work' });
  await page.getByRole('textbox', { name: 'Capture text' }).fill('agent eval harness');
  await page.getByRole('button', { name: /save/i }).click();

  // reopen: defaults remembered
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /idea/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel(/list/i).locator('option:checked')).toHaveText('Work');
});

test('save disabled on empty text; dismiss writes nothing', async ({ page }) => {
  await page.getByRole('button', { name: /capture/i }).click();
  await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();
  await page.getByRole('button', { name: /cancel/i }).click();
  await expect(page.getByText('Today')).toHaveCount(0);
});
```

Accessibility hooks: Fab `aria-label="capture"`; toggle buttons expose `aria-pressed`; list select labelled "List"; due input labelled "Due".

- [x] **Step 2: Build until spec passes** — `npx playwright test e2e/capture.spec.ts`
- [x] **Step 3: `npm run verify`** all green
- [x] **Step 4: Reviewer agent on the diff, fix findings**
- [x] **Step 5: Commit** — `git commit -am "feat(capture): FAB + capture sheet with smart defaults"`

**Done when:** e2e green · phone check: FAB reachable one-handed, keyboard appears instantly on open, capture ≈3s end-to-end.
