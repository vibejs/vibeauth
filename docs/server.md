# Server middleware, session access and guards

```ts
const app = await VibeFactory.create(AppModule, {
  basePath: '/api',
  middleware: [createAuthMiddleware(auth)],
});
```

Mount before middleware that reads bodies or requires authentication. `/api/auth` and its
slash-delimited descendants are delegated; `/api/authentication` and `/api/auth-extra` pass
through. Unknown auth endpoints and unsupported methods receive Better Auth's own response.
The original Request is passed without consuming its body. The original Response is returned:
status, redirects, streams and multiple cookies remain Better Auth's responsibility. vibe.js
adds its normal request ID and suppresses HEAD bodies.

For a custom path, set Better Auth `basePath: '/identity'` and use the same middleware path.
The adapter detects disagreement with an explicitly configured Better Auth path. Path segments use letters, digits, underscores or hyphens. Paths are
absolute, independent of the vibe.js controller prefix, and have no trailing slash.

## Request-scoped session access

```ts
const identity = await getAuthSession(auth, ctx);
if (identity.authenticated) {
  console.log(identity.userId); // Only log identifiers when appropriate to your privacy policy.
}
const required = await requireAuthSession(auth, ctx); // throws HttpError(401, 'UNAUTHORIZED')
```

The inferred context exposes `authenticated`, `user`, `session`, `userId`, and `sessionId`.
Session credentials are omitted. Reads call Better Auth's real server validation with
`disableCookieCache: true` and `disableRefresh: true`. This prevents a cookie cache from
masking revocation and avoids discarded renewal cookies during business responses. The
native `/get-session` endpoint handles renewal. No process-wide session cache is introduced.

Reads are deduplicated for one RequestContext/auth source. After changing session security
state in that same request, call `getAuthSession(auth, ctx, { fresh: true })`. A database
outage propagates as an error, rather than silently granting optional access. Revalidation
cannot cancel a business transaction that was already authorized; make sensitive checks and
writes atomic when that guarantee is needed.

## Guards and dependency injection

```ts
const Authenticated = createAuthGuard(auth);
const Verified = createAuthGuard(auth, { verifiedEmail: true });
const Optional = createAuthGuard(auth, { optional: true });
const Owner = createAuthGuard(auth, {
  policy: async (identity, ctx) =>
    (await projects.findById(String(ctx.params.id)))?.ownerId === identity.userId,
});
// @UseGuards(Owner) on the business handler
```

Missing/invalid authentication throws 401. Authenticated permission failures throw 403.
A boolean `false` is not used for anonymous requests because vibe.js maps it to 403.
Combining optional authentication with a restriction still requires an authenticated session.
`allPolicies(...)` requires every supplied policy to grant access.

Use vibe.js `token<typeof auth>('Auth')` and `{ provide: Auth, useValue: auth }` when application
services need DI. Field-initialize `inject(Auth)` in providers; do not use global mutable auth
state or constructor metadata. VibeAuth does not augment RequestState globally: each app can
choose a typed field via vibe.js declaration merging and fill it from `getAuthSession`.

## Business mutation origins

Better Auth protects its own protocol endpoints. For cookie-authenticated business mutations,
apply `createMutationOriginGuard([externalOrigin])` after the authentication guard, as in the
account example. It allows GET/HEAD/OPTIONS and requires an exact Origin for unsafe methods.
This is an application request policy, not a replacement for Better Auth's protocol CSRF
checks. Non-browser mutation clients must send that configured Origin explicitly. Never use
GET for application mutations.
