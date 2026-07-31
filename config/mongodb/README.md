# Synthetic MongoDB Fixtures

This directory contains versioned development fixtures. Every identity and
record here must be synthetic and safe to publish.

- `wikitruth/` contains the shared seed collections.
- `users/` contains synthetic private records used to exercise visibility and
  ownership behavior.
- The documented fixture password is development-only and must never be reused
  by a real account.

Never write a live database export or runtime backup into this directory. Set
`MONGODB_BACKUP_ROOT` and `MONGODB_PRIVATE_BACKUP_ROOT` to a private location
outside the repository before running backup operations.
