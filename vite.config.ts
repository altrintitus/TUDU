/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  // Pages serves under /TUDU/; test/preview builds (TEST_BUILD=1) stay at root so
  // the offline e2e can hit '/' and the SW scope is '/'.
  base: mode === 'production' && !process.env.TEST_BUILD ? '/TUDU/' : '/',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      devOptions: { enabled: true }, // SW on the dev server so e2e can exercise offline
      // default globs omit ttf; add it so the bundled Comfortaa font precaches for offline
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'] },
      manifest: {
        // stable identity so installs survive start_url changes
        id: '/TUDU/',
        name: 'TUDU',
        short_name: 'TUDU',
        description: 'Tasks, notes, routines, and water — captured into spaces. Local-first, on-device.',
        display: 'standalone',
        background_color: '#100f0e',
        theme_color: '#100f0e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        // long-press app icon → quick capture (Android/desktop; iOS ignores).
        // relative URL so it resolves under both the /TUDU/ base and test builds
        shortcuts: [
          {
            name: 'New task',
            short_name: 'New task',
            description: 'Capture a task',
            url: './#/capture',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          }
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
