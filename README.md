# VibeAuth

**Authentication, Native to Vibe.js**

`@usevibejs/auth` connects Better Auth to Vibe.js Fetch middleware, native fine-grained
reactivity, dependency injection, router guards and typed business APIs. Better Auth owns
passwords, cookies, sessions, OAuth and authentication plugins. VibeAuth does not create
another authentication engine.

This is an independent MIT-licensed repository. The npm package has not been published,
and no service has been deployed.
The tested baseline is Better Auth **1.7.13**, Vibe.js **0.1.0**, and Node **24.22.1**.
There is no claim of an independent security audit.

```ts
// Server: auth is your configured Better Auth instance.
import { createAuthMiddleware, createAuthGuard } from '@usevibejs/auth/server';
const Authenticated = createAuthGuard(auth);
const app = await VibeFactory.create(AppModule, {
  basePath: '/api',
  middleware: [createAuthMiddleware(auth)],
});
// Apply @UseGuards(Authenticated) to protected business controllers.
```

```ts
// Browser
import { createVibeAuthClient, createAuthPlugin } from '@usevibejs/auth';
const auth = createVibeAuthClient();
createApp(App).use(createAuthPlugin(auth)).mount('#app');
// In component setup: const state = auth.useAuth()
// state.user.value / state.status.value / state.client.signIn.email(...)
```

The three entries are isolated: `@usevibejs/auth`, `@usevibejs/auth/server`, and
`@usevibejs/auth/router`. Vibe.js and Better Auth are external peers. Vibecn, VibeForm and
VibeQuery are optional example integrations.

## Local development

The optional form/query examples use local 0.1.0 tarballs because VibeQuery was not in the
npm registry during development. With the sibling `vibeform` and `vibequery` repositories
built, run:

```sh
node scripts/bootstrap.ts
pnpm install
pnpm build
pnpm check
pnpm test:integration
pnpm examples:check
pnpm examples:build
pnpm examples:verify
pnpm docs:build
pnpm pack-check
```

`bootstrap` packs existing local builds; it does not clone, publish or edit their source.
The resulting development tarballs are ignored by Git and never enter the auth package.
See [getting started](docs/getting-started.md) to run either complete example, and
[verification](docs/verification.md) for exactly what is tested.
The [delivery report](DELIVERY.md) records the implemented scope, measured checks and limitations.

## Guides

- [Client and native composables](docs/client.md)
- [Server middleware, session access and guards](docs/server.md)
- [Authorization and tenant isolation](docs/authorization.md)
- [Security and threat model](docs/security.md)
- [Database migrations](docs/databases.md)
- [API reference](docs/api.md)

Build the searchable, responsive documentation website with `pnpm docs:build`.
