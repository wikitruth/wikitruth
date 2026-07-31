'use strict';

exports.port = process.env.PORT || 8000;
exports.https = {
  enabled: process.env.HTTPS_ENABLED === 'true',
  port: Number(process.env.HTTPS_PORT || 8443),
  keyPath: process.env.HTTPS_KEY_PATH || '',
  certPath: process.env.HTTPS_CERT_PATH || '',
  redirectHttp: (process.env.HTTP_TO_HTTPS_REDIRECT || process.env.HTTPS_REDIRECT_HTTP) === 'true'
};
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/wikitruth',
  dbname: process.env.MONGODB_DBNAME || 'wikitruth',
  backupRoot: process.env.MONGODB_BACKUP_ROOT || '~/.wikitruth/backups/public',
  privateBackupRoot: process.env.MONGODB_PRIVATE_BACKUP_ROOT || '~/.wikitruth/backups/private',
  collections: {
    backupList: [
      'users',
      'accountcategories',
      'accounts',
      'admingroups',
      'admins',
      'arguments',
      'issues',
      'loginattempts',
      'opinions',
      'pages',
      'questions',
      'status',
      'topics',
      'civictenants',
      'jurisdictions',
      'tenantmemberships',
      'civicrecords',
      'civicentrylinks',
      'words'
    ],
    modelMapping: {
      accountcategories: 'AccountCategory',
      accounts: 'Account',
      admingroups: 'AdminGroup',
      admins: 'Admin',
      arguments: 'Argument',
      categories: 'Category',
      issues: 'Issue',
      loginattempts: 'LoginAttempt',
      opinions: 'Opinion',
      pages: 'Page',
      questions: 'Question',
      sessions: 'Session',
      status: 'Status',
      topics: 'Topic',
      civictenants: 'CivicTenant',
      jurisdictions: 'Jurisdiction',
      tenantmemberships: 'TenantMembership',
      civicrecords: 'CivicRecord',
      civicentrylinks: 'CivicEntryLink',
      users: 'User',
      words: 'Word'
    }
  },
  gitBackup: {
    signature: {
      name: 'FirstName LastName',
      email: 'email@somedomain.com'
    }
  },
  privateGitBackup: {
    signature: {
      name: 'FirstName LastName',
      email: 'email@somedomain.com'
    }
  }
};

exports.companyName = process.env.COMPANY_NAME || 'Acme, Inc.';
exports.projectName = process.env.PROJECT_NAME || 'Wikitruth';
exports.titleSlogan = process.env.TITLE_SLOGAN || 'Wikitruth, the truth in totality of human knowledge';
exports.systemEmail = process.env.SYSTEM_EMAIL || 'dev@example.com';

/******************************************************************************
 * Required secrets in production:
 * - WIKITRUTH_CRYPTO_KEY
 * - WIKITRUTH_JWT_SECRET
 * - SMTP_FROM_ADDRESS
 * - SMTP_USERNAME
 * - SMTP_PASSWORD
 *****************************************************************************/
exports.cryptoKey = process.env.WIKITRUTH_CRYPTO_KEY || '';
exports.cacheBreaker = process.env.CACHE_BREAKER || '';
exports.jwtSecret = process.env.WIKITRUTH_JWT_SECRET || '';
exports.trustProxy = process.env.TRUST_PROXY === 'true';
exports.session = {
  name: process.env.SESSION_COOKIE_NAME || 'sid',
  resave: process.env.SESSION_RESAVE === 'true',
  saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === 'true',
  rolling: process.env.SESSION_ROLLING === 'true',
  proxy: process.env.SESSION_PROXY === 'true',
  cookie: {
    httpOnly: process.env.SESSION_COOKIE_HTTP_ONLY
      ? process.env.SESSION_COOKIE_HTTP_ONLY === 'true'
      : true,
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    sameSite: process.env.SESSION_COOKIE_SAMESITE || 'lax',
    maxAgeMs: Number(process.env.SESSION_COOKIE_MAX_AGE_MS || 1209600000)
  },
  authenticated: {
    standardMaxAgeMs: Number(process.env.AUTH_SESSION_STANDARD_MAX_AGE_MS || 86400000),
    rememberedMaxAgeMs: Number(process.env.AUTH_SESSION_REMEMBERED_MAX_AGE_MS || 2592000000),
    activityUpdateIntervalMs: Number(process.env.AUTH_SESSION_ACTIVITY_UPDATE_INTERVAL_MS || 300000)
  }
};
exports.emailAuth = {
  enabled: process.env.EMAIL_AUTH_ENABLED !== 'false',
  codeTtlSeconds: Number(process.env.EMAIL_AUTH_CODE_TTL_SECONDS || 600),
  maximumAttempts: Number(process.env.EMAIL_AUTH_MAXIMUM_ATTEMPTS || 5),
  resendDelaySeconds: Number(process.env.EMAIL_AUTH_RESEND_DELAY_SECONDS || 60),
  maximumRequestsPerEmailPerHour: Number(process.env.EMAIL_AUTH_MAX_REQUESTS_PER_EMAIL_PER_HOUR || 5),
  maximumRequestsPerIpPerHour: Number(process.env.EMAIL_AUTH_MAX_REQUESTS_PER_IP_PER_HOUR || 20)
};
exports.webAuthn = {
  enabled: process.env.WEBAUTHN_ENABLED !== 'false',
  rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
  rpName: process.env.WEBAUTHN_RP_NAME || 'Wikitruth',
  origins: (process.env.WEBAUTHN_ORIGINS || 'http://localhost:8000').split(',').map(function (value) { return value.trim(); }).filter(Boolean),
  canonicalOrigin: process.env.AUTH_CANONICAL_ORIGIN || 'http://localhost:8000',
  trustedTenantOrigins: (process.env.AUTH_TRUSTED_TENANT_ORIGINS || '').split(',').map(function (value) { return value.trim(); }).filter(Boolean),
  challengeTtlSeconds: Number(process.env.WEBAUTHN_CHALLENGE_TTL_SECONDS || 300),
  handoffTtlSeconds: Number(process.env.AUTH_HANDOFF_TTL_SECONDS || 120),
  stepUpMaxAgeSeconds: Number(process.env.WEBAUTHN_STEP_UP_MAX_AGE_SECONDS || 600),
  recoveryCodeCount: Number(process.env.WEBAUTHN_RECOVERY_CODE_COUNT || 10),
  adminStepUpRequired: process.env.WEBAUTHN_ADMIN_STEP_UP_REQUIRED === 'true',
  passwordlessEnabled: process.env.WEBAUTHN_PASSWORDLESS_ENABLED !== 'false'
};
exports.csrf = {
  ignoreMethods: process.env.CSRF_IGNORE_METHODS
    ? process.env.CSRF_IGNORE_METHODS.split(',').map(function (item) {
      return item.trim();
    }).filter(Boolean)
    : ['GET', 'HEAD', 'OPTIONS'],
  cookie: {
    signed: process.env.CSRF_COOKIE_SIGNED
      ? process.env.CSRF_COOKIE_SIGNED === 'true'
      : true,
    secure: process.env.CSRF_COOKIE_SECURE === 'true',
    sameSite: process.env.CSRF_COOKIE_SAMESITE || 'lax'
  }
};
exports.security = {
  helmet: {
    enabled: process.env.SECURITY_HELMET_ENABLED
      ? process.env.SECURITY_HELMET_ENABLED === 'true'
      : true,
    contentSecurityPolicy: process.env.SECURITY_HELMET_CONTENT_SECURITY_POLICY === 'true',
    crossOriginEmbedderPolicy: process.env.SECURITY_HELMET_COEP === 'true',
    crossOriginResourcePolicy: process.env.SECURITY_HELMET_CORP || 'cross-origin',
    referrerPolicy: process.env.SECURITY_HELMET_REFERRER_POLICY || 'no-referrer',
    hsts: {
      enabled: process.env.SECURITY_HELMET_HSTS_ENABLED
        ? process.env.SECURITY_HELMET_HSTS_ENABLED === 'true'
        : false,
      maxAge: Number(process.env.SECURITY_HELMET_HSTS_MAX_AGE || 15552000),
      includeSubDomains: process.env.SECURITY_HELMET_HSTS_INCLUDE_SUBDOMAINS
        ? process.env.SECURITY_HELMET_HSTS_INCLUDE_SUBDOMAINS === 'true'
        : true,
      preload: process.env.SECURITY_HELMET_HSTS_PRELOAD === 'true'
    }
  }
};
exports.realtime = {
  adapter: process.env.REALTIME_EVENT_ADAPTER || 'memory',
  mongoPollMs: Number(process.env.REALTIME_MONGO_POLL_MS || 1000),
  mongoRetentionHours: Number(process.env.REALTIME_MONGO_RETENTION_HOURS || 24)
};
exports.googleAnalyticsTrackingId = process.env.GOOGLE_ANALYTICS_TRACKING_ID || '';
exports.loginAttempts = {
  forIp: Number(process.env.LOGIN_ATTEMPTS_FOR_IP || 50),
  forIpAndUser: Number(process.env.LOGIN_ATTEMPTS_FOR_IP_AND_USER || 7),
  logExpiration: process.env.LOGIN_ATTEMPTS_LOG_EXPIRATION || '20m'
};
exports.requireAccountVerification = process.env.REQUIRE_ACCOUNT_VERIFICATION === 'true';
exports.smtp = {
  from: {
    name: process.env.SMTP_FROM_NAME || exports.projectName + ' Website',
    address: process.env.SMTP_FROM_ADDRESS || 'dev@example.com'
  },
  credentials: {
    user: process.env.SMTP_USERNAME || '',
    password: process.env.SMTP_PASSWORD || '',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    ssl: process.env.SMTP_SSL ? process.env.SMTP_SSL === 'true' : true
  }
};
exports.grecaptcha = {
  sitekey: process.env.GRECAPTCHA_SITEKEY || '',
  secret: process.env.GRECAPTCHA_SECRET || ''
};
exports.oauth = {
  twitter: {
    key: process.env.TWITTER_OAUTH_KEY || '',
    secret: process.env.TWITTER_OAUTH_SECRET || ''
  },
  facebook: {
    key: process.env.FACEBOOK_OAUTH_KEY || '',
    secret: process.env.FACEBOOK_OAUTH_SECRET || ''
  },
  github: {
    key: process.env.GITHUB_OAUTH_KEY || '',
    secret: process.env.GITHUB_OAUTH_SECRET || ''
  },
  google: {
    key: process.env.GOOGLE_OAUTH_KEY || '',
    secret: process.env.GOOGLE_OAUTH_SECRET || ''
  },
  apple: {
    key: process.env.APPLE_OAUTH_KEY || '',
    teamId: process.env.APPLE_OAUTH_TEAM_ID || '',
    keyId: process.env.APPLE_OAUTH_KEY_ID || '',
    privateKeyLocation: process.env.APPLE_OAUTH_PRIVATE_KEY_LOCATION || ''
  },
  microsoft: {
    key: process.env.MICROSOFT_OAUTH_KEY || '',
    secret: process.env.MICROSOFT_OAUTH_SECRET || '',
    tenant: process.env.MICROSOFT_OAUTH_TENANT || 'common'
  },
  tumblr: {
    key: process.env.TUMBLR_OAUTH_KEY || '',
    secret: process.env.TUMBLR_OAUTH_SECRET || ''
  }
};
