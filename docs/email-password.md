# Email and password

The examples configure Better Auth's email/password workflow with email verification,
password policies and recovery delivery. No password, hash or reset token is handled by the
adapter. Use the native typed actions:

```ts
await auth.client.signUp.email({ name, email, password, callbackURL: location.origin });
await auth.client.signIn.email({ email, password });
await auth.client.signOut();
await auth.client.sendVerificationEmail({ email, callbackURL: location.origin });
await auth.client.requestPasswordReset({ email, redirectTo: `${location.origin}/?view=reset` });
await auth.client.resetPassword({ token, newPassword });
await auth.client.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
```

Check action errors without reflecting internal error details into public UI. Signup and
recovery messages avoid confirming whether an account exists. Login errors use a generic
credential/verification message. Never log submitted values, passwords or token-bearing links.

## Email verification

The server enables `sendOnSignUp` and requires verification before password login. Delivery
receives Better Auth's URL. Opening it runs Better Auth's handler and its trusted callback
validation. Only that handler validates verification tokens. The tests register, reject
unverified login, open the real verification URL, then log in successfully.

## Password recovery

The server's reset callback delivers the official link. The example's reset view receives its
token after Better Auth redirects to the configured local callback. Confirm the new password
in the form, pass the token to Better Auth, and discard form fields afterwards. Reused tokens
are rejected. `revokeSessionsOnPasswordReset: true` invalidates previous sessions; the tests
verify that old cookies can no longer reach a protected API.

Local delivery writes only to the explicitly enabled private outbox. Production must supply
an email service, monitor delivery failures without token logging, and apply rate limiting.
The sample HTTPS mail transport is an interface for a service you operate; no third-party
provider delivery is claimed to be tested.
