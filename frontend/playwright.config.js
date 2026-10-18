import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.APP_URL || 'http://127.0.0.1:5173',
    channel: process.env.BROWSER_CHANNEL || 'msedge',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
});
