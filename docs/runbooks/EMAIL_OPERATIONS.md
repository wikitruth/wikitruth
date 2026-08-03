# Email Operations Runbook

Wikitruth administrators manage modern email delivery at
`/admin/email-operations`. Provider changes are loaded for each delivery, so a
saved and activated change does not require an application restart.

## Supported Messages

The repository-owned catalog renders responsive HTML and plain text for:

- sign-in codes and secure sign-in links;
- password resets;
- account verification;
- new-account welcome messages;
- public contact-form messages;
- daily notification digests; and
- weekly notification digests.

Preview data is deterministic and explicitly synthetic. A test send is limited
to the signed-in administrator's verified email address and requires recent
privileged passkey assurance.

## Configure a Provider

1. Open **Admin → Email Operations** and select **Add provider**.
2. Choose Resend API or SMTP and enter the sender and write-only credential fields.
3. Save the provider.
4. Select **Verify**. Wikitruth must successfully deliver the verification
   message to the current administrator's verified email.
5. Select **Activate**. New messages use the provider immediately.
6. Configure the contact-form recipient under **Message routing**.
7. Preview each relevant template and send a controlled test.
8. Confirm the test has a delivered provider message ID in **Recent delivery activity**.

Only a verified, enabled provider can be activated. Disabling the active
provider clears the active selection. An active provider must be disabled
before it can be removed.

## Resend Webhook

Configure the provider webhook destination as:

```text
https://YOUR_PUBLIC_ORIGIN/api/email-webhooks/resend
```

Save the Resend signing secret in the provider form. Wikitruth verifies the
Svix ID, timestamp, raw request body, HMAC signature, and a five-minute clock
window. Delivered events update delivery status; hard-bounce and complaint
events suppress automatic retry.

## Private Storage

The default files are:

```text
.runtime/secrets/email-providers.json
.runtime/secrets/email-provider.key
```

The directory is mode `0700`, files are mode `0600`, and provider secrets are
AES-256-GCM encrypted. `.runtime/` is Git-ignored. Never add either file to Git,
an issue, a pull request, logs, screenshots, or a public backup.

`WIKITRUTH_CRYPTO_KEY` or `CRYPTO_KEY` may provide the encryption root. If
neither exists, Wikitruth creates the private key file. A backup is usable only
when the encrypted JSON and its matching key are both preserved. Store them in
the private operator backup system, with access limited to operators.

Optional path overrides are `EMAIL_PROVIDER_STORE_PATH` and
`EMAIL_PROVIDER_KEY_PATH`. They are operator-level storage paths, not provider
configuration, and usually do not need to be changed.

## Delivery and Retry Behavior

- Transactional payloads, including recipients and token-bearing locals, are
  encrypted in the MongoDB email outbox.
- Admin activity shows masked recipients and never returns message bodies,
  credentials, codes, or tokens.
- Successful delivery redacts the encrypted transactional payload.
- Resend idempotency keys and a unique outbox key prevent duplicate sends.
- Transient failures use bounded backoff; permanent failures remain eligible
  for an explicit administrator retry when safe.
- Sign-in code delivery remains fail-closed in production.
- Password-reset requests remain non-enumerating.
- Daily and weekly digests are built only from opted-in queued notifications.

## Migration Fallback and Rollback

Legacy `SMTP_*` configuration is used only when no administrator-managed
provider is active. This supports a controlled migration:

1. Keep the fallback during provider setup.
2. Verify and activate the administrator-managed provider.
3. Confirm transactional tests and provider webhook processing.
4. Remove fallback credentials from the private runtime environment during a
   later approved release, not during the UI configuration change.

To roll back delivery configuration, verify and activate another saved
provider. If no managed provider is active, the environment SMTP fallback is
used when complete credentials are present. Provider configuration changes do
not authorize a server deployment or restart.
