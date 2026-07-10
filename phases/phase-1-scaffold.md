# Phase 1 — Scaffold + verify harness

**Goal:** Empty-but-real app: Vite + React + TS + PWA plugin + hash routing shell, `npm run verify` wired and green, placeholder icons generated. After this phase the app runs in a phone browser and every later phase has a working check.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/hooks/useHashRoute.ts`, `src/styles.css`, `src/vite-env.d.ts`
- Create: `scripts/make-icons.mjs`, `public/icons/` (generated)
- Test: `tests/useHashRoute.test.ts`, `e2e/smoke.spec.ts`, `tests/setup.ts`

---

### Task 1: Package + toolchain

- [x] **Step 1: Install dependencies** (npm resolves current versions; majors expected: react 19, vite 7, vitest 3+, eslint 9 flat, dexie 4, playwright 1.5x)

```bash
npm init -y
npm i react react-dom dexie dexie-react-hooks
npm i -D typescript vite @vitejs/plugin-react vite-plugin-pwa \
  vitest jsdom fake-indexeddb @testing-library/react @testing-library/dom \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks \
  @playwright/test
npx playwright install webkit chromium
```

- [x] **Step 2: Set `package.json` fields/scripts** (keep generated deps, replace the rest)

```json
{
  "name": "tudu",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "icons": "node scripts/make-icons.mjs",
    "test": "vitest run",
    "e2e": "playwright test",
    "verify": "tsc --noEmit && eslint . && vitest run && playwright test"
  }
}
```

### Task 2: Config files

- [x] **Step 1: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src", "tests", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

- [x] **Step 2: `vite.config.ts`** — base path split (Pages serves at `/TUDU/`), PWA manifest, vitest config in one file

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/TUDU/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'TUDU',
        short_name: 'TUDU',
        description: 'Capture tasks and ideas into lists. Local-first.',
        display: 'standalone',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']
  }
}));
```

- [x] **Step 3: `eslint.config.js`**

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default ts.config(
  { ignores: ['dist', 'dev-dist', 'playwright-report', 'test-results', 'coverage'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  }
);
```

- [x] **Step 4: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 15_000,
  use: { baseURL: 'http://localhost:5173' },
  projects: [
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testIgnore: /offline/ },
    // chromium exists for the phase-7 offline/service-worker spec (SW support in test webkit is unreliable)
    { name: 'chromium-sw', use: { ...devices['Pixel 7'] }, testMatch: /offline/ }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

- [x] **Step 5: `index.html`** — iOS meta set from SPEC

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0b0b0f" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="TUDU" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <title>TUDU</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 6: `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

### Task 3: Hash router (TDD)

Route shape used by every later phase — frozen contract:

```ts
export type Route =
  | { name: 'home' }
  | { name: 'list'; id: string }
  | { name: 'idea'; id: string }
  | { name: 'settings' };
```

- [x] **Step 1: Write the failing test** — `tests/useHashRoute.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseHash, routeToHash } from '../src/hooks/useHashRoute';

describe('parseHash', () => {
  it('parses empty/root to home', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
  });
  it('parses list and idea routes with ids', () => {
    expect(parseHash('#/list/abc-123')).toEqual({ name: 'list', id: 'abc-123' });
    expect(parseHash('#/idea/x9')).toEqual({ name: 'idea', id: 'x9' });
  });
  it('parses settings', () => {
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
  });
  it('falls back to home on garbage', () => {
    expect(parseHash('#/nope/whatever')).toEqual({ name: 'home' });
    expect(parseHash('#/list/')).toEqual({ name: 'home' });
  });
});

describe('routeToHash', () => {
  it('is the inverse of parseHash', () => {
    const routes = [
      { name: 'home' }, { name: 'settings' },
      { name: 'list', id: 'a1' }, { name: 'idea', id: 'b2' }
    ] as const;
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r);
  });
});
```

- [x] **Step 2: Run test to verify it fails** — `npx vitest run tests/useHashRoute.test.ts` → FAIL (module not found)

- [x] **Step 3: Implement** — `src/hooks/useHashRoute.ts`

```ts
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'list'; id: string }
  | { name: 'idea'; id: string }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'list' && parts[1]) return { name: 'list', id: parts[1] };
  if (parts[0] === 'idea' && parts[1]) return { name: 'idea', id: parts[1] };
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'settings': return '#/settings';
    case 'list': return `#/list/${route.id}`;
    case 'idea': return `#/idea/${route.id}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
```

- [x] **Step 4: Run test to verify it passes** — `npx vitest run tests/useHashRoute.test.ts` → PASS
- [x] **Step 5: `tests/setup.ts`** (used by later phases' db tests; harmless now)

```ts
import 'fake-indexeddb/auto';
```

### Task 4: App shell

- [x] **Step 1: `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [x] **Step 2: `src/App.tsx`** — route switch with placeholder screens (replaced in phases 3–6)

```tsx
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const route = useHashRoute();
  return (
    <div className="app">
      <header className="app-header"><h1>TUDU</h1></header>
      <main>
        {route.name === 'home' && <p className="placeholder">home</p>}
        {route.name === 'list' && <p className="placeholder">list {route.id}</p>}
        {route.name === 'idea' && <p className="placeholder">idea {route.id}</p>}
        {route.name === 'settings' && <p className="placeholder">settings</p>}
      </main>
    </div>
  );
}
```

- [x] **Step 3: `src/styles.css`** — reset + design-token skeleton. Token NAMES are the contract; values get finalized in phase 3/7 with the frontend-design skill.

```css
:root {
  color-scheme: dark;
  --bg: #0b0b0f;
  --surface: #16161d;
  --surface-2: #1e1e27;
  --text: #e8e8ee;
  --muted: #8a8a99;
  --accent: #7c8cff;
  --danger: #ff6b6b;
  --radius: 12px;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --tap-target: 44px;
}
@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --bg: #f7f7f9; --surface: #ffffff; --surface-2: #eef0f4;
    --text: #17171c; --muted: #6b6b78;
  }
}
* { box-sizing: border-box; margin: 0; }
html, body, #root { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font: 16px/1.45 -apple-system, system-ui, sans-serif;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
.app {
  min-height: 100dvh;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    calc(env(safe-area-inset-bottom) + var(--space-6)) env(safe-area-inset-left);
  max-width: 640px;
  margin: 0 auto;
}
input, textarea, select, button { font: inherit; color: inherit; }
input, textarea, select { font-size: 16px; } /* blocks iOS focus zoom */
```

### Task 5: Placeholder icons

- [x] **Step 1: `scripts/make-icons.mjs`** — zero-dep PNG writer (solid bg + accent disc). Phase 7 replaces the artwork, same output paths.

```js
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x0b, 0x0b, 0x0f], FG = [0x7c, 0x8c, 0xff];

function crc32(buf) {
  let crc = ~0;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
const be32 = (n) => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const td = Buffer.concat([t, data]);
  return Buffer.concat([be32(data.length), td, be32(crc32(td))]);
}
function png(size, pad) {
  const ihdr = Buffer.concat([be32(size), be32(size), Buffer.from([8, 6, 0, 0, 0])]);
  const rows = [];
  const c = size / 2, r = size * (0.5 - pad);
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const inside = (x - c) ** 2 + (y - c) ** 2 <= r * r;
      const [cr, cg, cb] = inside ? FG : BG;
      row.set([cr, cg, cb, 255], 1 + x * 4);
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, 0.18));
writeFileSync('public/icons/icon-512.png', png(512, 0.18));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.28)); // extra safe-zone padding
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.14));
console.log('icons written to public/icons/');
```

- [x] **Step 2: Generate + verify** — `npm run icons && file public/icons/*.png`
Expected: four files, each `PNG image data, <size> x <size>, 8-bit/color RGBA`.

### Task 6: Smoke e2e + full verify

- [x] **Step 1: `e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('app shell loads with header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TUDU' })).toBeVisible();
});

test('hash routes render and back returns home', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByText('settings')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('home')).toBeVisible();
});
```

- [x] **Step 2: Run full verify** — `npm run verify`
Expected: tsc clean, eslint clean, 6 unit tests pass, 2 e2e pass (mobile-safari project).
- [x] **Step 3: Manual: phone check (optional but recommended)** — `npm run dev -- --host`, open `http://<mac-ip>:5173` in iPhone Safari: dark shell renders, no horizontal scroll, no zoom on input focus (none yet — recheck in phase 4).
- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React+TS PWA shell with verify harness"
```

**Done when:** `npm run verify` green · icons exist · app opens on phone via LAN.
