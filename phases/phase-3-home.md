# Phase 3 — Home screen

**Goal:** Real home: Today strip (due/overdue across lists, hidden when empty) + lists section with create/rename/delete. First real UI — **invoke the `frontend-design` skill before writing CSS**; finalize the token values from `styles.css`.

**Prerequisite:** Phase 2 done. All data access via phase-2 exports + `useLiveQuery` from `dexie-react-hooks`. Call `ensureInbox()` once at app start.

**Files:**
- Create: `src/screens/HomeScreen.tsx`, `src/components/TodayStrip.tsx`, `src/components/ListCard.tsx`, `src/components/ListEditorSheet.tsx`, `src/components/Sheet.tsx`, `src/testBridge.ts`
- Modify: `src/App.tsx` (mount HomeScreen for `home` route; call `ensureInbox` + import testBridge), `src/styles.css` (finalized tokens + component styles)
- Test: `e2e/lists.spec.ts`

**Component contracts (frozen):**

```tsx
// Sheet.tsx — reusable bottom sheet, used by ListEditorSheet (P3), CaptureSheet (P4), task edit (P5)
export function Sheet(props: { open: boolean; onClose(): void; title?: string; children: ReactNode }): JSX.Element;

// TodayStrip.tsx — self-querying; renders nothing when no due/overdue tasks
export function TodayStrip(): JSX.Element | null;

// ListCard.tsx
export function ListCard(props: {
  list: List;
  openTaskCount: number;
  ideaCount: number;
  onOpen(): void;        // navigate({ name: 'list', id })
  onEdit(): void;        // opens ListEditorSheet
}): JSX.Element;

// ListEditorSheet.tsx — create when list is null, edit otherwise
export function ListEditorSheet(props: { open: boolean; list: List | null; onClose(): void }): JSX.Element;
```

---

### Task 1: Behavior (build against this checklist)

- [x] `App.tsx`: on mount `ensureInbox()`; `home` route renders `<HomeScreen />`.
- [x] **Today strip**: `useLiveQuery` all tasks → filter `isDueOrOverdue(t, todayStr())` → sort `compareTodayTasks`. Each row: checkbox, title, source list name (small, muted). Overdue rows visually distinct (danger accent + `formatDue` label). Checking calls `toggleTask` — row leaves the strip. Strip (incl. header "Today") entirely absent when empty.
- [x] **Lists section**: all lists sorted by `sortOrder`. Card = emoji, name, `N□ M💡` counts (open tasks only). Tap card → `navigate({ name: 'list', id })`. Edit affordance (e.g. ⋯ button, min 44px) → ListEditorSheet.
- [x] **ListEditorSheet**: name input (autofocus) + optional emoji input + Save. Edit mode adds Delete (with inline confirm step — "Delete list and its N tasks / M ideas?"). **Inbox: no delete button, name input disabled** (guards also exist in db — belt and suspenders).
- [x] `[+ list]` affordance at the end of the lists section → ListEditorSheet in create mode.
- [x] Empty DB state: only Inbox card + `[+ list]`; no Today strip; short hint text ("Capture something — tap +" — FAB itself lands in phase 4).

### Task 2: Dev-only test bridge (e2e seeding)

- [x] **`src/testBridge.ts`** — exact content:

```ts
import { createList, createTask, createIdea, db } from './db';

// e2e seeding hook; dev server only, never in production builds
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__tudu = { createList, createTask, createIdea, db };
}
export {};
```

- [x] Import it from `main.tsx`: `import './testBridge';`

### Task 3: e2e — `e2e/lists.spec.ts`

- [x] **Step 1: Write the spec** (fails until UI built)

```ts
import { test, expect } from '@playwright/test';

// fresh origin storage per test
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

test('fresh app shows Inbox only, no Today strip', async ({ page }) => {
  await expect(page.getByText('Inbox')).toBeVisible();
  await expect(page.getByText('Today')).toHaveCount(0);
});

test('create, rename, delete a list', async ({ page }) => {
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Work');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Work')).toBeVisible();

  await page.getByRole('button', { name: /edit work/i }).click();
  await page.getByRole('textbox', { name: /name/i }).fill('Deriv');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Deriv')).toBeVisible();
  await expect(page.getByText('Work')).toHaveCount(0);

  await page.getByRole('button', { name: /edit deriv/i }).click();
  await page.getByRole('button', { name: /^delete/i }).click();
  await page.getByRole('button', { name: /confirm|yes/i }).click();
  await expect(page.getByText('Deriv')).toHaveCount(0);
});

test('inbox cannot be deleted', async ({ page }) => {
  await page.getByRole('button', { name: /edit inbox/i }).click();
  await expect(page.getByRole('button', { name: /^delete/i })).toHaveCount(0);
});

test('today strip shows due + overdue across lists, checking removes', async ({ page }) => {
  await page.evaluate(async () => {
    const tudu = (window as never as { __tudu: typeof import('../src/testBridge') & Record<string, CallableFunction> }).__tudu;
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today.getTime() - 86_400_000);
    const work = await tudu.createList('Work');
    await tudu.createTask(work.id, 'overdue report', iso(yesterday));
    await tudu.createTask('inbox', 'due today', iso(today));
    await tudu.createTask('inbox', 'future', '2999-01-01');
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByText('overdue report')).toBeVisible();
  await expect(page.getByText('due today')).toBeVisible();
  await expect(page.getByText('future')).toHaveCount(0);

  // click, not check(): completing the task unmounts the row, so check()'s
  // post-click "is now checked" assertion would race against the detach.
  await page.getByRole('checkbox', { name: /due today/i }).click();
  await expect(page.getByText('due today')).toHaveCount(0);
});
```

Accessibility hook for the spec: ListCard's edit button needs `aria-label={"edit " + list.name}`; Today-strip checkboxes need `aria-label` = task title; create-list button accessible name matches `/new list/i`.

- [x] **Step 2: Build UI until spec passes** — `npx playwright test e2e/lists.spec.ts`
- [x] **Step 3: Full verify** — `npm run verify` (smoke spec may need updating if placeholder "home" text was asserted — update it to assert the real home instead)
- [x] **Step 4: Reviewer agent on the diff, fix findings**
- [x] **Step 5: Commit** — `git add -A && git commit -m "feat(home): lists CRUD + today strip"`

**Done when:** all e2e green on iPhone profile · phone LAN check: cards ≥44px tap targets, dark theme correct, safe-areas respected.
