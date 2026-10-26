import { defineConfig } from 'vite';
import { vibe } from '@usevibejs/compiler/vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  envDir: '../..',
  resolve: { dedupe: ['@usevibejs/ui'] },
  optimizeDeps: {
    include: [
      '@usevibejs/ui',
      '@usevibejs/ui/internal',
      '@usevibejs/form',
      '@usevibejs/query',
      '@usevibejs/contract',
      'valibot',
      'clsx',
      'tailwind-merge',
    ],
  },
  plugins: [vibe(), tailwindcss()],
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  build: { target: 'es2022', outDir: 'dist/ui' },
});
