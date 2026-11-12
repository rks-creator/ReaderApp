/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages liefert die App unter /<repo>/ aus; der Deploy-Workflow setzt BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'ReaderApp',
        short_name: 'Reader',
        description: 'Englische Bücher lesen – Wort antippen, Übersetzung sehen.',
        lang: 'de',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f7f3ea',
        theme_color: '#f7f3ea',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // UC-006: App-Shell und das gesamte Wörterbuch für den Offline-Betrieb vorhalten.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'dict/*.json'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
