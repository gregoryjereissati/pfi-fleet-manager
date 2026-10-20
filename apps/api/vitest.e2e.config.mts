import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

/**
 * Suíte de ponta a ponta, separada da padrão: ela grava no banco e precisa do
 * Supabase local no ar (`npx supabase start`). Ver `e2e/helpers.ts`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['e2e/**/*.e2e.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@fleet-manager/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
});
