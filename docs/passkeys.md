# Passkeys

Passkeys are an optional official package: `@better-auth/passkey@1.7.13` on the server and
`@better-auth/passkey/client` on the browser. They are not a VibeAuth runtime dependency.
Add the server plugin to Better Auth and `passkeyClient()` to VibeAuth's client options.
Generate and review the resulting plugin schema before use.

The SaaS configuration sets an explicit RP ID, RP name and expected origin. Its UI supports
registration, sign-in, listing, renaming and removal through native client methods. It checks
`window.isSecureContext` and `PublicKeyCredential` before offering browser operations. A
failed/cancelled ceremony shows a safe error; it does not silently fall back to a weaker
credential mechanism.

WebAuthn requires a supported browser and secure context, normally HTTPS (with the browser's
localhost development exception). RP IDs and origins must match the deployed site. Test
cross-device, platform and security-key behavior on the devices you support; a desktop test
cannot establish platform interoperability.

The Chromium integration suite uses CDP's virtual CTAP2 authenticator with resident keys and
user verification. It registers a real credential through the official plugin, logs out,
signs in with that passkey and removes it. Verification runs against Better Auth's actual
WebAuthn endpoints; cryptographic responses are produced by Chromium's authenticator.
Physical hardware, Safari, Firefox, mobile platform prompts and synchronized passkey behavior
are not verified. This is local browser verification, not a security audit.
[Official passkey integration](https://better-auth.com/docs/plugins/passkey).
