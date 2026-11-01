import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['tests/setup.ts'],
      include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/index.ts',
          'src/popup/main.tsx',
          'src/**/*.test.{ts,tsx}',
          'src/**/*.d.ts',
        ],
        thresholds: { lines: 80 },
      },
    },
  }),
);
