import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false,
    setupFiles: ['tests/setup-jsdom-storage.ts'],
    environmentMatchGlobs: [['tests/state/persist.test.ts', 'jsdom']],
  },
});
