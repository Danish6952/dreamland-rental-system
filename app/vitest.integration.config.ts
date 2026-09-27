import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Integration tests: run against the local stack (./supabase/local/stack.sh up)
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/integration/**/*.itest.ts'],
    setupFiles: ['src/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
