'use strict';

const path = require('path');
const url = require('url');
const setupEntryRouters = require('./setupEntryRouters');
const modernFlowUtils = require(path.join(process.cwd(), 'server/src/utils/flowUtils'));
const LEGACY_PREFIX = '/legacy';

function prefixPathname(pathname) {
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

function prefixLegacyUrl(input) {
  const value = String(input || '');
  if (!value.startsWith('/')) {
    return value;
  }

  const parsed = url.parse(value);
  parsed.pathname = prefixPathname(parsed.pathname);
  return url.format(parsed);
}

function buildGroupUrl(group) {
  return prefixLegacyUrl(modernFlowUtils.buildGroupUrl(group));
}

function setModelContext(req, res, model, mixedMode) {
  modernFlowUtils.setModelContext(req, res, model, mixedMode);

  if (!model || typeof model !== 'object') {
    return;
  }

  if (model.profileBaseUrl) {
    model.profileBaseUrl = prefixLegacyUrl(model.profileBaseUrl);
  }

  if (model.wikiBaseUrl) {
    model.wikiBaseUrl = prefixLegacyUrl(model.wikiBaseUrl);
  } else {
    model.wikiBaseUrl = LEGACY_PREFIX;
  }
}

function getDiaryBaseUrl(username) {
  return prefixLegacyUrl(modernFlowUtils.getDiaryBaseUrl(username));
}

function buildReturnUrl(req, defaultBaseUrl) {
  const result = modernFlowUtils.buildReturnUrl(
    req,
    defaultBaseUrl ? prefixLegacyUrl(defaultBaseUrl) : defaultBaseUrl,
  );
  return prefixLegacyUrl(result);
}

function buildTopicReturnUrl(model, cancelBaseUrl, entry, parent) {
  const result = modernFlowUtils.buildTopicReturnUrl(
    model,
    cancelBaseUrl ? prefixLegacyUrl(cancelBaseUrl) : cancelBaseUrl,
    entry,
    parent,
  );
  return prefixLegacyUrl(result);
}

function buildEntryUrl(baseUrl, entry) {
  return prefixLegacyUrl(modernFlowUtils.buildEntryUrl(baseUrl, entry));
}

function buildParentUrl(req, entry) {
  return prefixLegacyUrl(modernFlowUtils.buildParentUrl(req, entry));
}

function buildEntryReturnUrl(req, model) {
  return prefixLegacyUrl(modernFlowUtils.buildEntryReturnUrl(req, model));
}

module.exports = {
  ...modernFlowUtils,
  buildGroupUrl,
  setModelContext,
  getDiaryBaseUrl,
  buildReturnUrl,
  buildTopicReturnUrl,
  buildEntryUrl,
  buildParentUrl,
  buildEntryReturnUrl,
  setupEntryRouters,
};
