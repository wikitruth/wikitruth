'use strict';

var async           = require('async'),
    url             = require('url'),
    flowUtils       = require('../utils/flowUtils'),
    paths           = require('../models/paths'),
    applications    = require('../models/applications');

module.exports = function(app, passport) {

    // response locals

    app.use(/^[^\.]+$/, function(req, res, next) {
        //res.cookie('_csrfToken', req.csrfToken());

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
            diaryCategories: function (callback) {
                // Diary Categories
                if(req.user) {
                    if (!app.locals.diaryCategories) {
                        flowUtils.getDiaryCategories(req, function (err, results) {
                            app.locals.diaryCategories = results;
                            callback();
                        });
                    } else {
                        callback();
                    }
                } else {
                    if(app.locals.diaryCategories) {
                        delete app.locals.diaryCategories;
                    }
                    callback();
                }
            },
            userGroups: function (callback) {
                if(req.user) {
                    if (!app.locals.myGroups) {
                        flowUtils.getUserGroups(req, function (err, results) {
                            app.locals.myGroups = results;
                            callback();
                        });
                    } else {
                        callback();
                    }
                } else {
                    if(app.locals.myGroups) {
                        delete app.locals.myGroups;
                    }
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
                        res.locals.groupBaseUrl = model.groupBaseUrl;
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