'use strict';

import express, { type Express, type NextFunction, type Request, type Response, type Router } from 'express';
import path from 'path';
import fs from 'fs';

import { mountLegacyCompatibility } from './mount';
import legacyPaths from '../../server/models/paths';

const LEGACY_SERVER_ROOT = path.join(process.cwd(), 'legacy', 'server');

type LegacyCompatibilityOptions = {
  enabled?: boolean;
  staticRoot?: string;
  templatesRoot?: string;
  mountPath?: string;
};

type LegacyCompatibilityRuntime = {
  enabled: boolean;
  mounted: boolean;
  mountPath: string;
  staticRoot: string;
  templatesRoot: string;
};

type LegacyControllerFactory = (router: Router) => void;
type LegacyRequestHandler = (req: Request, res: Response, next?: NextFunction) => unknown;
type LegacyTemplateController = Record<string, LegacyRequestHandler>;
type LegacyLoginController = LegacyTemplateController & {
  init: LegacyRequestHandler;
  login: LegacyRequestHandler;
  loginTwitter: LegacyRequestHandler;
  loginGitHub: LegacyRequestHandler;
  loginFacebook: LegacyRequestHandler;
  loginGoogle: LegacyRequestHandler;
  loginApple: LegacyRequestHandler;
  loginMicrosoft: LegacyRequestHandler;
  loginTumblr: LegacyRequestHandler;
};
type LegacyForgotController = LegacyTemplateController & {
  init: LegacyRequestHandler;
  send: LegacyRequestHandler;
};
type LegacyResetController = LegacyTemplateController & {
  init: LegacyRequestHandler;
  set: LegacyRequestHandler;
};
type LegacySignupController = LegacyTemplateController & {
  init: LegacyRequestHandler;
  signup: LegacyRequestHandler;
  signupTwitter: LegacyRequestHandler;
  signupGitHub: LegacyRequestHandler;
  signupFacebook: LegacyRequestHandler;
  signupGoogle: LegacyRequestHandler;
  signupApple: LegacyRequestHandler;
  signupMicrosoft: LegacyRequestHandler;
  signupTumblr: LegacyRequestHandler;
  signupSocial: LegacyRequestHandler;
};
type LegacyContactController = LegacyTemplateController & {
  init: LegacyRequestHandler;
  sendMessage: LegacyRequestHandler;
};
type LegacyLogoutController = LegacyTemplateController & {
  init: LegacyRequestHandler;
};
type LegacyFlowUtilsModule = {
  getDiaryBaseUrl: (username?: string) => string;
  buildGroupUrl: (group: Record<string, unknown>) => string;
  setGroupModel: (req: Request, model: Record<string, unknown>) => Promise<void> | void;
};
type LegacyAppModule = {
  db?: unknown;
  config?: unknown;
};
const legacyFlowUtilsModule = require('../../server/utils/flowUtils') as LegacyFlowUtilsModule;
const legacyAppModule = require('../../server/app') as LegacyAppModule;

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function normalizeMountPath(input: unknown): string {
  const candidate = String(input || '/legacy').trim() || '/legacy';
  if (!candidate.startsWith('/')) {
    return '/' + candidate.replace(/\/+$/, '');
  }
  return candidate.replace(/\/+$/, '') || '/legacy';
}

function loadLegacyTemplateController<T>(pathParts: string[]): T {
  return require(path.join(process.cwd(), 'legacy', 'templates', 'jade', ...pathParts)) as T;
}

function attachController(legacyRouter: Router, routePath: string, controllerPath: string): void {
  const router = express.Router();
  const controllerModule = require(path.join(LEGACY_SERVER_ROOT, 'controllers', controllerPath)) as
    | LegacyControllerFactory
    | { default?: LegacyControllerFactory };
  const controller: unknown =
    typeof controllerModule === 'function' ? controllerModule : controllerModule.default;
  if (typeof controller !== 'function') {
    throw new Error(`Legacy controller "${controllerPath}" did not export a mount function.`);
  }
  (controller as LegacyControllerFactory)(router);
  legacyRouter.use(routePath, router);
}

function registerLegacyCompatibility(app: Express, options: LegacyCompatibilityOptions = {}): LegacyCompatibilityRuntime {
  const enabled = toBoolean(
    options.enabled !== undefined ? options.enabled : process.env.LEGACY_COMPATIBILITY_ENABLED,
    true,
  );
  const mountPath = normalizeMountPath(options.mountPath || process.env.LEGACY_COMPATIBILITY_MOUNT_PATH || '/legacy');

  const staticRuntime = mountLegacyCompatibility(app, {
    enabled: enabled,
    staticRoot: options.staticRoot,
    templatesRoot: options.templatesRoot,
  });

  if (staticRuntime.templatesRoot && fs.existsSync(staticRuntime.templatesRoot)) {
    app.set('views', staticRuntime.templatesRoot);
  }

  if (!enabled) {
    const disabledStatus: LegacyCompatibilityRuntime = {
      enabled: false,
      mounted: false,
      mountPath: mountPath,
      staticRoot: staticRuntime.staticRoot,
      templatesRoot: staticRuntime.templatesRoot,
    };
    console.log(
      `[compat] enabled=${disabledStatus.enabled} mounted=${disabledStatus.mounted} mountPath=${disabledStatus.mountPath} staticRoot=${disabledStatus.staticRoot} templatesRoot=${disabledStatus.templatesRoot}`,
    );
    return disabledStatus;
  }

  if (legacyAppModule && !legacyAppModule.db && (app as unknown as { db?: unknown }).db) {
    legacyAppModule.db = (app as unknown as { db?: unknown }).db;
  }
  if (legacyAppModule && !legacyAppModule.config && (app as unknown as { config?: unknown }).config) {
    legacyAppModule.config = (app as unknown as { config?: unknown }).config;
  }

  const legacyRouter = express.Router();
  const legacyLoginController = loadLegacyTemplateController<LegacyLoginController>(['login', 'index']);
  const legacyForgotController = loadLegacyTemplateController<LegacyForgotController>(['login', 'forgot', 'index']);
  const legacySignupController = loadLegacyTemplateController<LegacySignupController>(['signup', 'index']);
  const legacyContactController = loadLegacyTemplateController<LegacyContactController>(['contact', 'index']);
  const legacyLogoutController = loadLegacyTemplateController<LegacyLogoutController>(['logout', 'index']);
  const legacyResetController = loadLegacyTemplateController<LegacyResetController>(['login', 'reset', 'index']);

  legacyRouter.use(async function legacyRouteContext(req: Request, res: Response, next: NextFunction) {
    try {
      const redirect = res.redirect.bind(res);
      res.redirect = function legacyAwareRedirect(statusOrUrl: number | string, maybeUrl?: string) {
        let statusCode: number | undefined;
        let redirectUrl: string;
        if (typeof statusOrUrl === 'number') {
          statusCode = statusOrUrl;
          redirectUrl = String(maybeUrl || '');
        } else {
          redirectUrl = String(statusOrUrl || '');
        }

        if (redirectUrl.startsWith('/')) {
          if (redirectUrl === '/') {
            redirectUrl = mountPath + '/';
          } else if (!redirectUrl.startsWith(mountPath + '/')) {
            redirectUrl = mountPath + redirectUrl;
          }
        }

        if (statusCode !== undefined) {
          return redirect(statusCode, redirectUrl);
        }
        return redirect(redirectUrl);
      };

      const locals = (res.locals || {}) as Record<string, unknown>;
      locals.paths = legacyPaths as unknown as Record<string, unknown>;
      locals.legacyBaseUrl = mountPath;

      const segments = (req.path || '').split('/').filter(Boolean);
      let routeWikiBaseUrl = mountPath;
      if (segments.length >= 2 && segments[0] === 'members' && segments[1]) {
        routeWikiBaseUrl = legacyFlowUtilsModule.getDiaryBaseUrl(segments[1]);
      } else if (segments.length >= 2 && segments[0] === 'groups' && segments[1]) {
        routeWikiBaseUrl =
          legacyFlowUtilsModule.buildGroupUrl({
            _id: segments[1],
          }) + (legacyPaths as unknown as { groups: { group: { posts: string } } }).groups.group.posts;
      }
      locals.wikiBaseUrl = routeWikiBaseUrl;

      const requestWithUser = req as Request & { user?: { username?: string } };
      if (requestWithUser.user && requestWithUser.user.username) {
        locals.diaryBaseUrl = legacyFlowUtilsModule.getDiaryBaseUrl(requestWithUser.user.username);
      }

      const model = {
        wikiBaseUrl: routeWikiBaseUrl,
      } as Record<string, unknown>;
      await legacyFlowUtilsModule.setGroupModel(req, model);
      locals.model = model;

      next();
    } catch (error) {
      next(error as Error);
    }
  });

  legacyRouter.get('/:username/settings', function legacyProfileSettingsAlias(req, res) {
    const username = String(req.params.username || '');
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    if (!username) {
      return res.redirect(mountPath + '/members');
    }
    return res.redirect(`${mountPath}/members/${username}/settings${query}`);
  });

  legacyRouter.get('/admin', function legacyAdminRootAlias(req, res) {
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    // Keep legacy users inside the mounted legacy namespace instead of
    // bouncing to modern /admin shell.
    return res.redirect(`${mountPath}/admin/db-backup${query}`);
  });

  legacyRouter.route('/login')
    .get(legacyLoginController.init)
    .post(legacyLoginController.login);
  legacyRouter.get('/login/twitter', legacyLoginController.loginTwitter);
  legacyRouter.get('/login/twitter/callback', legacyLoginController.loginTwitter);
  legacyRouter.get('/login/github', legacyLoginController.loginGitHub);
  legacyRouter.get('/login/github/callback', legacyLoginController.loginGitHub);
  legacyRouter.get('/login/facebook', legacyLoginController.loginFacebook);
  legacyRouter.get('/login/facebook/callback', legacyLoginController.loginFacebook);
  legacyRouter.get('/login/google', legacyLoginController.loginGoogle);
  legacyRouter.get('/login/google/callback', legacyLoginController.loginGoogle);
  legacyRouter.get('/login/apple', legacyLoginController.loginApple);
  legacyRouter.get('/login/apple/callback', legacyLoginController.loginApple);
  legacyRouter.get('/login/microsoft', legacyLoginController.loginMicrosoft);
  legacyRouter.get('/login/microsoft/callback', legacyLoginController.loginMicrosoft);
  legacyRouter.get('/login/tumblr', legacyLoginController.loginTumblr);
  legacyRouter.get('/login/tumblr/callback', legacyLoginController.loginTumblr);

  legacyRouter.route('/login/forgot')
    .get(legacyForgotController.init)
    .post(legacyForgotController.send);
  legacyRouter.get('/login/reset', legacyResetController.init);
  legacyRouter.route('/login/reset/:email/:token')
    .get(legacyResetController.init)
    .post(legacyResetController.set);

  legacyRouter.route('/signup')
    .get(legacySignupController.init)
    .post(legacySignupController.signup);
  legacyRouter.get('/signup/twitter', legacySignupController.signupTwitter);
  legacyRouter.get('/signup/twitter/callback', legacySignupController.signupTwitter);
  legacyRouter.get('/signup/github', legacySignupController.signupGitHub);
  legacyRouter.get('/signup/github/callback', legacySignupController.signupGitHub);
  legacyRouter.get('/signup/facebook', legacySignupController.signupFacebook);
  legacyRouter.get('/signup/facebook/callback', legacySignupController.signupFacebook);
  legacyRouter.get('/signup/google', legacySignupController.signupGoogle);
  legacyRouter.get('/signup/google/callback', legacySignupController.signupGoogle);
  legacyRouter.get('/signup/apple', legacySignupController.signupApple);
  legacyRouter.get('/signup/apple/callback', legacySignupController.signupApple);
  legacyRouter.get('/signup/microsoft', legacySignupController.signupMicrosoft);
  legacyRouter.get('/signup/microsoft/callback', legacySignupController.signupMicrosoft);
  legacyRouter.get('/signup/tumblr', legacySignupController.signupTumblr);
  legacyRouter.get('/signup/tumblr/callback', legacySignupController.signupTumblr);
  legacyRouter.post('/signup/social', legacySignupController.signupSocial);

  legacyRouter.route('/contact')
    .get(legacyContactController.init)
    .post(legacyContactController.sendMessage);

  legacyRouter.get('/logout', legacyLogoutController.init);

  const controllerMounts: Array<[string, string]> = [
    ['/', 'index'],
    ['/about', 'about'],
    ['/search', 'search'],
    ['/explore', 'explore'],
    ['/screening', 'screening'],
    ['/convert', 'convert'],
    ['/visualize', 'visualize'],
    ['/topics', 'topics'],
    ['/arguments', 'arguments'],
    ['/questions', 'questions'],
    ['/answers', 'answers'],
    ['/issues', 'issues'],
    ['/opinions', 'opinions'],
    ['/artifacts', 'artifacts'],
    ['/groups', 'groups'],
    ['/members', 'members'],
    ['/outline', 'outline'],
    ['/verdict', 'verdict'],
    ['/admin', 'admin'],
    ['/install', 'install'],
    ['/clipboard', 'clipboard'],
    ['/async/app', 'async/app'],
    ['/async/entry', 'async/entry'],
    ['/async/preferences', 'async/preferences'],
    ['/async/clipboard', 'async/clipboard'],
  ];
  controllerMounts.forEach(([routePath, controllerPath]) => {
    attachController(legacyRouter, routePath, controllerPath);
  });

  app.use(mountPath, legacyRouter);
  app.get(mountPath, function (_req, res) {
    res.redirect(mountPath + '/');
  });

  const runtime: LegacyCompatibilityRuntime = {
    enabled: true,
    mounted: true,
    mountPath: mountPath,
    staticRoot: staticRuntime.staticRoot,
    templatesRoot: staticRuntime.templatesRoot,
  };
  console.log(
    `[compat] enabled=${runtime.enabled} mounted=${runtime.mounted} mountPath=${runtime.mountPath} staticRoot=${runtime.staticRoot} templatesRoot=${runtime.templatesRoot}`,
  );
  return runtime;
}

export = registerLegacyCompatibility;
