'use strict';

const path = require('path');

const basePaths = require(path.join(process.cwd(), 'server/src/models/paths'));
const LEGACY_PREFIX = '/legacy';

function prefix(pathname) {
  const value = String(pathname || '');
  if (!value.startsWith('/')) {
    return value;
  }
  if (value === '/') {
    return LEGACY_PREFIX + '/';
  }
  if (value.startsWith(LEGACY_PREFIX + '/')) {
    return value;
  }
  return LEGACY_PREFIX + value;
}

const legacyPaths = {
  ...basePaths,
  about: prefix(basePaths.about),
  contact: prefix(basePaths.contact),
  signup: prefix(basePaths.signup),
  login: prefix(basePaths.login),
  logout: prefix(basePaths.logout),
  search: prefix(basePaths.search),
  logoutSwitch: prefix(basePaths.logoutSwitch),
  fastSwitch: prefix(basePaths.fastSwitch),
  install: prefix(basePaths.install),
  admin: {
    ...basePaths.admin,
    index: prefix(basePaths.admin.index),
  },
  account: {
    ...basePaths.account,
    index: prefix(basePaths.account.index),
    settings: prefix(basePaths.account.settings),
  },
  groups: {
    ...basePaths.groups,
    index: prefix(basePaths.groups.index),
    create: prefix(basePaths.groups.create),
    group: {
      ...basePaths.groups.group,
    },
  },
  members: {
    ...basePaths.members,
    index: prefix(basePaths.members.index),
    screeners: prefix(basePaths.members.screeners),
    reviewers: prefix(basePaths.members.reviewers),
    administrators: prefix(basePaths.members.administrators),
    profile: {
      ...basePaths.members.profile,
      index: prefix(basePaths.members.profile.index),
      pages: {
        ...basePaths.members.profile.pages,
      },
    },
  },
  wiki: {
    ...basePaths.wiki,
    index: prefix(basePaths.wiki.index),
    topics: {
      ...basePaths.wiki.topics,
    },
    arguments: {
      ...basePaths.wiki.arguments,
    },
    artifacts: {
      ...basePaths.wiki.artifacts,
    },
    questions: {
      ...basePaths.wiki.questions,
    },
    answers: {
      ...basePaths.wiki.answers,
    },
    issues: {
      ...basePaths.wiki.issues,
    },
    opinions: {
      ...basePaths.wiki.opinions,
    },
    outline: {
      ...basePaths.wiki.outline,
      link: prefix(basePaths.wiki.outline.link),
    },
    verdict: {
      ...basePaths.wiki.verdict,
      update: prefix(basePaths.wiki.verdict.update),
    },
    screening: prefix(basePaths.wiki.screening),
    visualize: basePaths.wiki.visualize,
    related: prefix(basePaths.wiki.related),
    clipboard: prefix(basePaths.wiki.clipboard),
    convert: prefix(basePaths.wiki.convert),
  },
};

module.exports = legacyPaths;
