'use strict';

var async           = require('async'),
    flowUtils       = require('../utils/flowUtils'),
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
            }
        }, function () {
            next();
        });
    });
};