# Private Operator Inventory Template

This is an intentionally blank template. Copy it to a secure private operations
repository or password-protected knowledge base and populate it there.

**Never commit a populated copy to the public Wikitruth repository.**

## Target

- Environment:
- SSH target or access mechanism:
- Operating system and version:
- Shared-host/co-tenant constraints:
- Capacity stop thresholds:
- Maintenance and verification owner:

## Release Layout

- Repository source:
- Release root:
- Immutable release naming:
- Active release pointer:
- Application user/group:
- Build identity location:
- Persistent media/storage paths:

## Runtime Service

- Service manager:
- Service name:
- Working directory:
- Protected environment source:
- Loopback listener/port:
- Start/reload/restart commands:
- Status and restart-count commands:
- Log query and fatal-pattern checks:
- Runtime health endpoint:

## Proxy, TLS, and Domains

- Proxy implementation and configuration path:
- Proxy validation/reload commands:
- Public domains:
- TLS certificate mechanism:
- Outside-in health and deep-link URLs:
- DNS provider/change procedure:

## Database

- Database engine/version:
- Protected credential source:
- Database name:
- Runtime database user and privileges:
- Replica/transaction expectations:
- Backup command and root:
- Dry-run restore command:
- Off-host backup destination:
- Required document-count and reference invariants:
- Migration/delta synchronization commands:

## Rollback

- Known-good release lookup:
- Code rollback command:
- Data rollback authority:
- Backup retention:
- Post-rollback verification:

## Secrets and Access Review

- Credential owner:
- Rotation procedure:
- Host key verification:
- Least-privilege review date:
- Public-repository exposure check:
