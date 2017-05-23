'use strict';

exports.port = process.env.PORT || 8000;
exports.mongodb = {
  uri: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/wikitruth',
  dbname: 'wikitruth',
  //backupRoot: '~/../wikitruth-mongodb',
  backupRoot: '~/config/mongodb',
  privateBackupRootX: '~/config/mongodb', // private data will still be persisted to disk if this is not present
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
      'words'
    ],
    privateBackupList: [
      'answers',
      'arguments',
      'argumentlinks',
      'issues',
      'opinions',
      'questions',
      'topics',
      'topiclinks'
    ],
    modelMapping: {
      answers: 'Answer',
      accountcategories: 'AccountCategory',
      accounts: 'Account',
      admingroups: 'AdminGroup',
      admin: 'Admin',
      arguments: 'Argument',
      argumentlinks: 'ArgumentLink',
      categories: 'Category',
      issues: 'Issue',
      loginattempts: 'LoginAttempt',
      opinions: 'Opinion',
      pages: 'Page',
      questions: 'Question',
      status: 'Status',
      topics: 'Topic',
      topiclinks: 'TopicLink',
      users: 'User',
      words: 'Word'
    }
  },
  gitBackupX: {
    signature: {
      name: 'Daniel Salunga',
      email: 'dsalunga@live.com'
    },
    branch: 'test',
    remote: 'dsalunga'
  },
  privateGitBackupX: { // private data won't be committed if this is not present
    signature: {
      name: 'FirstName LastName',
      email: 'email@somedomain.com'
    },
    branch: 'test',
    remote: 'dsalunga'
  }
};
exports.companyName = 'Wikitruth Foundation';
exports.projectName = 'Wikitruth';
exports.titleSlogan = 'Wikitruth, the truth in totality of human knowledge';
exports.homeUrl = 'https://wikitruth.co';
exports.systemEmail = 'your@email.com';
exports.cryptoKey = 'abc123';
exports.cacheBreaker = 'abc123';
exports.googleAnalyticsTrackingId = 'UA-abc-123';
exports.loginAttempts = {
  forIp: 50,
  forIpAndUser: 7,
  logExpiration: '20m'
};
exports.requireAccountVerification = false;
exports.smtp = {
  from: {
    name: process.env.SMTP_FROM_NAME || exports.projectName /* +' Website'*/,
    address: process.env.SMTP_FROM_ADDRESS || 'your@email.com'
  },
  credentials: {
    user: process.env.SMTP_USERNAME || 'your@email.com',
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
