import { defineConfig } from '@playwright/test';
import path from 'node:path';

const python = process.env.PYTHON || path.resolve('../backend/.venv/bin/python');
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: '../docs/browser-junit.xml' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 1100 },
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: `"${python}" -m tests.serve_e2e`, cwd: '../backend', url: 'http://127.0.0.1:8001/api/health', reuseExistingServer: false, timeout: 30000 },
    { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174', env: { API_PROXY_TARGET: 'http://127.0.0.1:8001' }, reuseExistingServer: false, timeout: 30000 },
  ],
});
