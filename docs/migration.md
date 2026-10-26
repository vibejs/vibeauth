# Migration guide

This is the initial local 0.1.0 integration; no older VibeAuth release is claimed compatible.
When adopting it from a handwritten Better Auth mount, keep the same auth instance, database,
base URL/path, plugins, secret and cookie configuration. Replace only the HTTP mount, then
verify existing sessions and every callback before changing authentication configuration.

Replace ad hoc global browser stores with one `createVibeAuthClient` per application and
install its plugin. Keep native client operations under `.client`. Move backend identity reads
to `getAuthSession` and explicit server guards. Enforce resource/organization policies separately
from frontend route metadata. Clear old identity-specific application caches.

For Better Auth upgrades: pin the new version in a branch, inspect package exports and vanilla
session semantics, generate/review migrations for the exact plugins, back up, and run all
quality gates including the packed independent consumer. Run provider/manual deployment checks
separately where credentials are required. Publish an adapter changeset when public behavior
changes. Do not widen peer ranges based only on compilation or a Node build.

For vibe.js upgrades: verify public lifecycle, router, guard and middleware contracts. Match
compiler/runtime versions for all `.vibe` compositions. Source UI is copy-owned, so application
owners review primitive/composition changes instead of receiving invisible UI runtime updates.
