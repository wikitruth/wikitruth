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
      'pages',
      'status',
      'words',
    ],
    privateBackupList: [
      'answers',
      'artifacts',
      'arguments',
      'argumentlinks',
      'issues',
      'opinions',
      'questions',
      'topics',
      'topiclinks',
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
      opinions: 'Opinion',
      artifacts: 'Artifact',
      pages: 'Page',
      questions: 'Question',
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
    remote: 'dsalunga',
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
exports.trustProxy = envBoolean(['TRUST_PROXY'], false);
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
