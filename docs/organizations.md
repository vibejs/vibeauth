# Organizations and teams

Organizations are optional. The basic configuration does not install the plugin. The SaaS
example installs Better Auth's Organization and Admin plugins plus native client plugins.
All organization models and membership mutations belong to Better Auth.

The functional workspace composition creates and switches organizations, updates their names,
sends invitations, accepts invitations, lists members, changes admin/member roles and removes
members. Buttons call native plugin operations and report rejected access. The UI does not
grant privileges by hiding controls; the server plugin performs every role check.

Invitations use the configured email transport and a local `invitationId` link. A user signs
in with the invited verified email before accepting. Invitation IDs alone do not prove
membership. The tests verify acceptance, non-member rejection, unauthorized role escalation,
owner role updates and membership removal.

The application project APIs use explicit organization IDs, validate plugin permissions and
scope data queries by tenant. They never rely solely on `session.activeOrganizationId`.
Refresh organization-scoped application queries after switching and include both user and
organization in their keys.

Teams are enabled in the SaaS server/client configuration. Native plugin team operations remain
available with their inferred types; the current workspace composition does not provide team
administration controls. Team creation and membership additions/listing/removal are verified against native server endpoints. Team invitations and team-role workflows have not been separately browser-tested. Remove the teams option if your application does not use it. Admin plugin
operations are available for application-owned administrative tooling, but this example does
not include a general user administration console.
