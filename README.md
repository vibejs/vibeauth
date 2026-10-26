# VibeAuth

**Authentication, Native to Vibe.js**

`@usevibejs/auth` connects Better Auth to [Vibe.js](https://vibejs.org) Fetch middleware, native
fine-grained reactivity, dependency injection, router guards and typed business APIs. Better Auth
owns passwords, cookies, sessions, OAuth and authentication plugins. VibeAuth does not create
another authentication engine.

The tested baseline is Better Auth **1.7.13**, Vibe.js **0.1.0**, and Node **24.22.1**.
There is no claim of an independent security audit.

## Install

```sh
pnpm add @usevibejs/auth better-auth
# Server entry: pnpm add @usevibejs/server   Browser entries: pnpm add @usevibejs/ui
```

`better-auth` is a required peer. `@usevibejs/server` and `@usevibejs/ui` are optional peers for
the entries that use them.

## Quick start

```ts
// Server: auth is your configured Better Auth instance.
import { VibeFactory } from '@usevibejs/server';
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
import { createApp } from '@usevibejs/ui';
import { createVibeAuthClient, createAuthPlugin } from '@usevibejs/auth';
const auth = createVibeAuthClient();
createApp(App).use(createAuthPlugin(auth)).mount('#app');
// In component setup: const state = auth.useAuth()
// state.user.value / state.status.value / state.client.signIn.email(...)
```

## Entries

The three entries are isolated: `@usevibejs/auth`, `@usevibejs/auth/server`, and
`@usevibejs/auth/router`. Vibe.js and Better Auth are external peers. Vibecn, VibeForm and
VibeQuery are optional example integrations.

## Documentation

- [Getting started](docs/getting-started.md)
- [Client and native composables](docs/client.md)
- [Server middleware, session access and guards](docs/server.md)
- [Router guards](docs/router.md)
- [Authorization and tenant isolation](docs/authorization.md)
- [Security](docs/security.md) and [threat model](docs/threat-model.md)
- [Database migrations](docs/databases.md)
- [Deployment](docs/deployment.md)
- [API reference](docs/api.md)
- [Verification](docs/verification.md)

Build the searchable, responsive documentation website with `pnpm docs:build`.
The [delivery report](DELIVERY.md) records the implemented scope, measured checks and limitations.

## Local development

```sh
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

`pnpm verify` runs the full sequence.

## Releases

Releases use changesets. Add a changeset with `pnpm changeset` for every user-visible change. A
maintainer runs the Release workflow from main, which opens a release PR and publishes to npm
through trusted publishing.

## The vibe.js family

| Package                                                   | Description                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [vibe.js](https://github.com/vibejs/vibejs)               | The framework: .vibe components, server and typed contracts |
| [@usevibejs/auth](https://github.com/vibejs/vibeauth)     | Authentication with Better Auth                             |
| [@usevibejs/form](https://github.com/vibejs/vibeform)     | Type-safe forms with TanStack Form                          |
| [@usevibejs/motion](https://github.com/vibejs/vibemotion) | Animations, gestures and layout with Motion                 |
| [@usevibejs/query](https://github.com/vibejs/vibequery)   | Async state and data fetching with TanStack Query           |
| [@usevibejs/table](https://github.com/vibejs/vibetable)   | Headless tables with TanStack Table                         |
| [@usevibejs/use](https://github.com/vibejs/vibeuse)       | Essential composables                                       |
| [vibecn](https://github.com/vibejs/vibecn)                | shadcn/ui components as .vibe source                        |

## License

MIT. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
