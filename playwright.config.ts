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
