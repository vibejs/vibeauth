# Production deployment

Build and verify the package and both examples before release. The example frontend is a
Vite static build; put it behind the same external HTTPS origin as the API reverse proxy.
The backend listens on loopback and must be fronted by your deployment server/proxy.
The development Vite proxy is not a production deployment mechanism.

Set an exact external `BETTER_AUTH_URL`, exact trusted origins, a generated secret, a persistent
managed database and real HTTPS email delivery. Configure provider callback URLs for that
external origin. Forward method, URL, query, body, Cookie and distinct Set-Cookie headers;
do not rewrite the auth base path twice or buffer response streams unnecessarily. Configure
trusted proxy headers only for proxies you actually control. Restrict direct backend access.

Apply reviewed migrations separately, including all enabled plugins and the database limiter.
Never run a destructive or unknown migration automatically on app startup. Rehearse recovery
from a database backup. Test multi-instance revocation and rate-limit storage behavior before
scaling. Consider cookie-cache tradeoffs for native plugin endpoints: VibeAuth business reads
bypass it, while application Better Auth configuration can enable it elsewhere.

The production server builds and disposable startup/migration checks are exercised locally.
No hosting provider has been deployed, and external OAuth/email infrastructure has not been
configured. Workers/D1 remain separately unverified. Production adoption needs an application
security review, monitored delivery/abuse controls, dependency advisories, and tested secrets
rotation and backup procedures appropriate to the application.

Set request/body size limits at the HTTP server or reverse proxy for the auth mount too. vibe.js controller `bodyLimit` is applied after middleware and does not bound Better Auth handler bodies. Do not consume an auth body in a logging middleware. Redact token-bearing recovery paths and all cookie/authorization headers in proxy and debug logs.
