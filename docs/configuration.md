# Configuration and environment

VibeAuth takes an existing Better Auth instance on the server and forwards Better Auth
client options on the browser. Configure secrets, adapters, social providers, sessions,
password policy, email delivery and plugins on Better Auth itself. Use exact trusted origins.
Do not disable its CSRF or origin checks.

The examples validate required configuration before startup. Their `.env.example` contains
placeholders only. Server variables never use the `VITE_` prefix.

| Variable                                   | Meaning                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                       | Required random secret, at least 32 characters; generate with the official CLI                           |
| `BETTER_AUTH_URL`                          | External canonical origin; basic defaults to loopback 5173, SaaS to 5174                                 |
| `TRUSTED_ORIGINS`                          | Comma-separated exact canonical origins; defaults to the base origin                                     |
| `DATABASE_PATH`                            | SQLite file relative to the example directory; defaults to `.local/basic.sqlite` or `.local/saas.sqlite` |
| `PORT`                                     | Internal API listener; defaults to 3001 or 3002                                                          |
| `VIBEAUTH_LOCAL_MAIL`                      | Only `1` explicitly enables the loopback-only private outbox                                             |
| `EMAIL_DELIVERY_URL`                       | Required HTTPS delivery service when local mail is off; receives POST `{ kind, email, url }`             |
| `EMAIL_DELIVERY_TOKEN`                     | Bearer credential for that service; required when local mail is off                                      |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Optional SaaS GitHub provider pair                                                                       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional SaaS Google provider pair                                                                       |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`   | Optional SaaS Apple provider pair; secret lifecycle is application-owned                                 |
| `APPLE_APP_BUNDLE_IDENTIFIER`              | Optional native Apple bundle identifier                                                                  |
| `VITE_SOCIAL_PROVIDERS`                    | Public comma-separated `github,google,apple` names whose buttons are shown; no secrets                   |

The examples use a seven-day session, one-day update interval, five-minute freshness window,
a 12-character minimum password and persistent Better Auth rate limiting. Configure different
policies explicitly on Better Auth. Database rate-limit storage is migrated with the auth
schema. A distributed deployment must use a suitably atomic/shared limiter storage supported
by Better Auth and test its behavior across instances.

HTTPS enables secure cookies. Plain HTTP is accepted by the example only for loopback hosts,
using an explicit non-secure cookie setting appropriate to that URL. No behavior is weakened
based on `NODE_ENV`. Tests explicitly set both protection-disable options to `false` because
Better Auth otherwise defaults origin checks off in its test environment.

Vite reads the shared repository environment directory and exposes only `VITE_` variables to example UIs. Never define the entire server `process.env` object into a browser build. The SaaS passkey example requires a DNS hostname; use `localhost:5174` rather than a numeric IP address.
