# Auth vs User Context Boundary

Date: 2026-04-13

## Decision

- `AuthContext` is the canonical runtime source for session identity:
  - authenticated user payload (`user`)
  - role state (`activeRole`, `availableRoles`)
  - auth lifecycle actions (`login`, `signup`, `logout`, `setActiveRole`)
- `UserContext` is no longer mounted in `AppProviders` and is treated as legacy/deprecated.

## Why

- Both contexts previously held `user`, which created redundant state and stale-data risk.
- There were no active runtime consumers of `useUser()` in the modern client.
- Removing `UserProvider` from the app tree prevents divergence and unnecessary re-renders.

## Current Guidance

- Use `useAuth()` for all authenticated-user and role-based UI behavior.
- Do not add new runtime features using `useUser()` unless a scoped, non-auth cache is explicitly needed.
- If a profile-edit draft cache is needed later, create a dedicated context with a non-overlapping shape.

