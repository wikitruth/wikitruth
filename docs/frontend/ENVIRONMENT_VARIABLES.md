# Environment Variables Reference

This reference documents environment variables used by the React migration path and backend runtime.

## Backend Runtime

Backend variables are read by `config/config.js`. Required production values are validated at startup.

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP server port | `8000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/wikitruth` |
| `MONGODB_DBNAME` | Database name | `wikitruth` |
| `SYSTEM_EMAIL` | System sender/contact email | `dev@example.com` (dev fallback) |
| `WIKITRUTH_CRYPTO_KEY` | Cookie/session signing key | generated in non-production |
| `WIKITRUTH_JWT_SECRET` | JWT signing secret | generated in non-production |
| `TRUST_PROXY` | Express trust proxy flag | `false` |
| `SESSION_COOKIE_SECURE` | Secure session cookie | `true` in production |
| `SECURITY_HELMET_ENABLED` | Enable Helmet middleware | `true` |
| `SECURITY_HELMET_CONTENT_SECURITY_POLICY` | Enable CSP headers | `false` |
| `GRECAPTCHA_SECRET` | Google reCAPTCHA v3 secret key (server-side verification) | empty (disabled) |

## React Client Build-Time

Client variables are injected through webpack `DefinePlugin` in `webpack.config.js`.

| Variable | Purpose | Default |
|---|---|---|
| `REACT_APP_API_BASE_URL` | Base URL for React API calls | `/api` |
| `REACT_APP_ERROR_REPORT_ENDPOINT` | Endpoint for runtime client error telemetry | empty (disabled) |
| `REACT_APP_ENVIRONMENT` | Client environment label | `development` / `production` |
| `CDN_ASSET_PREFIX` | Webpack `publicPath` for built bundles | `/dist/` |
| `ANALYZE_BUNDLE` | Enables bundle report generation | `false` |
| `REACT_APP_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 site key (client-side widget) | empty (disabled) |

## Example `.env`

```bash
# Backend
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/wikitruth
SYSTEM_EMAIL=dev@example.com
WIKITRUTH_CRYPTO_KEY=replace-with-strong-key
WIKITRUTH_JWT_SECRET=replace-with-strong-secret

# React client build
REACT_APP_API_BASE_URL=/api/v1
REACT_APP_ENVIRONMENT=production
REACT_APP_ERROR_REPORT_ENDPOINT=/api/monitoring/errors
CDN_ASSET_PREFIX=/dist/
ANALYZE_BUNDLE=false

# reCAPTCHA (obtain keys from https://www.google.com/recaptcha/admin)
REACT_APP_RECAPTCHA_SITE_KEY=your-recaptcha-v3-site-key
GRECAPTCHA_SECRET=your-recaptcha-v3-secret-key
```
