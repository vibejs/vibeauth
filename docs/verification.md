# Verification and limits

The exact tested baseline is Better Auth / official passkey / Drizzle adapter **1.7.13**,
Vibe.js **0.1.0**, Node **24.22.1**, pnpm **11.18.0**, Vitest **5.0.5**, and Chromium supplied
by Playwright **1.64.1**. Better Auth 1.7.13 was the stable npm dist-tag at selection time;
1.8 beta was excluded. Compatibility outside the declared peer ranges is not promised.

Runtime coverage is enforced at 100% statements, branches, functions and lines per file.
The completed local `pnpm verify` run passed **42 tests**: 38 across the Node/DOM/Chromium
projects and 4 compiled-component/HTTP integration tests. Coverage measured **224/224
statements, 189/189 branches, 56/56 functions and 184/184 lines**. Strict typing, linting,
formatting, both example builds/startups, documentation and packed-consumer gates passed.
Full and production dependency audits reported zero advisories at verification time.

The suite includes real handler forwarding and VibeFactory.fetch, registration/login/logout,
email verification/recovery, expiry/revocation, secure cookies, forged sessions, origin/CSRF
and callback attacks, optional/verified/resource policies, request isolation, MFA challenges,
TOTP/backup codes, organizations and privilege checks, tenant-scoped business writes, native
client state, cleanup, router races, compiled `.vibe` forms and browser WebAuthn.

Chromium end-to-end flows use real HTTP, browser cookies, VibeForm/Vibecn UI and Better Auth.
Passkey ceremonies use a virtual CTAP2 authenticator. The second database integration uses
Drizzle and PGlite's embedded PostgreSQL; network PostgreSQL behavior is not implied.
Production examples build and are started against disposable migrated SQLite databases.
The packed package is installed outside the workspace and its declarations, ESM exports,
Node-only server typing and browser dependency graph are checked.

## Explicit limitations

- No real Google/GitHub/Apple OAuth exchange or provider account-linking flow was run.
- Physical authenticators, Safari, Firefox, mobile WebAuthn and synchronized passkeys are untested.
- MFA's default credential-only enforcement does not automatically gate OAuth/passkey sessions.
- OTP/SMS delivery, external production email transport and team administration UI are not tested.
- Native team creation and membership operations are server-tested; team invitation flows are not browser-tested.
- Cloudflare Workers/D1 remain unverified; no Node result is presented as Worker validation.
- MySQL, Prisma and external/network PostgreSQL services were not exercised.
- Vibe.js 0.1 client rendering is supported; SSR/hydration is not advertised.
- Default DI composables expose core types; instance-bound composables retain plugin/custom fields.
- Auth compositions are editable repository source, not new Vibecn CLI registry entries.
- Revocation cannot undo already authorized in-flight writes; transaction-bound policies are application-owned.
- Coverage measures this adapter's executed paths, not an independent security audit or proof of upstream cryptography.
- Optional form/query development tarballs require the provided sibling repositories until those integrations are published.

No package publication, push, remote repository creation, deployment or production authentication
change is performed by the local verification workflow.
