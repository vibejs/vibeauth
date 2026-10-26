import { resolve } from 'node:path';
import { vibe } from '@usevibejs/compiler/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const alias = [
  { find: '@usevibejs/auth/server', replacement: resolve('src/server.ts') },
  { find: '@usevibejs/auth/router', replacement: resolve('src/router.ts') },
  { find: '@usevibejs/auth', replacement: resolve('src/index.ts') },
];

export default defineConfig({
  test: {
    projects: [
      {
        oxc: { decorator: { legacy: true } },
        resolve: { alias, dedupe: ['@usevibejs/ui'] },
        optimizeDeps: {
          include: [
            '@usevibejs/ui',
            '@usevibejs/ui/internal',
            '@usevibejs/form',
            'clsx',
            'tailwind-merge',
            'better-auth/client',
          ],
        },
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['test/**/*.integration.test.ts'],
          setupFiles: ['test/setup.ts'],
          testTimeout: 45000,
          hookTimeout: 45000,
        },
      },
      {
        oxc: { decorator: { legacy: true } },
        resolve: { alias, dedupe: ['@usevibejs/ui'] },
        optimizeDeps: {
          include: [
            '@usevibejs/ui',
            '@usevibejs/ui/internal',
            '@usevibejs/form',
            'clsx',
            'tailwind-merge',
            'better-auth/client',
          ],
        },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/server/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: ['**/*.integration.test.ts', '**/*.vibe.test.ts', '**/*.browser.test.ts'],
          setupFiles: ['test/setup.ts'],
          testTimeout: 15000,
        },
      },
      {
        oxc: { decorator: { legacy: true } },
        resolve: { alias, dedupe: ['@usevibejs/ui'] },
        optimizeDeps: {
          include: [
            '@usevibejs/ui',
            '@usevibejs/ui/internal',
            '@usevibejs/form',
            'clsx',
            'tailwind-merge',
            'better-auth/client',
          ],
        },
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/client/**/*.test.ts', 'src/router/**/*.test.ts'],
          setupFiles: ['test/setup.ts'],
        },
      },
      {
        oxc: { decorator: { legacy: true } },
        resolve: { alias, dedupe: ['@usevibejs/ui'] },
        optimizeDeps: {
          include: [
            '@usevibejs/ui',
            '@usevibejs/ui/internal',
            '@usevibejs/form',
            'clsx',
            'tailwind-merge',
            'better-auth/client',
          ],
        },
        plugins: [vibe()],
        test: {
          name: 'integration',
          environment: 'jsdom',
          include: ['test/**/*.vibe.test.ts'],
          setupFiles: ['test/setup.ts'],
        },
      },
      {
        oxc: { decorator: { legacy: true } },
        resolve: { alias, dedupe: ['@usevibejs/ui'] },
        optimizeDeps: {
          include: [
            '@usevibejs/ui',
            '@usevibejs/ui/internal',
            '@usevibejs/form',
            'clsx',
            'tailwind-merge',
            'better-auth/client',
          ],
        },
        plugins: [vibe()],
        define: { __DEV__: 'true' },
        test: {
          name: 'browser',
          include: ['test/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test-d.ts'],
      thresholds: { 100: true, perFile: true },
    },
  },
});
