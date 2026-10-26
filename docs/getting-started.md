# Installation and quick start

Use Node `^24.15.0 || >=26` and pnpm 11.18.0. Match the vibe.js runtime/compiler at 0.1.0.
Better Auth 1.7.13 is the tested stable release. Install VibeAuth with Better Auth and the
vibe.js peer for the entry you use.

```sh
pnpm add @usevibejs/auth better-auth@1.7.13 @usevibejs/ui@0.1.0
# Server applications also install @usevibejs/server@0.1.0.
```

Create your Better Auth instance using the application's chosen database and email transport.
[The basic server config](https://github.com/vibejs/vibeauth/blob/main/examples/basic/server/auth.ts)
shows the complete SQLite setup. The adapter receives that instance; it does not replace
Better Auth configuration.

```ts
import { createAuthMiddleware, createAuthGuard } from '@usevibejs/auth/server';
import { VibeFactory } from '@usevibejs/server';
const Authenticated = createAuthGuard(auth);
const app = await VibeFactory.create(AppModule, {
  basePath: '/api',
  middleware: [createAuthMiddleware(auth)],
});
```

The middleware path is already `/api/auth`; the controller `basePath` is not prepended.
Use `@UseGuards(Authenticated)` on protected controllers and enforce resource policies there.

```ts
import { createVibeAuthClient, createAuthPlugin } from '@usevibejs/auth';
import { createApp } from '@usevibejs/ui';
const auth = createVibeAuthClient();
createApp(App).use(createAuthPlugin(auth)).mount('#app');
```

Inside `.vibe` setup, call `const state = auth.useAuth()`. Read `state.user.value` and
`state.status.value`, and call `state.client.signIn.email({ email, password })`. Better Auth
operations return typed `{ data, error }` results. Keep pending UI until initial validation
resolves. [Client guide](client).

## Run the basic example

From this repository:

```sh
pnpm install
pnpm build
pnpm examples:build
cp .env.example .env
pnpm exec auth secret
```

Replace `BETTER_AUTH_SECRET` in `.env` with the generated value. The explicit local mail
transport is loopback-only. Its private `.local/outbox.jsonl` file contains delivery links;
open those links locally. It is not a public endpoint or production mail provider.

```sh
pnpm --filter vibeauth-basic migrate
# Review examples/basic/migration.sql, then explicitly apply to the configured local database:
pnpm --filter vibeauth-basic migrate --apply
pnpm --filter vibeauth-basic start:server
# In another terminal:
pnpm --filter vibeauth-basic dev
```

Open `http://127.0.0.1:5173`. Register, open the verification email link from the outbox,
sign in, update your profile and sign out. Recovery links use the same outbox. Restarting
the server preserves the example database; migrations never run on server startup.

For SaaS, set URL and trusted origin to `http://localhost:5174`, use the `vibeauth-saas`
filter, and repeat migration/start/dev. Its API port defaults to 3002 instead of 3001.
Do not reuse one database between the two examples; enabled plugin schemas differ.
