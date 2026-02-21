'use strict';

exports.port = process.env.PORT || 8000;
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/wikitruth',
  dbname: process.env.MONGODB_DBNAME || 'wikitruth',
  backupRoot: process.env.MONGODB_BACKUP_ROOT || '~/config/mongodb',
  privateBackupRoot: process.env.MONGODB_PRIVATE_BACKUP_ROOT || '~/config/mongodb/users',
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
  tumblr: {
    key: process.env.TUMBLR_OAUTH_KEY || '',
    secret: process.env.TUMBLR_OAUTH_SECRET || ''
  }
};
