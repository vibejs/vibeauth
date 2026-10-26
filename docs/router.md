# Router integration

```ts
import { createAuthRouteGuard, safeReturnURL } from '@usevibejs/auth/router';
router.beforeEach(
  createAuthRouteGuard({
    auth,
    login: '/login',
    home: '/dashboard',
    verifyEmail: '/verify-email',
    forbidden: '/forbidden',
  }),
);
```

Route metadata is typed through vibe.js's public RouteMeta augmentation:

```ts
{ path: '/dashboard', component: Dashboard, meta: { auth: { mode: 'authenticated' } } }
{ path: '/login', component: Login, meta: { auth: { mode: 'guest' } } }
{ path: '/billing', component: Billing, meta: { auth: { verifiedEmail: true } } }
```

Absent metadata and `mode: 'public'` allow navigation without waiting. Guest/authenticated or
other restrictions wait for the initial session. Mount the auth plugin before router startup;
await `router.isReady()` before mounting protected page content. Children cannot weaken
parent restrictions. Errors cancel navigation, and a redirect back to the same path cancels
instead of looping. Discarded navigations and identities changed during asynchronous policies
cannot commit an older authorization result.

`permissions: ['project:update']` and `organization: true` require an `authorize(meta, to)`
callback. Without one they deny access. Load UX capabilities from a protected server endpoint;
client metadata/roles never authorize a business operation.

The login redirect preserves local `to.fullPath` in `returnTo`. After login:

```ts
await router.replace(safeReturnURL(route.query.returnTo, '/dashboard'));
```

`useRoute()` returns the reactive route object directly. Return URLs and fallbacks accept
local absolute paths only, rejecting protocol-relative destinations, backslashes, controls,
dot segments and ambiguous repeated encoding. The policy deliberately rejects encoded spaces
as well; invalid inputs use a sanitized fallback. Always validate values again before using
browser location APIs. After logout, clear sensitive caches, call native signOut, revalidate,
then navigate to a known local path.

A router guard improves navigation only. Every protected API must enforce authorization on
the server, even when the frontend page is hidden.
