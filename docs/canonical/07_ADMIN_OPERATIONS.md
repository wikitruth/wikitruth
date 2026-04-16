# Canonical Card: Admin and Operational Controls

## Purpose

Define core administrative control surfaces.

## Admin Domain Controls

- Admin dashboard provides baseline counts (`users`, `accounts`, `categories`, `statuses`).
- Admin APIs support management of:
- users (create/update/delete, password reset, role links)
- accounts (link/unlink users, notes, status updates)
- administrators and admin groups
- categories and statuses

## Moderation Control Plane

- Admins can perform advanced moderation actions:
- verdict queue management
- bulk verdict updates
- ownership takeover
- content deletion
- ownership migration with guardrails

## Backup Operations

- Admin API exposes DB backup status and backup execution endpoints.
- Backup paths are config-driven and created on demand.

## Permission Invariant

Admin endpoints are explicitly role-gated server-side; operational actions must remain inaccessible to non-admin users even if UI routes are discovered.
