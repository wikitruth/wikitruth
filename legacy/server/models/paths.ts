'use strict';

import basePaths from '../../../server/src/models/paths';

const LEGACY_PREFIX = '/legacy';

function prefix(pathname: unknown): string {
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

const typedBasePaths = basePaths as Record<string, any>;
const legacyPaths: Record<string, any> = {
  ...typedBasePaths,
  about: prefix(typedBasePaths.about),
  contact: prefix(typedBasePaths.contact),
  signup: prefix(typedBasePaths.signup),
  login: prefix(typedBasePaths.login),
  logout: prefix(typedBasePaths.logout),
  search: prefix(typedBasePaths.search),
  logoutSwitch: prefix(typedBasePaths.logoutSwitch),
  fastSwitch: prefix(typedBasePaths.fastSwitch),
  install: prefix(typedBasePaths.install),
  admin: {
    ...typedBasePaths.admin,
    index: prefix(typedBasePaths.admin.index),
  },
  account: {
    ...typedBasePaths.account,
    index: prefix(typedBasePaths.account.index),
    settings: prefix(typedBasePaths.account.settings),
  },
  groups: {
    ...typedBasePaths.groups,
    index: prefix(typedBasePaths.groups.index),
    create: prefix(typedBasePaths.groups.create),
    group: {
      ...typedBasePaths.groups.group,
    },
  },
  members: {
    ...typedBasePaths.members,
    index: prefix(typedBasePaths.members.index),
    screeners: prefix(typedBasePaths.members.screeners),
    reviewers: prefix(typedBasePaths.members.reviewers),
    administrators: prefix(typedBasePaths.members.administrators),
    profile: {
      ...typedBasePaths.members.profile,
      index: prefix(typedBasePaths.members.profile.index),
      pages: {
        ...typedBasePaths.members.profile.pages,
      },
    },
  },
  wiki: {
    ...typedBasePaths.wiki,
    index: prefix(typedBasePaths.wiki.index),
    topics: {
      ...typedBasePaths.wiki.topics,
    },
    arguments: {
      ...typedBasePaths.wiki.arguments,
    },
    artifacts: {
      ...typedBasePaths.wiki.artifacts,
    },
    questions: {
      ...typedBasePaths.wiki.questions,
    },
    answers: {
      ...typedBasePaths.wiki.answers,
    },
    issues: {
      ...typedBasePaths.wiki.issues,
    },
    opinions: {
      ...typedBasePaths.wiki.opinions,
    },
    outline: {
      ...typedBasePaths.wiki.outline,
      link: prefix(typedBasePaths.wiki.outline.link),
    },
    verdict: {
      ...typedBasePaths.wiki.verdict,
      update: prefix(typedBasePaths.wiki.verdict.update),
    },
    screening: prefix(typedBasePaths.wiki.screening),
    visualize: typedBasePaths.wiki.visualize,
    related: prefix(typedBasePaths.wiki.related),
    clipboard: prefix(typedBasePaths.wiki.clipboard),
    convert: prefix(typedBasePaths.wiki.convert),
  },
};

export = legacyPaths;
