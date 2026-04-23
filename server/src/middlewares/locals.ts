'use strict';

import type { NextFunction, Request, Response } from 'express';
import type { AppContext, ApplicationsModule } from '../types/models';

const async = require('async');
const url = require('url');
const flowUtils = require('../utils/flowUtils') as {
  getDiaryBaseUrl(username: string): string;
  getCategories(model: { categories?: unknown[] }, topicId: string | null, req: Request): Promise<void>;
  getDiaryCategories(req: Request): Promise<unknown[]>;
  getUserGroups(req: Request): Promise<unknown[]>;
  setGroupModel(req: Request, model: { group?: unknown }): Promise<void>;
};
const paths = require('../models/paths');
const applications = require('../models/applications') as ApplicationsModule;

export default function configureLocals(app: AppContext & { use: (...args: unknown[]) => void }, _passport: unknown) {
  // this code runs for all routes
  app.use(/^[^.]+$/, async function (req: Request, res: Response, next: NextFunction) {
    res.cookie('_csrfToken', req.csrfToken());
    res.locals._csrf = req.csrfToken(); // should be no longer needed even adding _csrf manually in forms or request body

    let cookies = req.cookies.fast_switch || [];
    if (cookies.length > 0) {
      res.locals.fastSwitch = true;
    }

    if (req.user) {
      res.locals.user = {
        username: req.user.username,
        defaultReturnUrl: req.user.defaultReturnUrl(),
        isAdmin: req.user.isAdmin(),
        roles: req.user.roles,
      };
      res.locals.isContributor = req.user.username;
      res.locals.diaryBaseUrl = flowUtils.getDiaryBaseUrl(req.user.username);
    } else if (res.locals.user) {
      delete res.locals.user;
    }

    // allow templates to access the request query
    res.locals.query = req.query;
    res.locals.preferences = req.session.preferences;

    await async.parallel({
      setApplication: async function () {
        // set the application
        const model: { categories?: unknown[] } = {};
        let application = applications.getApplication(req);
        res.locals.application = application;
        if (application) {
          // a sub-application. set cache to req-level
          application.resPath = application.id + '/';
          res.locals.projectName = application.navTitle;
          res.locals.titleSlogan = application.slogan;
          res.locals.googleAnalyticsTrackingId = application.googleAnalyticsTrackingId;

          if (!application.appCategories) {
            await flowUtils.getCategories(model, application.exploreTopicId || null, req);
            application.appCategories = model.categories;
            res.locals.appCategories = model.categories;
          } else {
            res.locals.appCategories = application.appCategories;
          }
        } else {
          // the default Wikitruth Project application. set cache to app-level
          if (!app.locals?.appCategories) {
            await flowUtils.getCategories(model, null, req);
            if (app.locals) {
              app.locals.appCategories = model.categories;
            }
          }
        }
      },
      diaryCategoriesCache: async function () {
        // Diary Categories
        if (req.user) {
          if (!req.session.diaryCategories) {
            const results = await flowUtils.getDiaryCategories(req);
            req.session.diaryCategories = results;
            res.locals.diaryCategories = results;
          } else {
            res.locals.diaryCategories = req.session.diaryCategories;
          }
        }
      },
      userGroupsCache: async function () {
        if (req.user) {
          if (!req.session.myGroups) {
            let results = await flowUtils.getUserGroups(req);
            req.session.myGroups = results;
            res.locals.myGroups = results;
          } else {
            res.locals.myGroups = req.session.myGroups;
          }
        }
      },
      currentGroup: async function () {
        const baseUrl = url.parse(req.originalUrl);
        const params = (baseUrl.pathname || '').split('/');
        if (params.length >= 4 && '/' + params[1].toLowerCase() === paths.groups.index) {
          const model: { group?: unknown } = {};
          req.query.group = params[3];
          await flowUtils.setGroupModel(req, model);
          res.locals.group = model.group;
        }
      },
    });
    next();
  });
};
