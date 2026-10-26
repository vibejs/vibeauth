# Social login

The SaaS configuration supports Google, GitHub and Apple through Better Auth's native social
providers. Configure only complete ID/secret pairs on the server. Set public provider names
in `VITE_SOCIAL_PROVIDERS` to show their working sign-in buttons. Never put provider secrets
in browser environment variables.

```ts
await auth.client.signIn.social({
  provider: 'github',
  callbackURL: `${location.origin}/app`,
  errorCallbackURL: `${location.origin}/?oauthError=1`,
});
```

Use the exact registered external origin. Provider callbacks belong under
`/api/auth/callback/github`, `/google` or `/apple`, according to the selected provider. Better
Auth owns state, PKCE where applicable, callback exchange and cookie issuance. The adapter
forwards callback query parameters and responses unchanged.

Account linking remains Better Auth's responsibility. Review its account-linking settings,
verified-email assumptions and trusted providers against your application's identity policy.
Do not link unrelated identities by matching a browser-supplied email alone. Use its native
link/unlink operations only after suitable authentication.

## Manual provider verification

Create credentials in a provider development application, register the exact callback, and
set server secrets outside version control. Run the SaaS app on its configured origin (Apple
may require a provider-approved HTTPS domain). Exercise consent, denial, callback errors,
account linking where configured, new and existing users, cookie issuance and sign-out.
Inspect protected APIs after logout. Rotate credentials after testing if appropriate.

No live provider flow has been run for this repository. Deterministic tests verify unsafe
callback rejection and invalid OAuth state without exchanging a fabricated code. These tests
do not prove a real external provider integration.
