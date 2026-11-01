import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Popup build. The content script has its own config (vite.content.config.ts) because content
// scripts must be classic IIFE scripts, while the popup is built as ES modules.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // The polyfill is the only network code in the bundle, and extension pages don't need it.
    modulePreload: { polyfill: false },
    rollupOptions: { input: { popup: 'src/popup/index.html' } },
  },
});
