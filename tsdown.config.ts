import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts', 'src/router.ts'],
  tsconfig: 'tsconfig.build.json',
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  deps: { neverBundle: [/^@usevibejs\//, /^better-auth(?:\/|$)/] },
});
