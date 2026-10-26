import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const directory = await mkdtemp(join(tmpdir(), 'vibeauth-consumer-'));
function run(command: string, args: string[], cwd = directory) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  run('pnpm', ['exec', 'publint', '--strict'], root);
  run('pnpm', ['pack', '--pack-destination', directory], root);
  const tarball = (await readdir(directory)).find((file) => file.endsWith('.tgz'))!;
  const manifest = run('tar', ['-xOf', join(directory, tarball), 'package/package.json']);
  if (/file:|link:|workspace:|catalog:|\/Users\//.test(manifest))
    throw new Error('Nonportable published manifest.');
  const files = run('tar', ['-tzf', join(directory, tarball)])
    .split('\n')
    .filter(Boolean);
  if (
    files.some(
      (file) =>
        !/^package\/(dist\/|package.json$|LICENSE$|THIRD-PARTY-NOTICES.md$|README.md$)/.test(file),
    )
  )
    throw new Error('Unexpected package file.');
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        '@usevibejs/auth': `file:./${tarball}`,
        '@usevibejs/ui': '0.1.0',
        '@usevibejs/server': '0.1.0',
        'better-auth': '1.7.13',
        '@better-auth/passkey': '1.7.13',
      },
      devDependencies: { typescript: '7.0.2', '@types/node': '24.19.2' },
    }),
  );
  run('pnpm', ['install', '--ignore-scripts', '--config.manage-package-manager-versions=false']);
  await writeFile(
    join(directory, 'consumer.ts'),
    `
import { betterAuth } from 'better-auth';
import { organization, twoFactor } from 'better-auth/plugins';
import { organizationClient, twoFactorClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { createVibeAuthClient, useAuth } from '@usevibejs/auth';
import { createAuthMiddleware, createAuthGuard, getAuthSession } from '@usevibejs/auth/server';
import { createAuthRouteGuard } from '@usevibejs/auth/router';
import { createRouter, createMemoryHistory } from '@usevibejs/ui/router';
import type { RequestContext } from '@usevibejs/server';
const server = betterAuth({ plugins: [organization(), twoFactor()], user: { additionalFields: { plan: { type: 'string', required: true, input: false, defaultValue: 'free' } } } });
const adapter = createVibeAuthClient({ plugins: [organizationClient(), twoFactorClient(), passkeyClient(), inferAdditionalFields<typeof server>()] });
const typed = () => useAuth(adapter);
type IsAny<T> = 0 extends 1 & T ? true : false;
const plan: string | undefined = adapter.user.value?.plan;
const isAny: false = null! as IsAny<NonNullable<typeof adapter.user.value>['plan']>;
void plan; void isAny; void typed;
void adapter.client.organization.create({ name: 'Typed', slug: 'typed' });
void adapter.client.twoFactor.verifyTotp({ code: '123456' });
void adapter.client.passkey.addPasskey({ name: 'Device' });
createAuthMiddleware(server);
createAuthGuard(server, { policy: (identity) => identity.user.plan === 'pro' });
async function handle(ctx: RequestContext) { const identity = await getAuthSession(server, ctx); if (identity.authenticated) { const plan: string = identity.user.plan; void plan; } }
void handle;
const router = createRouter({ history: createMemoryHistory(), routes: [{path:'/',name:'home'},{path:'/private',name:'private',meta:{auth:{mode:'authenticated'}}}] });
router.beforeEach(createAuthRouteGuard({auth:adapter}));
`,
  );
  await writeFile(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        module: 'nodenext',
        target: 'es2022',
        lib: ['es2024', 'dom'],
        noEmit: true,
        skipLibCheck: true,
        types: ['node'],
      },
      include: ['consumer.ts'],
    }),
  );
  run('pnpm', ['exec', 'tsc', '--noEmit']);
  await writeFile(
    join(directory, 'server-only.ts'),
    `import {createAuthMiddleware} from '@usevibejs/auth/server'; const middleware = createAuthMiddleware({handler: async()=>new Response('ok')}); void middleware;`,
  );
  await writeFile(
    join(directory, 'tsconfig.server.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        module: 'nodenext',
        target: 'es2022',
        lib: ['es2024'],
        types: ['node'],
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['server-only.ts'],
    }),
  );
  run('pnpm', ['exec', 'tsc', '--project', 'tsconfig.server.json']);
  run(process.execPath, [
    '--input-type=module',
    '-e',
    "await import('@usevibejs/auth'); await import('@usevibejs/auth/server'); await import('@usevibejs/auth/router');",
  ]);
  await writeFile(
    join(directory, 'browser.ts'),
    `import {createVibeAuthClient} from '@usevibejs/auth'; import {safeReturnURL} from '@usevibejs/auth/router'; globalThis.auth = createVibeAuthClient(); console.log(safeReturnURL('/'));`,
  );
  const modules = new Set<string>();
  const previousSecret = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = 'VIBEAUTH_BROWSER_SECRET_SENTINEL';
  try {
    await build({
      root: directory,
      configFile: false,
      logLevel: 'warn',
      build: {
        lib: { entry: join(directory, 'browser.ts'), formats: ['es'], fileName: 'browser' },
        outDir: 'bundle',
        sourcemap: true,
      },
      plugins: [
        {
          name: 'audit-browser-graph',
          moduleParsed(info) {
            modules.add(info.id);
          },
        },
      ],
    });
  } finally {
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;
  }
  const forbidden = [...modules].filter((id) => {
    const marker = '/node_modules/';
    const path = id.includes(marker) ? id.slice(id.lastIndexOf(marker) + marker.length) : id;
    return /^(?:react|react-dom|vue)(?:\/|$)|node:|^@usevibejs\/server(?:\/|$)|^drizzle|^kysely|^better-auth\/dist\/(?:api|auth|db)\/|^@better-auth\/(?:core\/dist\/db|[^/]*adapter)/.test(
      path,
    );
  });
  if (forbidden.length) throw new Error(`Server modules in browser graph: ${forbidden.join(', ')}`);
  const uiRoots = new Set(
    [...modules]
      .filter((id) => id.includes('@usevibejs/ui/dist/'))
      .map((id) => id.split('/dist/')[0]),
  );
  if (uiRoots.size !== 1) throw new Error(`Expected one vibe.js runtime, found ${uiRoots.size}.`);
  const javascript = (await readdir(join(directory, 'bundle'))).filter((file) =>
    file.endsWith('.js'),
  );
  for (const file of javascript) {
    const source = await readFile(join(directory, 'bundle', file), 'utf8');
    if (
      /VIBEAUTH_BROWSER_SECRET_SENTINEL|node:sqlite|DatabaseSync|disposable-example-check-secret/.test(
        source,
      )
    )
      throw new Error('Server secret value or database implementation leaked into browser bundle.');
  }
  console.info(
    `Packed consumer passed: ESM entries, plugin/custom field declarations, Node-only server types, browser graph (${modules.size} modules; one Vibe runtime).`,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
