# VibeAuth delivery report

Local package: `@usevibejs/auth@0.1.0`. License: MIT. Tagline: **Authentication, Native to Vibe.js**.

This report records implemented behavior and local verification. It does not claim an
independent security audit, successful external provider authentication, or a deployed service.

## 1. Better Auth version

Better Auth **1.7.13**, with matching official passkey and Drizzle adapter packages, is the
verified baseline. It was selected from the stable npm release channel; the 1.8 beta was
excluded. The peer range is `~1.7.13`. Vibe.js peers use `^0.1.0`.

## 2. Architecture

Better Auth owns authentication protocols, password hashing, cookies, persistence, tokens,
session verification and optional plugins. VibeAuth adds Fetch middleware, request-scoped
identity, guards, a native reactive client and optional router integration. Vibecn compositions
live in the examples and remain editable application source. The browser, server and router
entries are separate ESM exports; no application UI library is a runtime dependency.

## 3. Public package APIs

| Entry                    | APIs                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@usevibejs/auth`        | `createVibeAuthClient`, `createAuthPlugin`, `provideAuth`, `authKey`, `useAuth`, `useSession`, `useUser`, `useIsAuthenticated`, `useAuthStatus` |
| `@usevibejs/auth/server` | `createAuthMiddleware`, `getAuthSession`, `requireAuthSession`, `createAuthGuard`, `allPolicies`, `createMutationOriginGuard`                   |
| `@usevibejs/auth/router` | `createAuthRouteGuard`, `safeReturnURL`                                                                                                         |

Public declarations include inferred client, safe session, request identity, policy and route
metadata types. The untouched `.client` exposes Better Auth operations and plugin extensions.
Instance-bound composables preserve configured custom fields and plugin inference; default
dependency-injected composables expose the core identity shape.

## 4. Authentication methods

Real tests exercise email/password registration, sign-in, sign-out, verification, password
recovery and password changes, including session revocation. Optional TOTP, backup codes,
trusted-device behavior and passkeys are tested through official plugins. Google, GitHub and
Apple configuration is documented; no external OAuth exchange is claimed.

## 5. Server middleware

The middleware mounts the original Better Auth handler at the exact configured absolute path
(default `/api/auth`) and its slash-delimited descendants. It forwards the original Request
and returns the original Response, preserving bodies, streams, redirects, query parameters,
cookies and multiple `Set-Cookie` headers. Actual `VibeFactory` application `fetch` tests cover
mounting, ordering and unrelated routes with the Vibe.js `/api` controller prefix.

Request identity is validated through Better Auth, deduplicated only within the same request
context and auth source, and stripped of raw session tokens. Cookie-cache bypass preserves
revocation checks; read-only business lookups leave renewal to the official session endpoint.

## 6. Client reactivity

The client bridges the public vanilla session atom into Vibe.js `shallowRef`, `computed`,
`watch` and effect scopes. One reference-counted subscription serves each client instance.
Application installation, subtree overrides and scope disposal use public provide/inject
APIs. Loading, authenticated, unauthenticated, refreshing, error and expired states are
distinct. Better Auth remains responsible for fetch ordering and session notifications;
VibeAuth does not persist credentials or create a second session cache.

## 7. Authorization

Server guards distinguish missing authentication (`401`) from denied access (`403`). Optional
authentication, verified email and async resource policies are supported. The SaaS example
uses official Organization/Admin access controls with trusted membership checks and SQL
queries scoped by both organization and resource. Tests reject role escalation, cross-user
session revocation and cross-tenant reads/writes. Router restrictions are explicitly UX only.

## 8. Databases

Both examples use SQLite with official Better Auth migrations, including enabled plugin
models. Migration generation and explicit application are separate commands; startup never
migrates an unknown database. A second real integration exercises the official Drizzle
adapter against PGlite's embedded PostgreSQL with generated schema/migrations. Network
PostgreSQL, MySQL and Prisma are documented but not exercised. Workers/D1 is unverified.

## 9. Vibecn integration

The examples copy existing Vibecn primitives and tokens with their license. Functional `.vibe`
compositions cover credentials, recovery, account/profile/password changes, session management,
OAuth configuration, TOTP, passkeys and organizations/members. They include responsive light
and dark layouts, password visibility, loading/disabled states and accessible field feedback.
These are repository compositions, not new published Vibecn CLI registry entries.

VibeForm handles credential form state and validation. VibeQuery loads protected profiles with
identity-scoped keys and cancellation/cache clearing on identity changes. Both remain optional.

## 10. Optional plugins

Two-Factor, Passkey, Organization (with teams) and Admin remain native Better Auth plugins.
Tests cover TOTP enrollment/verification, intermediate unauthenticated challenges, single-use
backup codes, trusted devices, disablement, virtual-authenticator passkey ceremonies,
organization invitations/membership/roles and native team membership operations. There is
no separate team administration UI or general user administration console.

Two-Factor's credential-flow enforcement does not automatically gate OAuth or passkey sessions.
Application assurance policies must account for that documented limitation.

## 11. Actual verification results

`pnpm verify` passed locally on Node **24.22.1** and pnpm **11.18.0**:

| Gate                                                            | Result                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Strict TypeScript, Oxlint and formatting (including `.vibe`)    | Passed                                                                            |
| Node, DOM and Chromium test projects                            | 38 tests passed across 12 files                                                   |
| Compiled `.vibe` and HTTP end-to-end integration projects       | 4 tests passed across 2 files                                                     |
| Runtime coverage                                                | 100% statements (224/224), branches (189/189), functions (56/56), lines (184/184) |
| Basic and SaaS template/server type checks and builds           | Passed                                                                            |
| Built example startup with disposable migrated SQLite databases | Passed                                                                            |
| VitePress documentation build                                   | Passed                                                                            |
| Strict package validation and independent packed consumer       | Passed                                                                            |

The **42 tests** include real authentication mechanisms rather than mocked cryptographic
verification. Chromium runs real HTTP/cookie flows; WebAuthn uses a virtual CTAP2 authenticator.
The included CI workflow has not been executed remotely as part of this local delivery.

## 12. Security verification

Tests cover invalid/forged/expired/revoked sessions, access after logout, concurrent request
isolation, CSRF, rejected origins, unsafe callbacks, forged OAuth state, credential rate
limiting, verification/reset token use, secure cookie attributes, privilege escalation,
tenant isolation and client/navigation races. Origin and CSRF checks remain enabled, including
in tests. Business mutation origin enforcement is separate from Better Auth's own protection.

Both full and production dependency audits reported **zero advisories** at verification time.
The threat model connects threats to mechanisms and tests. Deployment guidance covers exact
origins, secret handling, cookie settings, proxy body limits and sensitive log redaction.
Coverage and dependency audits are not independent security certification.

## 13. Browser bundles and packaging

The package builds ESM declarations and source maps with tsdown. Strict publint, packed
manifest/file checks, an outside-workspace installation, all-entry ESM imports, custom-field
and plugin type inference, and server-only Node typing pass. The independent consumer browser
graph contains **57 modules and one Vibe.js runtime**, with no server/database drivers,
React/Vue modules or injected secret value. No local development paths enter the packed manifest.
Changesets, dependency license inventory and third-party notices are included.

## 14. Known limitations

- Real Google/GitHub/Apple exchanges and provider account linking require configured credentials and manual verification.
- External email/OTP/SMS delivery, physical authenticators and Safari/Firefox/mobile WebAuthn are untested.
- Network PostgreSQL, MySQL, Prisma and Workers/D1 were not exercised.
- SSR/hydration, general Admin UI and team administration UI are not advertised.
- Revocation cannot undo already authorized in-flight writes; transaction-bound authorization remains application-owned.
- This library has not received an independent security audit.

See [verification and limits](docs/verification.md) for the maintained verification baseline.

## 15. Local commits and delivery

| Commit    | Change                                                              |
| --------- | ------------------------------------------------------------------- |
| `462ca7f` | Native server and reactive client foundation                        |
| `304105a` | Typed Vibe.js router compatibility                                  |
| `3932917` | Verified advanced authentication, real examples and package tooling |
| `d2139cc` | Local merge of verified implementation into `main`                  |

Documentation and this report are committed separately and merged into local `main`; use
`git log --oneline` for their final hashes. Pre-publication commit email metadata was converted
to the account's GitHub noreply address before publication to preserve email privacy;
commit subjects, bodies, names, dates and implementation trees were preserved.

The initial local verification performed no remote operations. The separately authorized
GitHub publication targets [vibejs/vibeauth](https://github.com/vibejs/vibeauth). No npm package
publication, service deployment or production authentication change is included.
