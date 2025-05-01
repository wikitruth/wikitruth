'use strict';

let async = require('async'),
  url = require('url'),
  flowUtils = require('../utils/flowUtils'),
  paths = require('../models/paths'),
  applications = require('../models/applications');

module.exports = function (app, passport) {
  // this code runs for all routes
  app.use(/^[^.]+$/, async function (req, res, next) {
    res.cookie('_csrfToken', req.csrfToken());
    res.locals._csrf = req.csrfToken(); // should be no longer needed even adding _csrf manually in forms or request body

    let cookies = req.cookies.fast_switch || [];
    if (cookies.length > 0) {
      res.locals.fastSwitch = true;
    }

    if (req.user) {
      res.locals.user = {};
      res.locals.user.username = req.user.username;
      res.locals.user.defaultReturnUrl = req.user.defaultReturnUrl();
      res.locals.user.isAdmin = req.user.isAdmin();
      res.locals.user.roles = req.user.roles;
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
        let model = {};
        let application = applications.getApplication(req);
        res.locals.application = application;
        if (application) {
          // a sub-application. set cache to req-level
          application.resPath = application.id + '/';
          res.locals.projectName = application.navTitle;
          res.locals.titleSlogan = application.slogan;
          res.locals.googleAnalyticsTrackingId = application.googleAnalyticsTrackingId;

          if (!application.appCategories) {
            await flowUtils.getCategories(model, application.exploreTopicId, req);
            application.appCategories = model.categories;
            res.locals.appCategories = model.categories;
          } else {
            res.locals.appCategories = application.appCategories;
          }
        } else {
          // the default Wikitruth Project application. set cache to app-level
          if (!app.locals.appCategories) {
            await flowUtils.getCategories(model, null, req);
            app.locals.appCategories = model.categories;
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
        const params = baseUrl.pathname.split('/');
        if (params.length >= 4 && '/' + params[1].toLowerCase() === paths.groups.index) {
          let model = {};
          req.query.group = params[3];
          await flowUtils.setGroupModel(req, model);
          res.locals.group = model.group;
        }
      },
    });
    next();
  });
};
