import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Use node environment by default; jsdom for component tests
    environment: 'node',
    environmentMatchGlobs: [
      // Use jsdom for React component tests
      ['**/__tests__/components/**/*.test.tsx', 'jsdom'],
      ['**/__tests__/integration/**/*.test.tsx', 'jsdom'],
    ],
    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.test.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/compliance/**/*.ts',
        'lib/validations/**/*.ts',
        'app/(auth)/actions.ts',
      ],
      exclude: [
        'lib/compliance/__tests__/**',
        'lib/compliance/index.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
