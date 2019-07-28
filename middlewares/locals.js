'use strict';

var async           = require('async'),
    url             = require('url'),
    flowUtils       = require('../utils/flowUtils'),
    paths           = require('../models/paths'),
    applications    = require('../models/applications');

module.exports = function(app, passport) {

    // response locals

    // this code runs for all routes
    app.use(/^[^\.]+$/, function(req, res, next) {
        res.cookie('_csrfToken', req.csrfToken());
        res.locals._csrf = req.csrfToken(); // should be no longer needed even adding _csrf manually in forms or request body

        let cookies = req.cookies.fast_switch || [];
        if(cookies.length > 0) {
            res.locals.fastSwitch = true;
        }

        if(req.user) {
            res.locals.user = {};
            res.locals.user.username = req.user.username;
            res.locals.user.defaultReturnUrl = req.user.defaultReturnUrl();
            res.locals.user.isAdmin = req.user.isAdmin();
            res.locals.user.roles = req.user.roles;
            res.locals.isContributor = req.user.username;
            res.locals.diaryBaseUrl = flowUtils.getDiaryBaseUrl(req.user.username);
        } else if(res.locals.user) {
            delete res.locals.user;
        }

        // allow templates to access the request query
        res.locals.query = req.query;
        res.locals.preferences = req.session.preferences;

        async.parallel({
            setApplication: function (callback) {
                // set the application
                var model = {};
                var application = applications.getApplication(req);
                res.locals.application = application;
                if(application) {
                    // a sub-application. set cache to req-level
                    application.resPath = application.id + '/';
                    res.locals.projectName = application.navTitle;
                    res.locals.titleSlogan = application.slogan;
                    res.locals.googleAnalyticsTrackingId = application.googleAnalyticsTrackingId;

                    if(!application.appCategories) {
                        flowUtils.getCategories(model, application.exploreTopicId, req, function () {
                            application.appCategories = model.categories;
                            res.locals.appCategories = model.categories;
                            callback();
                        });
                    } else {
                        res.locals.appCategories = application.appCategories;
                        callback();
                    }
                } else {
                    // the default Wikitruth Project application. set cache to app-level
                    if(!app.locals.appCategories) {
                        flowUtils.getCategories(model, null, req, function () {
                            app.locals.appCategories = model.categories;
                            callback();
                        });
                    } else {
                        callback();
                    }
                }
            },
            diaryCategoriesCache: function (callback) {
                // Diary Categories
                if(req.user) {
                    if (!req.session.diaryCategories) {
                        flowUtils.getDiaryCategories(req, function (err, results) {
                            req.session.diaryCategories = results;
                            res.locals.diaryCategories = results;
                            callback();
                        });
                    } else {
                        res.locals.diaryCategories = req.session.diaryCategories;
                        callback();
                    }
                } else {
                    callback();
                }
            },
            userGroupsCache: function (callback) {
                if(req.user) {
                    if (!req.session.myGroups) {
                        flowUtils.getUserGroups(req, function (err, results) {
                            req.session.myGroups = results;
                            res.locals.myGroups = results;
                            callback();
                        });
                    } else {
                        res.locals.myGroups = req.session.myGroups;
                        callback();
                    }
                } else {
                    callback();
                }
            },
            currentGroup: function (callback) {
                var baseUrl = url.parse(req.originalUrl);
                var params = baseUrl.pathname.split('/');
                if(params.length >= 4 && '/' + params[1].toLowerCase() == paths.groups.index) {
                    var model = {};
                    req.query.group = params[3];
                    flowUtils.setGroupModel(req, model, function () {
                        res.locals.group = model.group;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function () {
            next();
        });
    });
};