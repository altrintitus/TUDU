# Phase 7 — PWA + iOS polish

**Goal:** Real PWA: offline after first load, persistent storage, install hint on iOS, private-mode failure banner, final icon + design polish pass.

**Prerequisite:** Phase 6 done (all features exist; this phase hardens).

**Files:**
- Create: `src/logic/install.ts`, `src/components/InstallHint.tsx`, `src/components/DbErrorBanner.tsx`
- Modify: `src/main.tsx` (SW registration), `src/App.tsx` (persist + banners), `vite.config.ts` (`devOptions`), `scripts/make-icons.mjs` (final artwork), `src/styles.css` (polish)
- Test: `tests/install.test.ts`, `e2e/offline.spec.ts`

---

### Task 1: Service worker + offline e2e

- [ ] **Step 1:** `vite.config.ts` — add to the `VitePWA({...})` options: `devOptions: { enabled: true }` (SW available on the dev server so e2e can exercise it).
- [ ] **Step 2:** `src/main.tsx` — register:

```ts
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
```

- [ ] **Step 3: `e2e/offline.spec.ts`** (runs in the `chromium-sw` Playwright project from phase 1 — webkit SW support in tests is unreliable)

```ts
import { test, expect } from '@playwright/test';

test('app works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Kin' })).toBeVisible();
  await context.setOffline(false);
});
```

- [ ] **Step 4:** `npx playwright test e2e/offline.spec.ts` → PASS

### Task 2: Persistent storage + private-mode banner

- [ ] In `App.tsx`: `ensureInbox()` promise → on success, fire-and-forget `navigator.storage?.persist?.()`; on **failure** set `dbError` state → render `DbErrorBanner`.
- [ ] `DbErrorBanner`: fixed top banner — "Storage unavailable (private browsing?). Nothing you enter will be saved." Non-dismissable while error persists. App remains viewable.

### Task 3: iOS install hint (TDD on the predicate)

- [ ] **Step 1: Failing test** — `tests/install.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { shouldShowInstallHint } from '../src/logic/install';

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

describe('shouldShowInstallHint', () => {
  it('shows for iPhone Safari browser tab, not dismissed', () => {
    expect(shouldShowInstallHint({ ua: IOS_UA, standalone: false, dismissed: false })).toBe(true);
  });
  it('hidden when already standalone (installed)', () => {
    expect(shouldShowInstallHint({ ua: IOS_UA, standalone: true, dismissed: false })).toBe(false);
  });
  it('hidden when dismissed or not iOS', () => {
    expect(shouldShowInstallHint({ ua: IOS_UA, standalone: false, dismissed: true })).toBe(false);
    expect(shouldShowInstallHint({ ua: MAC_UA, standalone: false, dismissed: false })).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL** → **Step 3: Implement** — `src/logic/install.ts`

```ts
export function shouldShowInstallHint(env: { ua: string; standalone: boolean; dismissed: boolean }): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(env.ua);
  return isIOS && !env.standalone && !env.dismissed;
}

export function currentInstallEnv(): { ua: string; standalone: boolean; dismissed: boolean } {
  return {
    ua: navigator.userAgent,
    standalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    dismissed: localStorage.getItem('kin.installHintDismissed') === '1'
  };
}
```

- [ ] **Step 4: PASS.** `InstallHint` component: one-time dismissable card on home — "Install Kin: tap Share → Add to Home Screen." Dismiss sets `kin.installHintDismissed=1`.

### Task 4: Final icon + design polish

- [ ] Replace placeholder artwork in `scripts/make-icons.mjs` (or hand-made PNGs at same paths): dark bg `#0b0b0f`, distinct mark. Keep all four outputs + sizes. Re-run `npm run icons`.
- [ ] **Design pass with the `frontend-design` skill across all screens**: type scale, spacing rhythm, sheet slide + row check-out animations (`prefers-reduced-motion` respected), light theme audit, contrast ≥ WCAG AA for text.
- [ ] iOS audit on device (`npm run dev -- --host`): safe-areas (notch + home indicator) on every screen incl. sheets and FAB; no rubber-band scroll of the app shell; no zoom on any input focus; keyboard does not cover the capture sheet's Save.

### Task 5: Verify + manual PWA check

- [ ] `npm run verify` green (all 6 e2e files).
- [ ] `npm run build && npm run preview` → Chrome DevTools Lighthouse: PWA installable, no manifest/SW errors.
- [ ] Reviewer agent on the diff, fix findings.
- [ ] Commit — `git commit -am "feat(pwa): offline, install hint, storage persistence, polish"`

**Done when:** offline e2e green · Lighthouse installable · phone: airplane-mode reload still renders app with data.
