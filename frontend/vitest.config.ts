/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig, mergeConfig } from 'vite';
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const viteConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
} satisfies UserConfig;

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
        ],
      },
    },
  })
); 