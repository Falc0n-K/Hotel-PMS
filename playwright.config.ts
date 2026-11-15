import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Tests navigateur des parcours principaux, contre une API Supabase entièrement
// simulée (e2e/support/mockSupabase.ts) : aucune base réelle n'est contactée.
// L'application est construite avec une URL Supabase factice, puis servie par
// `vite preview` sur le port 4173.

const PORT = 4173;

// Chromium préinstallé (conteneurs de développement) : utilisé seulement s'il
// est présent ou désigné par PW_CHROMIUM_PATH. En CI, `npx playwright install`
// fournit le navigateur attendu par la version épinglée.
const preinstalled = '/opt/pw-browsers/chromium';
const executablePath = process.env.PW_CHROMIUM_PATH || (existsSync(preinstalled) ? preinstalled : undefined);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Africa/Dakar',
    // Le service worker de la PWA servirait des requêtes hors de page.route.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'fr-FR',
        viewport: { width: 1440, height: 900 },
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Lues au moment du build par Vite (import.meta.env).
    env: {
      VITE_SUPABASE_URL: 'https://mock.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_SENTRY_DSN: '',
      VITE_APP_ENV: '',
      VITE_TURNSTILE_SITE_KEY: '',
    },
  },
});
