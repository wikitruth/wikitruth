'use strict';

exports.port = process.env.PORT || 8000;
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/wikitruth',
  dbname: 'wikitruth',
  backupRoot: '~/config/mongodb',
  privateBackupRoot: '~/config/mongodb/users',
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
exports.companyName = 'Acme, Inc.';
exports.projectName = 'Wikitruth';
exports.titleSlogan = 'Wikitruth, the truth in totality of human knowledge';
exports.systemEmail = 'your@email.addy';
exports.cryptoKey = 'abc123';
exports.cacheBreaker = 'abc123';
exports.loginAttempts = {
  forIp: 50,
  forIpAndUser: 7,
  logExpiration: '20m'
};
exports.requireAccountVerification = false;
exports.smtp = {
  from: {
    name: process.env.SMTP_FROM_NAME || exports.projectName +' Website',
    address: process.env.SMTP_FROM_ADDRESS || 'your@email.addy'
  },
  credentials: {
    user: process.env.SMTP_USERNAME || 'your@email.addy',
    password: process.env.SMTP_PASSWORD || 'bl4rg!',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    ssl: true
  }
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
