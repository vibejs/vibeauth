# Two-factor authentication

Install Better Auth's official `twoFactor` server plugin and `twoFactorClient` in the
VibeAuth client's plugins. The SaaS example includes both. TOTP cryptography and recovery
verification remain entirely in Better Auth.

Enrollment asks for the current password, calls `twoFactor.enable`, presents the returned
authenticator link and initially disclosed backup codes, then calls `verifyTotp` before
considering enrollment complete. The UI clears the enrollment link after verification and
lets the user permanently dismiss the in-memory recovery codes. It never re-fetches recovery
codes for casual display. Disablement also asks for the password.

After password login, handle `twoFactorRedirect` as a challenge, not a session. The example
shows a code/recovery form while the adapter remains unauthenticated. Submit `verifyTotp`
or `verifyBackupCode`, then revalidate the session. Trusted-device choice uses the plugin's
native `trustDevice` option, and should only be offered for a private device. Recovery codes
are single-use; recovery procedures beyond those codes are application security decisions.

The real integration test enrolls TOTP, uses the official server-only test generation utility,
verifies it, rejects protected API access during a sign-in challenge and rejects reused backup
codes. This tests integration with the real plugin, not its cryptographic algorithm.

**Enforcement scope matters:** in 1.7.13 the plugin's default after-hook matches credential
sign-in endpoints (email, username and phone). OAuth, passkeys and other passwordless sign-in
methods are not automatically gated. `twoFactorEnabled` is an account preference, not proof
that a particular session completed MFA. VibeAuth does not invent an assurance claim or a
custom step-up protocol. Design any mandatory step-up policy using supported Better Auth
hooks and record server-trusted assurance explicitly before protecting high-value operations.
[Official MFA guidance](https://better-auth.com/docs/plugins/2fa).

OTP by email/SMS is available through the official plugin when the application configures its
`otpOptions.sendOTP` delivery. The supplied example enables TOTP, not an OTP delivery service.
External SMS/email delivery and broader recovery operations have not been tested here.
