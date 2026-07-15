'use strict';

import type { NextFunction, Request, Response } from 'express';
import type { AppContext } from '../types/models';
import { renderReactShell, resolveReactShellApplication } from '../services/reactShellService';

type AppRouteRegistrar = AppContext & {
  get: (...args: unknown[]) => unknown;
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function withQuery(pathname: string, originalUrl: string): string {
  const queryStart = originalUrl.indexOf('?');
  if (queryStart === -1) {
    return pathname;
  }
  return `${pathname}${originalUrl.slice(queryStart)}`;
}

function getFirstQueryValue(req: Request, keys: string[]): string {
  for (const key of keys) {
    const rawValue = req.query?.[key];
    if (Array.isArray(rawValue)) {
      const firstValue = String(rawValue[0] || '').trim();
      if (firstValue) {
        return firstValue;
      }
      continue;
    }
    const value = String(rawValue || '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function withMergedQuery(pathname: string, originalUrl: string, nextValues: Record<string, string | undefined>): string {
  const queryStart = originalUrl.indexOf('?');
  const query = new URLSearchParams(queryStart === -1 ? '' : originalUrl.slice(queryStart + 1));

  Object.entries(nextValues).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      query.set(key, value);
    }
  });

  const suffix = query.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

function mapLegacyPathToModern(req: Request): string {
  const normalizedPath = normalizePath(req.path);

  if (normalizedPath === '/app') {
    return withQuery('/', req.originalUrl);
  }
  if (normalizedPath.startsWith('/app/')) {
    const modernPath = normalizedPath.slice(4) || '/';
    return withQuery(modernPath, req.originalUrl);
  }

  const exactMap: Record<string, string> = {
    '/home': '/',
    '/wiki': '/explore',
    '/login/forgot': '/forgot-password',
    '/login/reset': '/reset-password',
  };

  if (exactMap[normalizedPath]) {
    return withQuery(exactMap[normalizedPath], req.originalUrl);
  }

  const resetTokenMatch = normalizedPath.match(/^\/login\/reset\/([^/]+)\/([^/]+)$/);
  if (resetTokenMatch) {
    const emailValue = resetTokenMatch[1] || '';
    const tokenValue = resetTokenMatch[2] || '';
    const email = encodeURIComponent(decodeURIComponent(emailValue));
    const token = encodeURIComponent(decodeURIComponent(tokenValue));
    return `/reset-password?email=${email}&token=${token}`;
  }

  const socialCallbackMatch = normalizedPath.match(
    /^\/(signup|login|account\/settings)\/(twitter|github|facebook|google|apple|microsoft)\/callback$/,
  );
  if (socialCallbackMatch) {
    const routeGroup = socialCallbackMatch[1] || '';
    if (routeGroup === 'account/settings') {
      return '/account/settings';
    }
    return '/login';
  }

  if (normalizedPath === '/related') {
    const topicId = getFirstQueryValue(req, ['topic', 'topicId']);
    if (topicId) {
      return `/topics/entry/${encodeURIComponent(topicId)}`;
    }

    const argumentId = getFirstQueryValue(req, ['argument', 'argumentId']);
    if (argumentId) {
      return `/arguments/entry/${encodeURIComponent(argumentId)}`;
    }

    const questionId = getFirstQueryValue(req, ['question', 'questionId']);
    if (questionId) {
      return `/questions/entry/${encodeURIComponent(questionId)}`;
    }

    const answerId = getFirstQueryValue(req, ['answer', 'answerId']);
    if (answerId) {
      return `/answers/entry/${encodeURIComponent(answerId)}`;
    }

    const issueId = getFirstQueryValue(req, ['issue', 'issueId']);
    if (issueId) {
      return `/issues/entry/${encodeURIComponent(issueId)}`;
    }

    const opinionId = getFirstQueryValue(req, ['opinion', 'comment', 'opinionId']);
    if (opinionId) {
      return `/opinions/entry/${encodeURIComponent(opinionId)}`;
    }

    const artifactId = getFirstQueryValue(req, ['artifact', 'artifactId']);
    if (artifactId) {
      return `/artifacts/entry/${encodeURIComponent(artifactId)}`;
    }

    return '/explore';
  }

  if (normalizedPath === '/verdict/update') {
    const topicId = getFirstQueryValue(req, ['topic', 'topicId']);
    if (topicId) {
      return withMergedQuery(`/admin/verdicts/${encodeURIComponent(topicId)}`, req.originalUrl, {
        type: 'topic',
      });
    }

    const argumentId = getFirstQueryValue(req, ['argument', 'argumentId']);
    if (argumentId) {
      return withMergedQuery(`/admin/verdicts/${encodeURIComponent(argumentId)}`, req.originalUrl, {
        type: 'argument',
      });
    }

    const entryId = getFirstQueryValue(req, ['id']);
    if (entryId) {
      return withMergedQuery(`/admin/verdicts/${encodeURIComponent(entryId)}`, req.originalUrl, {
        type: getFirstQueryValue(req, ['type']) || undefined,
      });
    }

    return '/admin/verdicts';
  }

  if (normalizedPath === '/outline/create') {
    const topicId = getFirstQueryValue(req, ['topic', 'topicId']);
    const argumentId = getFirstQueryValue(req, ['argument', 'argumentId']);
    const parentId = topicId || argumentId || getFirstQueryValue(req, ['parentId']);

    if (!parentId) {
      return '/create';
    }

    return withMergedQuery('/outline/link', req.originalUrl, {
      parentId: parentId,
      parentType: topicId ? 'topic' : argumentId ? 'argument' : getFirstQueryValue(req, ['parentType']) || undefined,
    });
  }

  if (normalizedPath === '/topics/link/edit') {
    const topicLinkId = getFirstQueryValue(req, ['id', 'topicLink']);
    if (topicLinkId) {
      const encodedId = encodeURIComponent(topicLinkId);
      return withMergedQuery(`/topics/entry/${encodedId}`, req.originalUrl, {
        topicLink: topicLinkId,
        mode: 'edit-link',
      });
    }
    return '/topics';
  }

  if (normalizedPath === '/arguments/link/edit') {
    const argumentLinkId = getFirstQueryValue(req, ['id', 'argumentLink']);
    if (argumentLinkId) {
      const encodedId = encodeURIComponent(argumentLinkId);
      return withMergedQuery(`/arguments/entry/${encodedId}`, req.originalUrl, {
        argumentLink: argumentLinkId,
        mode: 'edit-link',
      });
    }
    return '/arguments';
  }

  const memberDiaryPathMatch = normalizedPath.match(/^\/members\/([^/]+)\/diary$/);
  if (memberDiaryPathMatch) {
    const username = encodeURIComponent(decodeURIComponent(memberDiaryPathMatch[1] || ''));
    return withQuery(`/members/${username}/journal`, req.originalUrl);
  }

  const topicLinkEntryMatch =
    normalizedPath.match(/^\/topic(?:\/[^/]+)?\/link\/([^/]+)$/) ||
    normalizedPath.match(/^\/topics\/entry(?:\/[^/]+)?\/link\/([^/]+)$/);
  if (topicLinkEntryMatch) {
    const topicLinkId = decodeURIComponent(topicLinkEntryMatch[1] || '');
    const encodedId = encodeURIComponent(topicLinkId);
    return withMergedQuery(`/topics/entry/${encodedId}`, req.originalUrl, {
      topicLink: topicLinkId,
    });
  }

  const argumentLinkEntryMatch =
    normalizedPath.match(/^\/argument(?:\/[^/]+)?\/link\/([^/]+)$/) ||
    normalizedPath.match(/^\/arguments\/entry(?:\/[^/]+)?\/link\/([^/]+)$/);
  if (argumentLinkEntryMatch) {
    const argumentLinkId = decodeURIComponent(argumentLinkEntryMatch[1] || '');
    const encodedId = encodeURIComponent(argumentLinkId);
    return withMergedQuery(`/arguments/entry/${encodedId}`, req.originalUrl, {
      argumentLink: argumentLinkId,
    });
  }

  const answerSingularMatch = normalizedPath.match(/^\/answer\/(.+)$/);
  if (answerSingularMatch) {
    const candidate = String(answerSingularMatch[1] || '')
      .split('/')
      .filter(Boolean)
      .pop();
    if (candidate) {
      const answerId = encodeURIComponent(decodeURIComponent(candidate));
      return withQuery(`/answers/entry/${answerId}`, req.originalUrl);
    }
  }

  const singularEntryMatches: Array<{ pattern: RegExp; targetPrefix: string }> = [
    { pattern: /^\/topic\/(.+)$/, targetPrefix: '/topics/entry/' },
    { pattern: /^\/argument\/(.+)$/, targetPrefix: '/arguments/entry/' },
    { pattern: /^\/question\/(.+)$/, targetPrefix: '/questions/entry/' },
    { pattern: /^\/issue\/(.+)$/, targetPrefix: '/issues/entry/' },
    { pattern: /^\/opinion\/(.+)$/, targetPrefix: '/opinions/entry/' },
    { pattern: /^\/comment\/(.+)$/, targetPrefix: '/opinions/entry/' },
    { pattern: /^\/artifact\/(.+)$/, targetPrefix: '/artifacts/entry/' },
  ];

  for (const entryMatch of singularEntryMatches) {
    const matched = normalizedPath.match(entryMatch.pattern);
    if (matched) {
      return withQuery(`${entryMatch.targetPrefix}${matched[1]}`, req.originalUrl);
    }
  }

  const modernPathPrefixes = [
    '/about',
    '/contact',
    '/explore',
    '/search',
    '/login',
    '/signup',
    '/logout',
    '/screening',
    '/convert',
    '/visualize',
    '/install',
    '/fast-switch',
    '/clipboard',
    '/notifications',
    '/timeline',
    '/help-us',
    '/create',
    '/contribute',
    '/account',
    '/admin',
    '/topics',
    '/arguments',
    '/questions',
    '/answers',
    '/issues',
    '/opinions',
    '/comments',
    '/artifacts',
    '/groups',
    '/members',
    '/outline',
    '/civic',
    '/policies',
  ];

  for (const prefix of modernPathPrefixes) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return withQuery(normalizedPath, req.originalUrl);
    }
  }

  return '/';
}

function redirectToModernApp(req: Request, res: Response): void {
  const target = mapLegacyPathToModern(req);
  if (target === req.originalUrl || target === req.path) {
    res.redirect('/');
    return;
  }
  res.redirect(target);
}

function serveModernShell(req: Request, res: Response, next: NextFunction): void {
  void resolveReactShellApplication(req, res.locals.application || null)
    .then((application) => renderReactShell(req, application))
    .then((html) => res.type('html').send(html))
    .catch(next);
}

function serveModernNotFoundShell(req: Request, res: Response, next: NextFunction): void {
  const excludedPrefix = /^\/(?:api|legacy|vendor|media|img|css|js|fonts|socket\.io)(?:\/|$)/i;
  const fileLikePath = /\/[^/]+\.[a-z0-9]{1,10}$/i;
  const acceptsHtml = req.accepts('html');

  if (!acceptsHtml || excludedPrefix.test(req.path) || fileLikePath.test(req.path)) {
    next();
    return;
  }

  void resolveReactShellApplication(req, res.locals.application || null)
    .then((application) => renderReactShell(req, application))
    .then((html) => res.status(404).type('html').send(html))
    .catch(next);
}

export default function registerLegacyPathRedirects(app: AppRouteRegistrar, _passport: unknown): void {
  const modernShellPatterns = [
    '/',
    '/about',
    '/about/*',
    '/contact',
    '/explore',
    '/search',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/logout',
    '/account',
    '/account/*',
    '/admin',
    '/admin/*',
    '/topics',
    '/topics/*',
    '/arguments',
    '/arguments/*',
    '/questions',
    '/questions/*',
    '/answers',
    '/answers/*',
    '/issues',
    '/issues/*',
    '/opinions',
    '/opinions/*',
    '/artifacts',
    '/artifacts/*',
    '/groups',
    '/groups/*',
    '/members',
    '/members/*',
    '/outline',
    '/outline/*',
    '/screening',
    '/screening/*',
    '/convert',
    '/convert/*',
    '/visualize',
    '/visualize/*',
    '/install',
    '/install/*',
    '/fast-switch',
    '/fast-switch/*',
    '/clipboard',
    '/clipboard/*',
    '/notifications',
    '/notifications/*',
    '/timeline',
    '/timeline/*',
    '/help-us',
    '/help-us/*',
    '/create',
    '/create/*',
    '/contribute',
    '/contribute/*',
    '/comments',
    '/comments/*',
    '/civic',
    '/civic/*',
    '/policies',
    '/500',
    '/503',
  ];

  const legacyRoutePatterns = [
    '/app',
    '/app/*',
    '/home',
    '/home/*',
    '/wiki',
    '/wiki/*',
    '/login/forgot',
    '/login/forgot/*',
    '/login/reset',
    '/login/reset/*',
    '/login/twitter/callback/',
    '/login/github/callback/',
    '/login/facebook/callback/',
    '/login/google/callback/',
    '/login/apple/callback/',
    '/login/microsoft/callback/',
    '/signup/twitter/callback/',
    '/signup/github/callback/',
    '/signup/facebook/callback/',
    '/signup/google/callback/',
    '/signup/apple/callback/',
    '/signup/microsoft/callback/',
    '/account/settings/twitter/callback/',
    '/account/settings/github/callback/',
    '/account/settings/facebook/callback/',
    '/account/settings/google/callback/',
    '/account/settings/apple/callback/',
    '/account/settings/microsoft/callback/',
    '/topic/*',
    '/argument/*',
    '/question/*',
    '/answer/*',
    '/issue/*',
    '/opinion/*',
    '/artifact/*',
    '/members/:username/diary',
    '/members/profile/diary',
    '/comment/*',
    '/related',
    '/related/*',
    '/verdict/update',
    '/verdict/update/*',
    '/outline/create',
    '/outline/create/*',
    '/topics/link/edit',
    '/topics/link/edit/*',
    '/arguments/link/edit',
    '/arguments/link/edit/*',
    '/topics/entry/*/link/*',
    '/arguments/entry/*/link/*',
  ];

  legacyRoutePatterns.forEach((pattern) => {
    app.get(pattern, redirectToModernApp);
  });

  modernShellPatterns.forEach((pattern) => {
    app.get(pattern, serveModernShell);
  });

  app.get('*', serveModernNotFoundShell);
};
