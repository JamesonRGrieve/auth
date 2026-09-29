// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['STORYBOOK_TEST_PORT'] ?? 6007);
const ciFlag = process.env['CI'];
const isCI = ciFlag !== undefined && ciFlag !== '';
const CI_RETRIES = 2;

export default defineConfig({
  testDir: './tests/storybook',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? CI_RETRIES : 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
    browserName: 'chromium',
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory storybook-static`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !isCI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
