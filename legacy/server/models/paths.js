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
  search: prefix(basePaths.search),
  logoutSwitch: prefix(basePaths.logoutSwitch),
  fastSwitch: prefix(basePaths.fastSwitch),
  install: prefix(basePaths.install),
  admin: {
    ...basePaths.admin,
    index: prefix(basePaths.admin.index),
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
      index: prefix(basePaths.wiki.topics.index),
      entry: prefix(basePaths.wiki.topics.entry),
      create: prefix(basePaths.wiki.topics.create),
      link: {
        ...basePaths.wiki.topics.link,
        edit: prefix(basePaths.wiki.topics.link.edit),
      },
    },
    arguments: {
      ...basePaths.wiki.arguments,
      index: prefix(basePaths.wiki.arguments.index),
      entry: prefix(basePaths.wiki.arguments.entry),
      create: prefix(basePaths.wiki.arguments.create),
      link: {
        ...basePaths.wiki.arguments.link,
        edit: prefix(basePaths.wiki.arguments.link.edit),
      },
    },
    artifacts: {
      ...basePaths.wiki.artifacts,
      index: prefix(basePaths.wiki.artifacts.index),
      entry: prefix(basePaths.wiki.artifacts.entry),
      create: prefix(basePaths.wiki.artifacts.create),
    },
    questions: {
      ...basePaths.wiki.questions,
      create: prefix(basePaths.wiki.questions.create),
      index: prefix(basePaths.wiki.questions.index),
      entry: prefix(basePaths.wiki.questions.entry),
    },
    answers: {
      ...basePaths.wiki.answers,
      create: prefix(basePaths.wiki.answers.create),
      index: prefix(basePaths.wiki.answers.index),
      entry: prefix(basePaths.wiki.answers.entry),
    },
    issues: {
      ...basePaths.wiki.issues,
      create: prefix(basePaths.wiki.issues.create),
      index: prefix(basePaths.wiki.issues.index),
      entry: prefix(basePaths.wiki.issues.entry),
    },
    opinions: {
      ...basePaths.wiki.opinions,
      create: prefix(basePaths.wiki.opinions.create),
      index: prefix(basePaths.wiki.opinions.index),
      entry: prefix(basePaths.wiki.opinions.entry),
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
    visualize: prefix(basePaths.wiki.visualize),
    related: prefix(basePaths.wiki.related),
    clipboard: prefix(basePaths.wiki.clipboard),
    convert: prefix(basePaths.wiki.convert),
  },
};

module.exports = legacyPaths;
