import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['server/main.ts', 'server/migrate.ts'],
  outDir: 'dist/server',
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  sourcemap: true,
  outExtensions: () => ({ js: '.js' }),
  tsconfig: 'tsconfig.server.json',
});
