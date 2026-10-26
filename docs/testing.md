# Testing and TypeScript

`pnpm verify` runs the complete local gate: build, formatting, strict types, oxlint, 100%
per-file runtime coverage, Chromium, compiled component integration, real browser end-to-end
flows, example template checks/builds/startup, docs build and packed consumer verification.
Install Chromium with `pnpm exec playwright install chromium` when the browser is unavailable.

| Command                 | Scope                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `pnpm test`             | Node integration/security tests and DOM client/router unit tests                       |
| `pnpm test:coverage`    | Node, DOM and Chromium projects; V8, 100% each runtime source file                     |
| `pnpm test:browser`     | Real compiled `.vibe` form and state behavior in Chromium                              |
| `pnpm test:integration` | Compiled component DI/lifecycle plus real HTTP browser examples/WebAuthn               |
| `pnpm examples:check`   | Actual TypeScript 7.1 content mapper checks of `.vibe` templates and server types      |
| `pnpm examples:build`   | Production Vite frontend and tsdown server output                                      |
| `pnpm examples:verify`  | Disposable SQLite migration, built server startup, handler and anonymous API rejection |
| `pnpm pack-check`       | publint, tarball inspection, independent install/types/imports and browser graph       |

The Node fixtures use Better Auth, official migration tooling and real SQLite. Origin/CSRF
protection is explicitly enabled even under test. They exercise success and failure paths,
including cookie cache revocation. Advanced plugins use actual native endpoints. The Drizzle
fixture uses generated schema/SQL and an isolated embedded PostgreSQL engine. Client unit
tests simulate HTTP outcomes through the official vanilla client's fetch option; they do not
claim to verify server cryptography.

## Types

The runtime uses strict TypeScript 7.0.2. Example `.vibe` templates use the ecosystem's pinned
7.1 content-mapper nightly. No ambient `declare module '*.vibe'` suppresses checking.
Server decorators use the supported legacy transform without metadata. Test Oxc explicitly
enables the same transform for cross-workspace server fixtures.

Instance-bound composables and explicit `useAuth(auth)` preserve client plugin/custom field
inference. The default DI composables intentionally expose core types. The packed consumer
checks custom fields are concrete types (not `any`), native plugin methods remain callable,
server policies infer fields, typed routers accept the guard, and the server entry type-checks
without DOM libraries. Browser entry module graphs must contain exactly one Vibe runtime and
no server/database modules or injected server-secret sentinel values.

For inferred application fields, import the server instance as a type, so it cannot enter the browser graph:

```ts
import type { auth as serverAuth } from '../server/auth.ts';
import { inferAdditionalFields } from 'better-auth/client/plugins';
const auth = createVibeAuthClient({ plugins: [inferAdditionalFields<typeof serverAuth>()] });
```
