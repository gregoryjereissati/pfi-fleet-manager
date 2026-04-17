import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@fleet-manager/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
