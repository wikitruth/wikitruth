'use strict';

import type { Request, Response } from 'express';
import type { AppContext } from '../types/models';

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

function mapLegacyPathToModern(req: Request): string {
  const normalizedPath = normalizePath(req.path);

  if (normalizedPath === '/') {
    return '/app';
  }

  const exactMap: Record<string, string> = {
    '/home': '/app',
    '/about': '/app/about',
    '/contact': '/app/contact',
    '/explore': '/app/explore',
    '/search': '/app/search',
    '/login': '/app/login',
    '/login/forgot': '/app/forgot-password',
    '/login/reset': '/app/reset-password',
    '/signup': '/app/signup',
    '/logout': '/app/logout',
    '/screening': '/app/screening',
    '/convert': '/app/convert',
    '/visualize': '/app/visualize',
    '/install': '/app/install',
    '/fast-switch': '/app/fast-switch',
    '/clipboard': '/app/clipboard',
    '/notifications': '/app/notifications',
    '/timeline': '/app/timeline',
    '/help-us': '/app/help-us',
    '/create': '/app/create',
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
    return `/app/reset-password?email=${email}&token=${token}`;
  }

  const socialCallbackMatch = normalizedPath.match(
    /^\/(signup|login|account\/settings)\/(twitter|github|facebook|google|apple|microsoft)\/callback$/,
  );
  if (socialCallbackMatch) {
    const routeGroup = socialCallbackMatch[1] || '';
    if (routeGroup === 'account/settings') {
      return '/app/account/settings';
    }
    return '/app/login';
  }

  const singularEntryMatches: Array<{ pattern: RegExp; targetPrefix: string }> = [
    { pattern: /^\/topic\/(.+)$/, targetPrefix: '/app/topics/entry/' },
    { pattern: /^\/argument\/(.+)$/, targetPrefix: '/app/arguments/entry/' },
    { pattern: /^\/question\/(.+)$/, targetPrefix: '/app/questions/entry/' },
    { pattern: /^\/answer\/(.+)$/, targetPrefix: '/app/answers/entry/' },
    { pattern: /^\/issue\/(.+)$/, targetPrefix: '/app/issues/entry/' },
    { pattern: /^\/opinion\/(.+)$/, targetPrefix: '/app/opinions/entry/' },
    { pattern: /^\/artifact\/(.+)$/, targetPrefix: '/app/artifacts/entry/' },
  ];

  for (const entryMatch of singularEntryMatches) {
    const matched = normalizedPath.match(entryMatch.pattern);
    if (matched) {
      return withQuery(`${entryMatch.targetPrefix}${matched[1]}`, req.originalUrl);
    }
  }

  const modernPathPrefixes = [
    '/account',
    '/admin',
    '/topics',
    '/arguments',
    '/questions',
    '/answers',
    '/issues',
    '/opinions',
    '/artifacts',
    '/groups',
    '/members',
    '/outline',
    '/visualize',
  ];

  for (const prefix of modernPathPrefixes) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return withQuery(`/app${normalizedPath}`, req.originalUrl);
    }
  }

  return '/app';
}

function redirectToModernApp(req: Request, res: Response): void {
  res.redirect(mapLegacyPathToModern(req));
}

module.exports = function registerLegacyPathRedirects(app: AppRouteRegistrar, _passport: unknown): void {
  const legacyRoutePatterns = [
    '/',
    '/home',
    '/home/*',
    '/about',
    '/about/*',
    '/contact',
    '/contact/*',
    '/explore',
    '/explore/*',
    '/search',
    '/search/*',
    '/login',
    '/login/*',
    '/login/twitter/callback/',
    '/login/github/callback/',
    '/login/facebook/callback/',
    '/login/google/callback/',
    '/login/apple/callback/',
    '/login/microsoft/callback/',
    '/signup',
    '/signup/*',
    '/signup/twitter/callback/',
    '/signup/github/callback/',
    '/signup/facebook/callback/',
    '/signup/google/callback/',
    '/signup/apple/callback/',
    '/signup/microsoft/callback/',
    '/logout',
    '/logout/*',
    '/account',
    '/account/*',
    '/account/settings/twitter/callback/',
    '/account/settings/github/callback/',
    '/account/settings/facebook/callback/',
    '/account/settings/google/callback/',
    '/account/settings/apple/callback/',
    '/account/settings/microsoft/callback/',
    '/admin',
    '/admin/*',
    '/topics',
    '/topics/*',
    '/topic/*',
    '/arguments',
    '/arguments/*',
    '/argument/*',
    '/questions',
    '/questions/*',
    '/question/*',
    '/answers',
    '/answers/*',
    '/answer/*',
    '/issues',
    '/issues/*',
    '/issue/*',
    '/opinions',
    '/opinions/*',
    '/opinion/*',
    '/artifacts',
    '/artifacts/*',
    '/artifact/*',
    '/groups',
    '/groups/*',
    '/members',
    '/members/*',
    '/screening',
    '/screening/*',
    '/convert',
    '/convert/*',
    '/visualize',
    '/visualize/*',
    '/outline',
    '/outline/*',
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
  ];

  legacyRoutePatterns.forEach((pattern) => {
    app.get(pattern, redirectToModernApp);
  });
};
