import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/test-helpers/env-de-teste.ts'],
    // O build da API compila os testes para dist/; desde o Vitest 4 a pasta não
    // é mais ignorada por padrão, e as cópias em CommonJS falham ao carregar.
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
  resolve: {
    alias: {
      '@fleet-manager/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
});
