# 0001. Delegate security; adapt public framework APIs

Accepted, 2026-10-26.

Better Auth 1.7.13 was npm's latest stable release at investigation time (1.8.0-beta.2
was excluded). Pin the tested patch in development and constrain the peer to `~1.7.13`.
Update only after running the complete integration suite. The installed package exports,
declarations and executable source were checked, including vanilla `useSession` (a Nanostores
atom, not a framework hook), session revision cancellation, handler and migration APIs.

vibe.js 0.1.0 has public Fetch middleware, request context, HttpError, guard factories,
injection tokens, effect scopes, application unmount callbacks and router guards. Its
CONTRACTS.md and decisions 0001–0006 were reviewed. No integration code imports internal
or tooling runtime APIs. Compiler-generated `.vibe` code uses the framework's own ABI.
vibe.js currently supports client rendering only; this adapter does not promise SSR.

The browser entry imports only public UI and Better Auth vanilla APIs. Server uses only
public server APIs. Router imports UI types only and works with a structural auth state.
Better Auth and vibe.js are external peers. UI/server peers are optional because consumers
may use one entry independently; each chosen entry requires its corresponding peer.

The request cache is weakly keyed by RequestContext and then auth instance. Reads bypass
Better Auth's cookie cache and do not refresh, avoiding lost refresh cookies in controller
responses. Browser /get-session handles renewal. Explicit fresh reads follow same-request
security mutations. Revocation cannot cancel an already authorized in-flight business
transaction; applications must recheck in the transaction when that guarantee is required.

Policies load resource ownership and organization membership on the server. No parallel role
database, permission engine, auth controllers, cookie implementation or cryptography is added.

Vibecn's CONTRACTS.md, registry, CLI installer, primitives and examples were inspected.
Its installer accepts only bundled registry entries. Source compositions ship with examples,
separate from the runtime. VibeForm and VibeQuery public APIs were inspected; neither is a
core dependency. Their integration is optional and identity-aware.
