# Email Operations Checklist Plan

## Objective

Provide production-oriented, administrator-managed email delivery without
requiring email-provider environment-file edits or application restarts. Keep
provider credentials outside MongoDB and Git, render every supported message
from a typed catalog, and make delivery observable and safely testable.

## Implementation Checklist

### Provider Configuration and Security

- [x] Add an encrypted, versioned JSON provider store under the ignored private runtime directory.
- [x] Enforce atomic writes, `0700` directory mode, and `0600` file mode.
- [x] Support native Resend and generic SMTP providers without exposing saved secrets.
- [x] Add provider create/update, verify, activate, disable, and remove operations.
- [x] Require administrator authorization, recent privileged passkey assurance, rate limiting, and audit events for provider mutations and test sends.
- [x] Load active provider changes at send time so no restart is required.
- [x] Preserve environment SMTP only as a migration fallback until an administrator-managed provider is activated.

### Catalog and Rendering

- [x] Add a typed catalog for sign-in code, password reset, account verification, welcome, contact form, daily digest, and weekly digest.
- [x] Render both HTML and plain-text variants from repository-owned templates.
- [x] Use trusted configured application or tenant origins for action links.
- [x] Add deterministic, explicitly synthetic preview fixtures.
- [x] Add administrator HTML/plain-text preview APIs without persisting preview data.

### Durable Delivery

- [x] Add a dedicated email outbox model with idempotency, provider metadata, retry state, and masked-recipient presentation.
- [x] Queue modern transactional messages instead of coupling provider delivery to the request lifecycle where security permits.
- [x] Keep email-code delivery fail-closed in production while recording its delivery result.
- [x] Process due outbox messages with bounded retries and permanent/transient failure classification.
- [x] Add daily and weekly digest aggregation from queued notification-delivery records.
- [x] Record provider message IDs and accept authenticated Resend delivery webhooks.
- [x] Suppress automatic retry after hard bounce or complaint events.

### Existing Flow Completion

- [x] Send the configured welcome message after modern password signup.
- [x] Automatically queue account verification after signup when verification is required.
- [x] Keep password-reset request responses non-enumerating while recording delivery failures operationally.
- [x] Route contact-form delivery through the catalog and outbox.

### Administrator Experience

- [ ] Add an Email Operations route and Admin Dashboard entry.
- [ ] Show active provider health and masked provider configuration.
- [ ] Add provider editing and verification forms for Resend and SMTP.
- [ ] Add the template catalog with HTML/plain-text preview and safe sample data.
- [ ] Restrict test delivery to the current administrator's verified email address.
- [ ] Show recent delivery activity and allow retry only for eligible failures.
- [ ] Preserve usable desktop and `390px` mobile layouts in light and dark modes.

### Verification

- [ ] Add provider-store encryption, permission, adapter, catalog, outbox, worker, route, and webhook tests.
- [ ] Add client API and administrator-page interaction tests.
- [ ] Run focused and full server/client suites, lint, type checks, builds, guardrails, and secret scans.
- [ ] Verify the administrator flow with the Browser plugin at desktop and mobile viewports.
- [ ] Complete a separate final diff and security review before closing this plan.

## Deployment Boundary

- [x] Implementation and validation are local only.
- [x] No production/VPS deployment, runtime restart, DNS, proxy, database, or provider-account mutation is authorized by this request.

## Canonical Documentation Boundary

This implementation follows the existing authentication, notification-outbox,
administrator-authorization, and privileged-passkey canonical contracts. No
canonical card will be edited without separate explicit approval.
