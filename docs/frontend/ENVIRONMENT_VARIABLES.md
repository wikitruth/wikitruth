# Environment Variables Reference

This reference documents environment variables used by backend runtime and client build configuration.

## Source of Truth

- Backend runtime loader: `server/src/config/config.js` (re-exported by `config/config.js`)
- Client build-time env injection: `webpack.config.js` (`DefinePlugin`)
- Starter local template: `.env.example`

## Production-Required Secrets

In production, startup validation requires:

- `WIKITRUTH_CRYPTO_KEY`
- `WIKITRUTH_JWT_SECRET`
- `SMTP_FROM_ADDRESS`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`

## Backend Runtime

### Core Server and Routing

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Node environment mode | `development` |
| `PORT` | HTTP server port | `8000` |
| `HTTPS_ENABLED` | Enable HTTPS listener | `false` |
| `HTTPS_PORT` | HTTPS listener port | `8443` |
| `HTTPS_KEY_PATH` | TLS private key path | empty |
| `HTTPS_CERT_PATH` | TLS certificate path | empty |
| `HTTP_TO_HTTPS_REDIRECT` | Redirect HTTP traffic to HTTPS | `false` |
| `LEGACY_COMPATIBILITY_ENABLED` | Enable `/legacy` bridge | `true` |
| `LEGACY_COMPATIBILITY_MOUNT_PATH` | Legacy mount path | `/legacy` |
| `LEGACY_COMPATIBILITY_STATIC_ROOT` | Legacy static root | `legacy/static` |
| `LEGACY_COMPATIBILITY_TEMPLATES_ROOT` | Legacy templates root | `legacy/templates` |

### MongoDB and Backups

| Variable | Purpose | Default |
|---|---|---|
| `MONGODB_URI` | Primary Mongo connection URI | `mongodb://127.0.0.1:27017/wikitruth` |
| `MONGODB_DBNAME` | Logical DB name | `wikitruth` |
| `MONGODB_BACKUP_ROOT` | Public backup output root | `~/.wikitruth/backups/public` |
| `MONGODB_PRIVATE_BACKUP_ROOT` | Private-data backup root | `~/.wikitruth/backups/private` |

Both roots must remain outside the tracked `config/mongodb` fixture directory.
The runtime refuses backup or restore operations that resolve inside that tree.

### Project Identity and Secrets

| Variable | Purpose | Default |
|---|---|---|
| `COMPANY_NAME` | Company display name | `Wikitruth Foundation` |
| `PROJECT_NAME` | Product name | `Wikitruth` |
| `TITLE_SLOGAN` | UI slogan text | `Wikitruth, the truth in totality of human knowledge` |
| `HOME_URL` | Canonical home URL | `https://wikitruth.net` |
| `SYSTEM_EMAIL` | System destination email (contact, notices) | `dev@example.com` (non-production) |
| `WIKITRUTH_CRYPTO_KEY` | Cookie/session signing key | generated in non-production |
| `WIKITRUTH_JWT_SECRET` | JWT signing secret | generated in non-production |
| `CACHE_BREAKER` | Static cache breaker override | current timestamp |
| `TRUST_PROXY` | Express trust-proxy mode | `false` |

### Session and CSRF

| Variable | Purpose | Default |
|---|---|---|
| `SESSION_COOKIE_NAME` | Session cookie name | `sid` |
| `SESSION_RESAVE` | Force session resave | `false` |
| `SESSION_SAVE_UNINITIALIZED` | Save empty sessions | `false` |
| `SESSION_ROLLING` | Refresh cookie each response | `false` |
| `SESSION_PROXY` | Session proxy mode | inherits `TRUST_PROXY` |
| `SESSION_COOKIE_HTTP_ONLY` | HTTP-only session cookie | `true` |
| `SESSION_COOKIE_SECURE` | Secure session cookie | `true` in production |
| `SESSION_COOKIE_SAMESITE` | Session cookie SameSite | `lax` |
| `SESSION_COOKIE_MAX_AGE_MS` | Session cookie lifetime | `1209600000` |
| `CSRF_IGNORE_METHODS` | Methods exempt from CSRF check | `GET,HEAD,OPTIONS` |
| `CSRF_COOKIE_SIGNED` | Signed CSRF cookie | `true` |
| `CSRF_COOKIE_SECURE` | Secure CSRF cookie | `true` in production |
| `CSRF_COOKIE_SAMESITE` | CSRF cookie SameSite | `lax` |

### Passkeys and Cross-Domain Authentication

| Variable | Purpose | Default |
|---|---|---|
| `WEBAUTHN_ENABLED` | Enable passkey APIs and UI | `true` |
| `WEBAUTHN_RP_ID` | WebAuthn relying-party domain | `wikitruth.net` in production; canonical local hostname otherwise |
| `WEBAUTHN_RP_NAME` | Authenticator-visible service name | `Wikitruth` |
| `WEBAUTHN_ORIGINS` | Comma-separated exact ceremony origins | `https://wikitruth.net` in production |
| `AUTH_CANONICAL_ORIGIN` | Central human-authentication origin | `https://wikitruth.net` in production |
| `AUTH_TRUSTED_TENANT_ORIGINS` | Additional exact handoff destinations | empty; active civic-tenant domains are also resolved |
| `WEBAUTHN_CHALLENGE_TTL_SECONDS` | Registration/authentication ceremony lifetime | `300` |
| `AUTH_HANDOFF_TTL_SECONDS` | Single-use tenant handoff lifetime | `120` |
| `WEBAUTHN_STEP_UP_MAX_AGE_SECONDS` | Privileged passkey assurance window | `600` |
| `WEBAUTHN_RECOVERY_CODE_COUNT` | Codes generated in a recovery batch | `10` |
| `WEBAUTHN_ADMIN_STEP_UP_REQUIRED` | Enforce passkey assurance for protected admin mutations | `true` in production |
| `WEBAUTHN_PASSWORDLESS_ENABLED` | Allow recovery-ready accounts to disable password login | `true` |

`WEBAUTHN_RP_ID` must be chosen before production enrollment. Local credentials are test-only and do not migrate to `wikitruth.net`.

### Security, Limits, and Runtime Controls

| Variable | Purpose | Default |
|---|---|---|
| `SECURITY_HELMET_ENABLED` | Enable Helmet middleware | `true` |
| `SECURITY_HELMET_CONTENT_SECURITY_POLICY` | Enable CSP | `false` |
| `SECURITY_HELMET_COEP` | Cross-Origin-Embedder-Policy | `false` |
| `SECURITY_HELMET_CORP` | Cross-Origin-Resource-Policy | `cross-origin` |
| `SECURITY_HELMET_REFERRER_POLICY` | Referrer policy | `no-referrer` |
| `SECURITY_HELMET_HSTS_ENABLED` | Enable HSTS | `true` in production |
| `SECURITY_HELMET_HSTS_MAX_AGE` | HSTS max age seconds | `15552000` |
| `SECURITY_HELMET_HSTS_INCLUDE_SUBDOMAINS` | HSTS include subdomains | `true` |
| `SECURITY_HELMET_HSTS_PRELOAD` | HSTS preload flag | `false` |
| `LOGIN_ATTEMPTS_FOR_IP` | Rate cap by IP | `50` |
| `LOGIN_ATTEMPTS_FOR_IP_AND_USER` | Rate cap by IP + username | `7` |
| `LOGIN_ATTEMPTS_LOG_EXPIRATION` | Login attempt TTL | `20m` |
| `REQUIRE_ACCOUNT_VERIFICATION` | Require verified account state | `false` |
| `GOOGLE_ANALYTICS_TRACKING_ID` | Server-rendered analytics ID | empty |

### Mobile API Settings

| Variable | Purpose | Default |
|---|---|---|
| `MOBILE_ACCESS_TOKEN_TTL_SECONDS` | Access token TTL | `900` |
| `MOBILE_REFRESH_TOKEN_TTL_SECONDS` | Refresh token TTL | `2592000` |
| `MOBILE_MAX_REFRESH_SESSIONS` | Max refresh sessions per user | `10` |
| `MOBILE_API_RATE_LIMIT_PER_MINUTE` | Mobile API per-minute rate limit | `240` |
| `MOBILE_API_RATE_LIMIT_WINDOW_MS` | Mobile API window size | `60000` |
| `API_DEPRECATION_SUNSET` | API deprecation sunset timestamp | `2028-12-31T23:59:59.000Z` |
| `API_DEPRECATION_POLICY_URL` | API deprecation policy URL | `https://wikitruth.net/docs/deprecations` |

### SMTP / Email Delivery

| Variable | Purpose | Default |
|---|---|---|
| `SMTP_FROM_NAME` | From-display name for outgoing messages | `Wikitruth` |
| `SMTP_FROM_ADDRESS` | From-address for outgoing messages | `dev@example.com` (non-production) |
| `SMTP_USERNAME` | SMTP account username/login | empty |
| `SMTP_PASSWORD` | SMTP account password or app password | empty |
| `SMTP_HOST` | SMTP host | `smtp.gmail.com` |
| `SMTP_SSL` | SMTP SSL/TLS mode | `true` |
| `SYSTEM_EMAIL` | Contact-form destination email | `dev@example.com` (non-production) |

Gmail note:

- Use a 2FA-enabled Google account and an App Password.
- Standard account password auth is not recommended and may be blocked.

### reCAPTCHA

| Variable | Purpose | Default |
|---|---|---|
| `GRECAPTCHA_SITEKEY` | reCAPTCHA site key | empty |
| `GRECAPTCHA_SECRET` | reCAPTCHA secret key | empty |

### OAuth Providers (Optional)

| Variable | Purpose | Default |
|---|---|---|
| `TWITTER_OAUTH_KEY` / `TWITTER_OAUTH_SECRET` | Twitter OAuth credentials | empty |
| `FACEBOOK_OAUTH_KEY` / `FACEBOOK_OAUTH_SECRET` | Facebook OAuth credentials | empty |
| `GITHUB_OAUTH_KEY` / `GITHUB_OAUTH_SECRET` | GitHub OAuth credentials | empty |
| `GOOGLE_OAUTH_KEY` / `GOOGLE_OAUTH_SECRET` | Google OAuth credentials | empty |
| `APPLE_OAUTH_KEY` | Apple client ID | empty |
| `APPLE_OAUTH_TEAM_ID` | Apple Team ID | empty |
| `APPLE_OAUTH_KEY_ID` | Apple Key ID | empty |
| `APPLE_OAUTH_PRIVATE_KEY_LOCATION` | Apple private key path | empty |
| `MICROSOFT_OAUTH_KEY` / `MICROSOFT_OAUTH_SECRET` | Microsoft OAuth credentials | empty |
| `MICROSOFT_OAUTH_TENANT` | Microsoft tenant | `common` |
| `TUMBLR_OAUTH_KEY` / `TUMBLR_OAUTH_SECRET` | Tumblr OAuth credentials | empty |

## Compatibility Aliases

These are accepted for compatibility; prefer primary variable names in new setups:

| Alias | Primary Variable |
|---|---|
| `HTTPS_REDIRECT_HTTP` | `HTTP_TO_HTTPS_REDIRECT` |
| `MONGOLAB_URI`, `MONGOHQ_URL` | `MONGODB_URI` |
| `WIKITRUTH_SYSTEM_EMAIL` | `SYSTEM_EMAIL` |
| `CRYPTO_KEY` | `WIKITRUTH_CRYPTO_KEY` |
| `JWT_SECRET` | `WIKITRUTH_JWT_SECRET` |

## React Client Build-Time

Client variables are injected by `DefinePlugin` in `webpack.config.js`.

| Variable | Purpose | Default |
|---|---|---|
| `REACT_APP_API_BASE_URL` | Base URL for API calls | `/api` |
| `REACT_APP_ERROR_REPORT_ENDPOINT` | Runtime client error telemetry endpoint | empty |
| `REACT_APP_ENVIRONMENT` | Client environment label | `development` / `production` |
| `REACT_APP_RECAPTCHA_SITE_KEY` | reCAPTCHA site key for client widget | empty |
| `REACT_APP_ANALYTICS_ID` | Client analytics tracking ID | empty |
| `CDN_ASSET_PREFIX` | Webpack `publicPath` for bundles | `/dist/` |
| `ANALYZE_BUNDLE` | Bundle analyzer toggle | `false` |

## Example `.env` (Local Dev)

```bash
# Core backend
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/wikitruth
SYSTEM_EMAIL=dev@example.com
WIKITRUTH_CRYPTO_KEY=replace-with-strong-key
WIKITRUTH_JWT_SECRET=replace-with-strong-secret

# SMTP (Gmail example)
SMTP_FROM_NAME=Wikitruth
SMTP_FROM_ADDRESS=your-email@gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_HOST=smtp.gmail.com
SMTP_SSL=true

# React build-time
REACT_APP_API_BASE_URL=/api
REACT_APP_ENVIRONMENT=development
REACT_APP_RECAPTCHA_SITE_KEY=
REACT_APP_ANALYTICS_ID=
CDN_ASSET_PREFIX=/dist/
ANALYZE_BUNDLE=false
```
