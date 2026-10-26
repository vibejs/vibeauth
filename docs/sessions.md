# Session management

Better Auth stores and validates sessions. The adapter's request reads bypass cookie caching
and do not renew them; the browser's official session atom revalidates through `/get-session`.
Server session expiration, update age, freshness and revocation remain configured on Better
Auth. Do not add a process-wide cache or a client-side credential persistence layer.

The Account composition lists sessions through a protected application contract. The server
calls `auth.api.listSessions`, returns only ID/current/creation/expiration/user-agent metadata,
and translates an owned session ID back to its token only on the server for revocation. A
session ID supplied by another user returns 403. Tokens never appear in the rendered list.
IP/user-agent metadata can be sensitive and is not an identity proof.

Native client operations include `signOut()`, `revokeOtherSessions()` and `revokeSessions()`.
The UI refreshes state after revocation. Changing a password uses `revokeOtherSessions: true`;
reset configuration revokes existing sessions. Respect Better Auth's freshness checks on
security-sensitive operations and prompt for the current password where required. Do not
set freshness to zero merely to avoid reauthentication.

Revocation is verified on the next server authorization check. A request already authorized
before revocation may finish. For financial or otherwise sensitive writes, validate required
state within the same transaction as the operation. Clear identity-scoped application caches
on logout/account change, including when an API returns 401. A router redirect alone does
not revoke a cookie or clear sensitive data.
