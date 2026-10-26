# Authentication, Native to Vibe.js

VibeAuth connects Better Auth to Vibe.js without owning credentials or sessions. Write
business contracts, apply server policies, and consume native reactive session state.

Start with [installation](getting-started), then choose the [client](client), [server](server)
or [router](router) integration. The basic example covers the complete email/password
lifecycle. The SaaS example adds organizations, resource policies, MFA and passkeys.

Tested versions and limitations are explicit in
[verification](verification). API stability follows the pinned Vibe.js 0.1 and Better Auth
1.7.13 compatibility baseline. No independent security audit has been performed.

| Layer          | Responsibility                                                                         |
| -------------- | -------------------------------------------------------------------------------------- |
| Better Auth    | Passwords, authentication protocols, cookies, session persistence and official plugins |
| Server adapter | Exact handler mounting, request-scoped validation, guards and explicit policies        |
| Client adapter | One official session subscription bridged into Vibe.js refs and computed values        |
| Copy-owned UI  | Accessible Vibecn compositions, optional VibeForm and identity-scoped VibeQuery        |

The website uses VitePress's local search, keyboard navigation, light/dark themes and mobile
navigation. Application components are real `.vibe` files; the library has no React or Vue runtime dependency.
