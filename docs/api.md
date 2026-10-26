# API reference

All exports are ESM with generated declarations and source maps. No default export.

## `@usevibejs/auth`

| Export                                         | Contract                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `createVibeAuthClient(options?)`               | Forwards inferred Better Auth vanilla options, returns a distinct adapter |
| `createAuthPlugin(auth)`                       | Native app plugin; provides and retains the instance until unmount        |
| `authKey`                                      | Typed core injection key                                                  |
| `provideAuth(auth)`                            | Override the nearest component subtree's instance                         |
| `useAuth()` / `useAuth(auth)`                  | Scoped core-injected / explicitly inferred adapter                        |
| `useSession()` / `useUser()`                   | Scoped computed refs; null when unavailable                               |
| `useIsAuthenticated()` / `useAuthStatus()`     | Scoped computed state                                                     |
| `VibeAuthClient`, `AuthState`, `ClientSession` | Client type contracts                                                     |
| `AuthStatus`, `SafeSession`, `SessionData`     | Shared type contracts                                                     |

Adapter members: `client`, `data`, `session`, `user`, `status`, `isAuthenticated`, `isPending`,
`error`, `mount(): release`, `ready(): Promise<void>`, `refreshSession(): Promise<void>`, and
inference-preserving `useAuth()`. Operations and plugin extensions stay under `client`.

## `@usevibejs/auth/server`

| Export                                                   | Contract                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createAuthMiddleware(auth, { basePath? }?)`             | vibe.js Fetch middleware; absolute path, defaults to configured Better Auth path or `/api/auth` |
| `getAuthSession(auth, ctx, { fresh? }?)`                 | Request-scoped inferred safe context; optional fresh validation                                 |
| `requireAuthSession(auth, ctx)`                          | Authenticated context or explicit 401                                                           |
| `createAuthGuard(auth, options?)`                        | No-argument CanActivate class for UseGuards/global guards                                       |
| `allPolicies(...policies)`                               | Every explicit policy must grant access                                                         |
| `createMutationOriginGuard(origins)`                     | Exact-origin guard for business mutations; safe methods pass                                    |
| `AuthHandler`, `SessionSource`, `AuthContext`            | Structural handler/source and discriminated safe request types                                  |
| `AuthGuardOptions`, `AuthPolicy`, `AuthenticatedContext` | Typed guard and policy contracts                                                                |

Guard options: `optional?: boolean`, `verifiedEmail?: boolean`, `policy?: (identity, ctx) =>
boolean | Promise<boolean>`. Auth failures throw vibe.js HttpError with 401/403. Infrastructure
errors propagate normally. No default declaration-merging side effects on RequestState.

## `@usevibejs/auth/router`

`createAuthRouteGuard({ auth, login?, home?, forbidden?, verifyEmail?, authorize? })` returns an
async native guard with path-only redirects, compatible with typed routers.
`AuthRouteMeta` supports `mode`, `verifiedEmail`, `permissions` and `organization`.
`AuthRouteGuardOptions` types policy configuration. `safeReturnURL(value, fallback?)`
returns a validated local path or sanitized fallback.

Errors prefixed `VIBEAUTH_` describe adapter configuration/lifecycle misuse: invalid/mismatched
paths, invalid origins, missing scope or missing injection. Credential errors remain native
Better Auth results, and protected business HTTP errors remain vibe.js problem responses.
