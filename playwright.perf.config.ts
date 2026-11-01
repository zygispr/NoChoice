import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: 'tests/perf',
  testMatch: '**/*.perf.spec.ts',
});
