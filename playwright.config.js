import { defineConfig } from '@playwright/test';
import path from 'node:path';

const uiPort = Number(process.env.PLAYWRIGHT_PORT) || 5174;
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT) || 3101;
const baseURL = `http://127.0.0.1:${uiPort}`;

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: { baseURL, channel: 'msedge', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node server/index.js', url: `http://localhost:${apiPort}/api/health`, env: { PORT: String(apiPort), APP_URL: baseURL, NODE_ENV: 'test', MONGODB_URI: '', DATA_FILE: path.resolve(`test-results/browser-data-${Date.now()}.json`), JWT_SECRET: 'browser-test-isolated-stable-session-secret', DEMO_BILLING: 'true', STRIPE_SECRET_KEY: '' }, reuseExistingServer: false },
    { command: `npx vite client --host 127.0.0.1 --port ${uiPort} --strictPort`, url: baseURL, env: { API_PORT: String(apiPort) }, reuseExistingServer: false },
  ],
});
