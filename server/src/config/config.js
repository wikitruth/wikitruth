'use strict';

const crypto = require('crypto');

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const missingRequiredEnv = new Set();

function firstDefinedEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return '';
}

function envWithDefault(names, defaultValue) {
  const value = firstDefinedEnv(names);
  return value || defaultValue;
}

function envBoolean(names, defaultValue) {
  const value = firstDefinedEnv(names);
  if (!value) {
    return defaultValue;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function envList(names, defaultValue) {
  const value = firstDefinedEnv(names);
  if (!value) {
    return defaultValue;
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function envSameSite(names, defaultValue) {
  const value = firstDefinedEnv(names).toLowerCase();
  if (!value) {
    return defaultValue;
  }
  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value;
  }
  return defaultValue;
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) {
      return '';
    }
    return url.origin;
  } catch (_error) {
    return '';
  }
}

function requiredFromEnv(names, requiredLabel, devDefault) {
  const value = firstDefinedEnv(names);
  if (value) {
    return value;
  }

  if (isProduction) {
    missingRequiredEnv.add(requiredLabel);
    return '';
  }

  return devDefault;
}

function secretFromEnv(names, requiredLabel) {
  const value = firstDefinedEnv(names);
  if (value) {
    return value;
  }

  if (isProduction) {
    missingRequiredEnv.add(requiredLabel);
    return '';
  }

  return crypto.randomBytes(32).toString('hex');
}

exports.port = Number(envWithDefault(['PORT'], '8000')) || 8000;
exports.https = {
  enabled: envBoolean(['HTTPS_ENABLED'], false),
  port: Number(envWithDefault(['HTTPS_PORT'], '8443')) || 8443,
  keyPath: envWithDefault(['HTTPS_KEY_PATH'], ''),
  certPath: envWithDefault(['HTTPS_CERT_PATH'], ''),
  redirectHttp: envBoolean(['HTTP_TO_HTTPS_REDIRECT', 'HTTPS_REDIRECT_HTTP'], false),
};
exports.legacyCompatibility = {
  enabled: envBoolean(['LEGACY_COMPATIBILITY_ENABLED'], true),
  mountPath: envWithDefault(['LEGACY_COMPATIBILITY_MOUNT_PATH'], '/legacy'),
  staticRoot: envWithDefault(['LEGACY_COMPATIBILITY_STATIC_ROOT'], 'legacy/static'),
  templatesRoot: envWithDefault(['LEGACY_COMPATIBILITY_TEMPLATES_ROOT'], 'legacy/templates'),
};
exports.mongodb = {
  uri: envWithDefault(['MONGOLAB_URI', 'MONGOHQ_URL', 'MONGODB_URI'], 'mongodb://127.0.0.1:27017/wikitruth'),
  dbname: envWithDefault(['MONGODB_DBNAME'], 'wikitruth'),
  // backupRoot: '~/../wikitruth-mongodb',
  backupRoot: envWithDefault(['MONGODB_BACKUP_ROOT'], '~/config/mongodb'),
  privateBackupRootX: envWithDefault(['MONGODB_PRIVATE_BACKUP_ROOT'], '~/config/mongodb'), // private data will still be persisted to disk if this is not present
  collections: {
    backupList: [
      'users',
      'accountcategories',
      'accounts',
      'admingroups',
      'admins',
      'loginattempts',
      'entryredirects',
      'entryevents',
      'entryrevisioncounters',
      'entryrevisions',
      'changerequests',
      'reputationsnapshots',
      'knowledgereviewtasks',
      'pages',
      'status',
      'words',
    ],
    privateBackupList: [
      'authceremonies',
      'authhandoffs',
      'answers',
      'artifacts',
      'arguments',
      'argumentlinks',
      'issues',
      'opinions',
      'questions',
      'topics',
      'topiclinks',
      'anonymouscontributions',
      'civicrecords',
      'civictenants',
      'jurisdictions',
      'tenantmemberships',
      'civicentrylinks',
      'objectlinks',
      'entrytranslations',
      'passkeycredentials',
      'recoverycodesets',
    ],
    modelMapping: {
      answers: 'Answer',
      accountcategories: 'AccountCategory',
      accounts: 'Account',
      admingroups: 'AdminGroup',
      admins: 'Admin',
      arguments: 'Argument',
      argumentlinks: 'ArgumentLink',
      categories: 'Category',
      issues: 'Issue',
      loginattempts: 'LoginAttempt',
      entryredirects: 'EntryRedirect',
      entryevents: 'EntryEvent',
      entryrevisioncounters: 'EntryRevisionCounter',
      entryrevisions: 'EntryRevision',
      entrytranslations: 'EntryTranslation',
      changerequests: 'ChangeRequest',
      reputationsnapshots: 'ReputationSnapshot',
      knowledgereviewtasks: 'KnowledgeReviewTask',
      anonymouscontributions: 'AnonymousContribution',
      authceremonies: 'AuthCeremony',
      authhandoffs: 'AuthHandoff',
      civicrecords: 'CivicRecord',
      civictenants: 'CivicTenant',
      jurisdictions: 'Jurisdiction',
      tenantmemberships: 'TenantMembership',
      civicentrylinks: 'CivicEntryLink',
      objectlinks: 'ObjectLink',
      opinions: 'Opinion',
      artifacts: 'Artifact',
      pages: 'Page',
      passkeycredentials: 'PasskeyCredential',
      questions: 'Question',
      recoverycodesets: 'RecoveryCodeSet',
      status: 'Status',
      topics: 'Topic',
      topiclinks: 'TopicLink',
      users: 'User',
      words: 'Word',
    },
  },
  gitBackupX: {
    signature: {
      name: 'FirstName LastName',
      email: 'your@email.com',
    },
    branch: 'test',
    remote: 'origin',
  },
  privateGitBackupX: {
    // private data won't be committed if this is not present
    signature: {
      name: 'FirstName LastName',
      email: 'email@somedomain.com',
    },
    branch: 'test',
    remote: 'username',
  },
};

exports.companyName = envWithDefault(['COMPANY_NAME'], 'Wikitruth Foundation');
exports.projectName = envWithDefault(['PROJECT_NAME'], 'Wikitruth');
exports.titleSlogan = envWithDefault(['TITLE_SLOGAN'], 'Wikitruth, the truth in totality of human knowledge');
exports.homeUrl = envWithDefault(['HOME_URL'], 'https://wikitruth.net');
exports.systemEmail = requiredFromEnv(['SYSTEM_EMAIL', 'WIKITRUTH_SYSTEM_EMAIL'], 'SYSTEM_EMAIL', 'dev@example.com');
exports.cryptoKey = secretFromEnv(['WIKITRUTH_CRYPTO_KEY', 'CRYPTO_KEY'], 'WIKITRUTH_CRYPTO_KEY');
exports.cacheBreaker = envWithDefault(['CACHE_BREAKER'], Date.now().toString());
exports.jwtSecret = secretFromEnv(['WIKITRUTH_JWT_SECRET', 'JWT_SECRET'], 'WIKITRUTH_JWT_SECRET');
exports.mobileApi = {
  accessTokenTtlSeconds: Number(envWithDefault(['MOBILE_ACCESS_TOKEN_TTL_SECONDS'], '900')),
  refreshTokenTtlSeconds: Number(envWithDefault(['MOBILE_REFRESH_TOKEN_TTL_SECONDS'], '2592000')),
  maxRefreshSessionsPerUser: Number(envWithDefault(['MOBILE_MAX_REFRESH_SESSIONS'], '10')),
  rateLimitPerMinute: Number(envWithDefault(['MOBILE_API_RATE_LIMIT_PER_MINUTE'], '240')),
  rateLimitWindowMs: Number(envWithDefault(['MOBILE_API_RATE_LIMIT_WINDOW_MS'], '60000')),
  deprecationSunset: envWithDefault(['API_DEPRECATION_SUNSET'], '2028-12-31T23:59:59.000Z'),
  deprecationPolicyUrl: envWithDefault(['API_DEPRECATION_POLICY_URL'], exports.homeUrl + '/docs/deprecations'),
};
exports.trustProxy = envBoolean(['TRUST_PROXY'], false);
exports.session = {
  name: envWithDefault(['SESSION_COOKIE_NAME'], 'sid'),
  resave: envBoolean(['SESSION_RESAVE'], false),
  saveUninitialized: envBoolean(['SESSION_SAVE_UNINITIALIZED'], false),
  rolling: envBoolean(['SESSION_ROLLING'], false),
  proxy: envBoolean(['SESSION_PROXY'], exports.trustProxy),
  cookie: {
    httpOnly: envBoolean(['SESSION_COOKIE_HTTP_ONLY'], true),
    secure: envBoolean(['SESSION_COOKIE_SECURE'], isProduction),
    sameSite: envSameSite(['SESSION_COOKIE_SAMESITE'], 'lax'),
    maxAgeMs: Number(envWithDefault(['SESSION_COOKIE_MAX_AGE_MS'], '1209600000')),
  },
};
const defaultAuthOrigin = normalizeOrigin(envWithDefault(
  ['AUTH_CANONICAL_ORIGIN'],
  isProduction ? 'https://wikitruth.net' : envWithDefault(['WT_BASE_URL'], 'http://localhost:8000')
));
const defaultAuthHost = defaultAuthOrigin ? new URL(defaultAuthOrigin).hostname : 'localhost';
exports.webAuthn = {
  enabled: envBoolean(['WEBAUTHN_ENABLED'], true),
  rpId: envWithDefault(['WEBAUTHN_RP_ID'], isProduction ? 'wikitruth.net' : defaultAuthHost),
  rpName: envWithDefault(['WEBAUTHN_RP_NAME'], exports.projectName),
  origins: envList(['WEBAUTHN_ORIGINS'], [defaultAuthOrigin]).map(normalizeOrigin).filter(Boolean),
  canonicalOrigin: defaultAuthOrigin,
  trustedTenantOrigins: envList(['AUTH_TRUSTED_TENANT_ORIGINS'], []).map(normalizeOrigin).filter(Boolean),
  challengeTtlSeconds: Number(envWithDefault(['WEBAUTHN_CHALLENGE_TTL_SECONDS'], '300')),
  handoffTtlSeconds: Number(envWithDefault(['AUTH_HANDOFF_TTL_SECONDS'], '120')),
  stepUpMaxAgeSeconds: Number(envWithDefault(['WEBAUTHN_STEP_UP_MAX_AGE_SECONDS'], '600')),
  recoveryCodeCount: Number(envWithDefault(['WEBAUTHN_RECOVERY_CODE_COUNT'], '10')),
  adminStepUpRequired: envBoolean(['WEBAUTHN_ADMIN_STEP_UP_REQUIRED'], isProduction),
  passwordlessEnabled: envBoolean(['WEBAUTHN_PASSWORDLESS_ENABLED'], true),
};
exports.csrf = {
  ignoreMethods: envList(['CSRF_IGNORE_METHODS'], ['GET', 'HEAD', 'OPTIONS']),
  cookie: {
    signed: envBoolean(['CSRF_COOKIE_SIGNED'], true),
    secure: envBoolean(['CSRF_COOKIE_SECURE'], isProduction),
    sameSite: envSameSite(['CSRF_COOKIE_SAMESITE'], 'lax'),
  },
};
exports.anonymousContributions = {
  enabled: envBoolean(['ANONYMOUS_CONTRIBUTIONS_ENABLED'], !isProduction),
  perHour: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_PER_HOUR'], '3')),
  perDay: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_PER_DAY'], '10')),
  minimumFormAgeMs: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_MIN_FORM_AGE_MS'], '3000')),
  maximumTitleLength: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_MAX_TITLE_LENGTH'], '180')),
  maximumContentLength: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_MAX_CONTENT_LENGTH'], '12000')),
  maximumReferencesLength: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_MAX_REFERENCES_LENGTH'], '4000')),
  maximumLinks: Number(envWithDefault(['ANONYMOUS_CONTRIBUTIONS_MAX_LINKS'], '8')),
};
exports.security = {
  helmet: {
    enabled: envBoolean(['SECURITY_HELMET_ENABLED'], true),
    contentSecurityPolicy: envBoolean(['SECURITY_HELMET_CONTENT_SECURITY_POLICY'], false),
    crossOriginEmbedderPolicy: envBoolean(['SECURITY_HELMET_COEP'], false),
    crossOriginResourcePolicy: envWithDefault(['SECURITY_HELMET_CORP'], 'cross-origin'),
    referrerPolicy: envWithDefault(['SECURITY_HELMET_REFERRER_POLICY'], 'no-referrer'),
    hsts: {
      enabled: envBoolean(['SECURITY_HELMET_HSTS_ENABLED'], isProduction),
      maxAge: Number(envWithDefault(['SECURITY_HELMET_HSTS_MAX_AGE'], '15552000')),
      includeSubDomains: envBoolean(['SECURITY_HELMET_HSTS_INCLUDE_SUBDOMAINS'], true),
      preload: envBoolean(['SECURITY_HELMET_HSTS_PRELOAD'], false),
    },
  },
};
exports.googleAnalyticsTrackingId = envWithDefault(['GOOGLE_ANALYTICS_TRACKING_ID'], '');
exports.loginAttempts = {
  forIp: Number(envWithDefault(['LOGIN_ATTEMPTS_FOR_IP'], '50')),
  forIpAndUser: Number(envWithDefault(['LOGIN_ATTEMPTS_FOR_IP_AND_USER'], '7')),
  logExpiration: envWithDefault(['LOGIN_ATTEMPTS_LOG_EXPIRATION'], '20m'),
};
exports.requireAccountVerification = envBoolean(['REQUIRE_ACCOUNT_VERIFICATION'], false);
exports.smtp = {
  from: {
    name: envWithDefault(['SMTP_FROM_NAME'], exports.projectName),
    address: requiredFromEnv(['SMTP_FROM_ADDRESS'], 'SMTP_FROM_ADDRESS', 'dev@example.com'),
  },
  credentials: {
    user: requiredFromEnv(['SMTP_USERNAME'], 'SMTP_USERNAME', ''),
    password: requiredFromEnv(['SMTP_PASSWORD'], 'SMTP_PASSWORD', ''),
    host: envWithDefault(['SMTP_HOST'], 'smtp.gmail.com'),
    ssl: envBoolean(['SMTP_SSL'], true),
  },
};
exports.grecaptcha = {
  sitekey: envWithDefault(['GRECAPTCHA_SITEKEY'], ''),
  secret: envWithDefault(['GRECAPTCHA_SECRET'], ''),
};
exports.oauth = {
  twitter: {
    key: envWithDefault(['TWITTER_OAUTH_KEY'], ''),
    secret: envWithDefault(['TWITTER_OAUTH_SECRET'], ''),
  },
  facebook: {
    key: envWithDefault(['FACEBOOK_OAUTH_KEY'], ''),
    secret: envWithDefault(['FACEBOOK_OAUTH_SECRET'], ''),
  },
  github: {
    key: envWithDefault(['GITHUB_OAUTH_KEY'], ''),
    secret: envWithDefault(['GITHUB_OAUTH_SECRET'], ''),
  },
  google: {
    key: envWithDefault(['GOOGLE_OAUTH_KEY'], ''),
    secret: envWithDefault(['GOOGLE_OAUTH_SECRET'], ''),
  },
  apple: {
    key: envWithDefault(['APPLE_OAUTH_KEY'], ''),
    teamId: envWithDefault(['APPLE_OAUTH_TEAM_ID'], ''),
    keyId: envWithDefault(['APPLE_OAUTH_KEY_ID'], ''),
    privateKeyLocation: envWithDefault(['APPLE_OAUTH_PRIVATE_KEY_LOCATION'], ''),
  },
  microsoft: {
    key: envWithDefault(['MICROSOFT_OAUTH_KEY'], ''),
    secret: envWithDefault(['MICROSOFT_OAUTH_SECRET'], ''),
    tenant: envWithDefault(['MICROSOFT_OAUTH_TENANT'], 'common'),
  },
  tumblr: {
    key: envWithDefault(['TUMBLR_OAUTH_KEY'], ''),
    secret: envWithDefault(['TUMBLR_OAUTH_SECRET'], ''),
  },
};

if (isProduction && missingRequiredEnv.size > 0) {
  throw new Error(
    '[config] Missing required environment variables: ' + Array.from(missingRequiredEnv).sort().join(', ')
  );
}
