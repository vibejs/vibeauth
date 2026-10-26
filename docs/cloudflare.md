# Cloudflare Workers and D1

This deployment integration is **unverified**. No Worker build, workerd test, D1 migration or
Cloudflare deployment was run. A Node build is not evidence of Workers compatibility.

Better Auth 1.7.13's installed Kysely adapter detects D1 bindings directly and has a native D1
SQLite dialect. It also uses async context tracking. Upstream installation guidance specifies
`nodejs_compat` (or the narrower async-local-storage flag for a suitable runtime). Check the
compatibility date and flags for your Worker; do not import Node `DatabaseSync` there.
[Official installation guidance](https://better-auth.com/docs/installation).

For an experiment, create the Better Auth instance from the Worker's environment bindings,
set its database to the D1 binding, use an exact HTTPS external baseURL/trusted origin, and
read the auth secret from a Worker secret binding. Cache instances only when scoped to the
correct environment; never store request identity in module globals. Forward the original
Request/Response through the adapter. Validate vibe.js server runtime compatibility in workerd
before asserting this combination is supported.

Generate the schema for the exact enabled plugins with Better Auth's supported tooling,
review SQL, and apply it using D1's migration workflow first against a disposable local binding.
Separately test cookies, multiple Set-Cookie headers, concurrent requests, session revocation,
email/OAuth callbacks, origin checks and database persistence in workerd. Only then exercise a
staging Worker. There is no D1 driver fallback or production Worker configuration silently
selected by VibeAuth.
