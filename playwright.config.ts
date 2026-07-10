import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 15_000,
  projects: [
    // feature suites run against the dev server
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'], baseURL: 'http://localhost:5173' },
      testIgnore: /offline/
    },
    // offline/service-worker spec needs a real precache → production preview.
    // (chromium: SW support in test webkit is unreliable.)
    {
      name: 'chromium-sw',
      use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4173' },
      testMatch: /offline/
    }
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'TEST_BUILD=1 npm run build && TEST_BUILD=1 npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
