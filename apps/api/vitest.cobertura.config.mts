import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

/**
 * Cobertura com as duas suítes juntas: a padrão (unitários e integração) e a
 * de ponta a ponta. Só a soma mostra o código que algum teste executa — a
 * camada HTTP, por exemplo, só é percorrida pela de ponta a ponta.
 *
 * Exige o Supabase local no ar, como a suíte de ponta a ponta.
 *   npx vitest run --config vitest.cobertura.config.mts --coverage
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/test-helpers/env-de-teste.ts'],
    include: ['src/**/*.test.ts', 'e2e/**/*.e2e.ts'],
    exclude: [...configDefaults.exclude, 'dist/**'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/test-helpers/**', 'src/types/**'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
  resolve: {
    alias: {
      '@fleet-manager/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
});
