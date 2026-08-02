import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'smoke.spec.mjs',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'smoke-results.json' }]],
  use: {
    viewport: { width: 1280, height: 900 },
    headless: true,
  },
});
