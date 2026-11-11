import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser',
  workers: 1,
  reporter: 'list',
  outputDir: '.evidence/browser',
  use: { baseURL: 'http://127.0.0.1:4188', channel: 'chrome', launchOptions: { chromiumSandbox: true }, viewport: { width: 1280, height: 960 } },
  webServer: { command: 'npm run dev -- --port 4188 --strictPort', url: 'http://127.0.0.1:4188', reuseExistingServer: !process.env.CI },
});
