# Security guide

Better Auth owns credential verification, token generation, cookie signing, OAuth state,
PKCE where applicable, recovery, MFA and passkey verification. VibeAuth owns the correctness
of its integration. This library has not undergone an independent security audit.

## Cookies and origins

Use a canonical HTTPS external base URL and exact trusted origins. Keep HttpOnly session
cookies and appropriate SameSite settings; the examples retain Better Auth's Lax behavior
and enable Secure under HTTPS. Avoid wildcard credentialed origins. Cross-subdomain cookies
are an explicit deployment decision: every participating subdomain expands the trust boundary.
Do not enable them simply to make a proxy setup work.

Keep origin and CSRF checks enabled. The handler owns protocol-specific protection; business
mutations additionally use exact Origin enforcement after authentication. CORS is not a
replacement for authentication or CSRF protection. If cross-origin credentials are required,
configure exact origins and credential handling deliberately on both server and client.

## Sessions and authorization

Server identity always comes from Better Auth validation. Request reads bypass cookie caches,
strip tokens and deduplicate only within one context/source. No session secret enters a
custom cookie or localStorage. Expiration/error UI fails closed. Frontend route guards are
not a security boundary. Enforce permissions, resource ownership and tenant membership for
every operation, and scope every query/write to the same tenant you authorized.

Already-authorized operations may race revocation. Use transactions and a fresh validation
at the appropriate boundary for security-sensitive writes. Do not infer MFA assurance from
`twoFactorEnabled` alone: the plugin's default sign-in enforcement is limited to credential
endpoints. OAuth/passkey sessions are not automatically gated by a second factor.

## Credentials, recovery and logs

Use a strong secret manager, provider-specific secrets and approved email delivery. Never
log passwords, tokens, cookies, recovery links, backup codes or authorization headers. Protect
and expire local development outboxes. Public signup/recovery messages must avoid confirming
account existence. Keep rate limiting enabled with storage appropriate to your topology;
combine with monitoring and application abuse controls.

Retain Better Auth's password checks and freshness requirements. Rotate secrets using its
supported strategy and rehearse migration/recovery; do not invent cryptography. Account
linking and trusted providers require an application identity policy. Back up databases and
migration history. Upgrade Better Auth after reviewing upstream advisories and rerunning the
integration suite. See the [threat model](threat-model) and [verification boundaries](verification).
