# Phase 5 — List view + idea editor

**Goal:** Inside a list: Tasks/Ideas tabs, task check/edit/delete with collapsed Done section, idea rows (first-line title), full-screen autosaving idea editor, per-list add.

**Prerequisite:** Phase 4 done (CaptureSheet reusable via `fixedListId`).

**Files:**
- Create: `src/screens/ListScreen.tsx`, `src/screens/IdeaScreen.tsx`, `src/components/TaskRow.tsx`, `src/components/IdeaRow.tsx`, `src/components/TaskEditSheet.tsx`, `src/hooks/useLongPress.ts`
- Modify: `src/App.tsx` (route `list` → ListScreen, `idea` → IdeaScreen), `src/styles.css`
- Test: `tests/useLongPress.test.tsx` (optional, hook is timer logic), `e2e/list-view.spec.ts`

**Contracts (frozen):**

```tsx
// ListScreen: header (emoji + name + back → navigate home), tabs Tasks|Ideas
// (active tab per list in sessionStorage key `kin.tab.<listId>`), per-list [+]
// button → CaptureSheet with fixedListId=list.id.

// TaskRow.tsx
export function TaskRow(props: {
  task: Task;
  listName?: string;       // set by TodayStrip only
  onToggle(): void;
  onEdit(): void;          // opens TaskEditSheet
  onDelete(): void;        // long-press path
}): JSX.Element;

// TaskEditSheet.tsx — edit title + due date, includes Delete button
export function TaskEditSheet(props: { open: boolean; task: Task | null; onClose(): void }): JSX.Element;

// IdeaRow.tsx — firstLine(text) bold + relative updated time, tap → navigate({name:'idea', id})
export function IdeaRow(props: { idea: Idea; onOpen(): void; onDelete(): void }): JSX.Element;

// IdeaScreen: full-screen <textarea>, autosaves via updateIdea (500ms debounce +
// flush on blur/unmount/back), back → navigate({name:'list', id: idea.listId}).

// useLongPress.ts
export function useLongPress(onLongPress: () => void, ms?: number): {
  onPointerDown(e: React.PointerEvent): void;
  onPointerUp(): void;
  onPointerMove(): void;   // cancels (scroll intent)
  onPointerLeave(): void;
  onContextMenu(e: React.MouseEvent): void; // preventDefault
};
```

- [x] **`src/hooks/useLongPress.ts`** — exact implementation (500ms default; movement cancels so scrolling never triggers it):

```ts
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
```

---

### Task 1: Behavior checklist

- [x] **Tasks tab**: open tasks sorted with `compareListTasks`; due label via `formatDue` (overdue styled danger). Check → `toggleTask`, row animates out of open section into **`Done (n)`** collapsed section at the bottom (tap header to expand/collapse; collapsed by default; hidden when n=0). Uncheck inside Done restores to open.
- [x] Tap task row → TaskEditSheet (title input prefilled, date input prefilled, Save via `updateTask`, Delete button with inline confirm → `deleteTask`). Long-press row → delete confirm directly (uses `useLongPress`).
- [x] **Ideas tab**: rows sorted `updatedAt` desc. Row = `firstLine(idea.text)` bold + relative time ("2h ago" — implement `relativeTime(ts: number, now?: number): string` in `src/logic/text.ts` with unit test: <60s "now", <1h "Nm ago", <24h "Nh ago", <7d "Nd ago", else short date). Tap → IdeaScreen. Long-press → delete confirm.
- [x] **IdeaScreen**: textarea autofocused at end of text; autosave debounced 500ms + flush on blur and unmount; back button returns to the list's Ideas tab. Empty text on exit → keep idea (shows "Untitled").
- [x] Per-list `[+]` opens CaptureSheet with `fixedListId` — no list chip, type toggle defaults to active tab (Tasks tab → task, Ideas tab → idea, overriding stored default for this entry point only).
- [x] Unknown list id in URL (`#/list/garbage`) → redirect home (`navigate({name:'home'})` in an effect).

### Task 2: e2e — `e2e/list-view.spec.ts`

- [x] **Step 1: Write the spec** (same DB-wipe `beforeEach` as lists.spec.ts; seed via `__kin` bridge)

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
  await page.evaluate(async () => {
    const kin = (window as never as { __kin: Record<string, CallableFunction> }).__kin;
    await kin.createTask('inbox', 'buy milk');
    await kin.createIdea('inbox', 'app idea\nlonger body text');
  });
  await page.reload();
  await page.getByText('Inbox').click();
});

test('check task → moves to collapsed Done; uncheck restores', async ({ page }) => {
  await page.getByRole('checkbox', { name: /buy milk/i }).check();
  await expect(page.getByText(/done \(1\)/i)).toBeVisible();
  await expect(page.getByText('buy milk')).toBeHidden(); // collapsed

  await page.getByText(/done \(1\)/i).click();
  await page.getByRole('checkbox', { name: /buy milk/i }).uncheck();
  await expect(page.getByText(/done/i)).toHaveCount(0);
  await expect(page.getByText('buy milk')).toBeVisible();
});

test('edit task title and due via sheet', async ({ page }) => {
  await page.getByText('buy milk').click();
  await page.getByRole('textbox', { name: /title/i }).fill('buy oat milk');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('buy oat milk')).toBeVisible();
});

test('ideas tab shows first-line title; editor autosaves across reload', async ({ page }) => {
  await page.getByRole('tab', { name: /ideas/i }).click();
  await expect(page.getByText('app idea')).toBeVisible();
  await expect(page.getByText('longer body text')).toHaveCount(0);

  await page.getByText('app idea').click();
  const editor = page.getByRole('textbox');
  await editor.fill('renamed idea\nnew body');
  await page.waitForTimeout(700); // > debounce
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue('renamed idea\nnew body');

  await page.getByRole('button', { name: /back/i }).click();
  await expect(page.getByText('renamed idea')).toBeVisible();
});

test('per-list add captures directly into this list', async ({ page }) => {
  await page.getByRole('tab', { name: /tasks/i }).click();
  await page.getByRole('button', { name: /add to inbox/i }).click();
  await expect(page.getByLabel(/list/i)).toHaveCount(0); // chip hidden
  await page.getByRole('textbox').fill('from inside list');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('from inside list')).toBeVisible();
});

test('garbage list id redirects home', async ({ page }) => {
  await page.goto('/#/list/does-not-exist');
  await expect(page.getByText('Inbox')).toBeVisible(); // home
});
```

Accessibility hooks: tabs use `role="tab"` with names Tasks/Ideas; task checkbox `aria-label` = title; per-list add button `aria-label` = `add to <list name>`; IdeaScreen back button name "back"; TaskEditSheet title input labelled "Title".

- [x] **Step 2: Build until spec passes** — `npx playwright test e2e/list-view.spec.ts`
- [x] **Step 3: `npm run verify` green** (add the `relativeTime` unit test to `tests/text.test.ts`)
- [x] **Step 4: Reviewer agent on the diff, fix findings**
- [x] **Step 5: Commit** — `git commit -am "feat(list-view): tabs, task lifecycle, idea editor"`

**Done when:** e2e green · phone check: long-press deletes don't fire while scrolling, keyboard behavior in editor comfortable, Done section animation not janky.
