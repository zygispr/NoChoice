import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['tests/setup.ts'],
      benchmark: { include: ['tests/perf/**/*.bench.ts'] },
      coverage: { provider: 'v8' },
      // `extends: true` makes each project inherit the root environment and setupFiles.
      // Timing assertions live in their own project so `npm test` stays fast and deterministic.
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: [
              'tests/unit/**/*.test.ts',
              'tests/contract/**/*.test.ts',
              'src/**/*.test.{ts,tsx}',
            ],
          },
        },
        {
          extends: true,
          test: { name: 'perf', include: ['tests/perf/**/*.test.ts'] },
        },
      ],
    },
  }),
);
