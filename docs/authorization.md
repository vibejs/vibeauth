# Roles, permissions and resource ownership

Authentication establishes a validated identity. Authorization decides whether that identity
may perform this operation on this resource now. Client-visible roles, URL IDs and the active
organization selection are inputs, never proof.

`createAuthGuard(auth, { policy })` and `allPolicies(...)` are the adapter's authorization
surface. Policies run on the server after authentication and fail with 403 when denied.
Keep infrastructure failures as failures; do not turn every database error into a granted
policy. For an Admin-plugin application, an explicit trusted-role policy can inspect
`identity.user.role` from the validated session. Never accept a role value submitted by a
signup/profile form as a grant. Better Auth owns its Admin/Organization role persistence.

The SaaS example uses Better Auth's `createAccessControl` and official organization roles.
Owner and admin can create/update projects; members can read them. Every request calls the
plugin's server `hasPermission` with the requested organization ID. It loads actual membership;
a client-chosen active organization cannot bypass that lookup.

For update, the SQL operation also scopes both resource ID and organization ID:

```sql
UPDATE project SET name = ? WHERE id = ? AND organizationId = ?;
```

A permission in organization A therefore cannot mutate a project in organization B. Zero
matched rows produce 403 without disclosing another tenant's resource. The tests exercise
anonymous access, non-members, read-only members, owner updates, cross-tenant IDs and attempts
to revoke another user's session. This pattern applies equally to resource ownership and
custom action policies. Add a transaction/recheck when concurrent membership revocation must
be atomic with a write.

The browser has no authoritative `usePermission` helper. A UX policy may consume capabilities
returned from a protected API; authorization is independently enforced for every business call.
