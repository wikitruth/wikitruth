'use strict';

import * as url from 'url';

import setupEntryRouters from './setupEntryRouters';
import * as modernFlowUtils from '../../../server/src/utils/flowUtils';

const LEGACY_PREFIX = '/legacy';

function prefixPathname(pathname: string | undefined): string {
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

function prefixLegacyUrl(input: string | undefined): string {
  const value = String(input || '');
  if (!value.startsWith('/')) {
    return value;
  }

  const parsed = url.parse(value);
  parsed.pathname = prefixPathname(parsed.pathname || undefined);
  return url.format(parsed);
}

function buildGroupUrl(group: Record<string, unknown>): string {
  return prefixLegacyUrl(modernFlowUtils.buildGroupUrl(group));
}

function setModelContext(req: unknown, res: unknown, model: Record<string, unknown>, mixedMode?: boolean): void {
  modernFlowUtils.setModelContext(req, res, model, mixedMode);

  if (!model || typeof model !== 'object') {
    return;
  }

  if (model.profileBaseUrl) {
    model.profileBaseUrl = prefixLegacyUrl(String(model.profileBaseUrl));
  }

  if (model.wikiBaseUrl) {
    model.wikiBaseUrl = prefixLegacyUrl(String(model.wikiBaseUrl));
  } else {
    model.wikiBaseUrl = LEGACY_PREFIX;
  }
}

function getDiaryBaseUrl(username?: string): string {
  return prefixLegacyUrl(modernFlowUtils.getDiaryBaseUrl(username));
}

function buildReturnUrl(req: unknown, defaultBaseUrl?: string): string {
  const result = modernFlowUtils.buildReturnUrl(
    req,
    defaultBaseUrl ? prefixLegacyUrl(defaultBaseUrl) : defaultBaseUrl,
  );
  return prefixLegacyUrl(result);
}

function buildTopicReturnUrl(
  model: Record<string, unknown>,
  cancelBaseUrl: string | undefined,
  entry: unknown,
  parent: unknown,
): string {
  const result = modernFlowUtils.buildTopicReturnUrl(
    model,
    cancelBaseUrl ? prefixLegacyUrl(cancelBaseUrl) : cancelBaseUrl,
    entry,
    parent,
  );
  return prefixLegacyUrl(result);
}

function buildEntryUrl(baseUrl: string, entry: unknown): string {
  return prefixLegacyUrl(modernFlowUtils.buildEntryUrl(baseUrl, entry));
}

function buildParentUrl(req: unknown, entry: unknown): string {
  return prefixLegacyUrl(modernFlowUtils.buildParentUrl(req, entry));
}

function buildEntryReturnUrl(req: unknown, model: Record<string, unknown>): string {
  return prefixLegacyUrl(modernFlowUtils.buildEntryReturnUrl(req, model));
}

const legacyFlowUtils = {
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

export = legacyFlowUtils;
