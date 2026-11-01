import { defineConfig } from 'vite';

// Content script build. Runs after the popup build and writes into the same dist/.
export default defineConfig(({ mode }) => ({
  publicDir: false,
  // console.debug is for local diagnostics only (plan § Complexity Tracking).
  esbuild: mode === 'production' ? { pure: ['console.debug'] } : {},
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/content/main.ts',
      formats: ['iife'],
      name: 'NoChoice',
      fileName: () => 'content.js',
      cssFileName: 'content',
    },
  },
}));
