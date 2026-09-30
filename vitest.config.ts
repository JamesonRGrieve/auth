// SPDX-License-Identifier: AGPL-3.0-or-later
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'storybook-static/**', 'tests/storybook/**'],
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**', '**/*.stories.*', '**/*.test.*', 'src/**/index.ts'],
    },
  },
});
