# Troubleshooting

## Everything under /api/auth returns 404

Match Better Auth and middleware base paths. The mount is absolute; `/api` from the vibe.js
controller option is not prepended again. Place auth middleware before body-consuming or
auth-required middleware. Confirm your reverse proxy forwards the original callback URL and
all methods. Unknown Better Auth endpoint names remain Better Auth errors; do not add custom
auth controllers to hide the mismatch.

## Session is always null

Check the external base URL, browser cookie policy, HTTPS/Secure alignment, exact trusted
origins and frontend credentials. Check the official `/get-session` response. Do not copy a
session token into JavaScript storage. Verify migrations include all enabled plugins and the
request reaches the same persistent database that issued the cookie.

## Sign-in returns forbidden

Check email verification, request Origin, callback URL and rate limiting. Never set protection
disable flags to fix it. The explicit local outbox works only for loopback; production requires
an actual email delivery service. Business mutations using the origin guard require an exact
Origin header, including non-browser clients.

## useAuth throws a scope/context error

Install the plugin before mounting, then call composables in component setup or an effect
scope. `provideAuth` affects descendants. For library helpers outside a scope, use instance
properties and hold/release `auth.mount()`. For inferred plugin fields, use `auth.useAuth()`
or `useAuth(auth)` instead of guessing a generic injection type.

## Protected page flashes or redirects too early

Install auth before the router, await `router.isReady()`, and keep initial loading distinct
from unauthenticated. Register the guard before initial navigation. Provide real public login,
verification and forbidden routes. A misconfigured redirect back to a restricted destination
cancels instead of looping. APIs still require their own guards.

## Browser state does not update

Check that all components use the same installed client and one vibe.js runtime. Do not
bundle a second UI copy or call a React/Vue Better Auth hook. Avoid `disableSignal` on native
actions unless you explicitly revalidate. Plugin actions must use matching official client
plugins. Disposed scopes must be remounted to subscribe again.

## Passkey UI is disabled

Use a secure context and a browser with WebAuthn support. Match RP ID and origin, and check
that an actual authenticator is available. A cancelled ceremony is not evidence of a server
failure. Virtual Chromium verification does not establish every platform's behavior.

## Optional dependencies cannot be installed

Run `pnpm install` again; the examples install `@usevibejs/form` and `@usevibejs/query` from npm.
Do not publish a manifest with local file/link specs. Core package consumers do not need those
optional libraries.
