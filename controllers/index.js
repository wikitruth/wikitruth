'use strict';

const templates = require('../models/templates'),
    paths = require('../models/paths'),
    constants = require('../models/constants'),
    flowUtils = require('../utils/flowUtils'),
    db = require('../app').db.models,
    jwt = require('jsonwebtoken'),
    cookieParser = require('cookie-parser'),
    async = require('async');

const topicController = require('./topics'),
    argumentController = require('./arguments'),
    artifactController = require('./artifacts'),
    opinionController = require('./opinions'),
    questionController = require('./questions'),
    answerController = require('./answers'),
    issueController = require('./issues');

module.exports = function (router) {

    router.get('/', async function (req, res) {
        var injectCategoryId = function (query) {
            if (res.locals.application) {
                query.categoryId = res.locals.application.exploreTopicId;
            }
        };
        var MAX_RESULT = 5;
        var model = {};
        let result = await db.Topic.findOne({})
        if (!result) {
            res.redirect(paths.install);
        } else {
            flowUtils.setScreeningModel(req, model);
            flowUtils.setModelContext(req, res, model);
            async.parallel({
                topics: async function () {
                    const query = {parentId: {$ne: null}, private: false, 'screening.status': model.screening.status};
                    injectCategoryId(query);
                    let results = await db.Topic
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        .lean()
                        .exec();
                    flowUtils.setEditorsUsername(results, function () {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                            });
                            model.topics = results;
                            if (results.length === MAX_RESULT) {
                                model.topicsMore = true;
                            }
                        });
                    });
                },
                arguments: async function () {
                    const query = {
                        ownerType: constants.OBJECT_TYPES.topic,
                        private: false,
                        'screening.status': model.screening.status
                    };
                    injectCategoryId(query);
                    let results = await db.Argument
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        .lean()
                        .exec();
                    flowUtils.setEditorsUsername(results, function () {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                                flowUtils.setVerdictModel(result);
                            });
                            model.arguments = results;
                            if (results.length === MAX_RESULT) {
                                model.argumentsMore = true;
                            }
                        });
                    });
                },
                questions: async function () {
                    const query = {
                        ownerType: constants.OBJECT_TYPES.topic,
                        private: false,
                        'screening.status': model.screening.status
                    };
                    injectCategoryId(query);
                    let results = await db.Question
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        .lean()
                        .exec();
                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                        flowUtils.setEditorsUsername(results, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                            });
                            model.questions = results;
                            if (results.length === MAX_RESULT) {
                                model.questionsMore = true;
                            }
                        });
                    });
                },
                artifacts: async function () {
                    const query = {
                        ownerType: constants.OBJECT_TYPES.topic,
                        private: false,
                        'screening.status': model.screening.status
                    };
                    injectCategoryId(query);
                    let results = await db.Artifact
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        //.lean()
                        .exec();
                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function () {
                        flowUtils.setEditorsUsername(results, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                                result.setThumbnailPath(req.params.username);
                            });
                            model.artifacts = results;
                            //console.log(results);
                            if (results.length === MAX_RESULT) {
                                model.artifactsMore = true;
                            }
                        });
                    });
                },
                answers: async function () {
                    const query = {private: false, 'screening.status': model.screening.status};
                    injectCategoryId(query);
                    let results = await db.Answer
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        .lean()
                        .exec();
                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                        flowUtils.setEditorsUsername(results, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                            });
                            model.answers = results;
                            if (results.length === MAX_RESULT) {
                                model.answersMore = true;
                            }
                        });
                    });
                },
                issues: async function () {
                    const query = {private: false, 'screening.status': model.screening.status};
                    injectCategoryId(query);
                    let results = await db.Issue
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        .lean()
                        .exec();
                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                        flowUtils.setEditorsUsername(results, function () {
                            results.forEach(function (result) {
                                result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                            });
                            model.issues = results;
                            if (results.length === MAX_RESULT) {
                                model.issuesMore = true;
                            }
                        });
                    });
                },
                opinions: async function () {
                    const query = {private: false, 'screening.status': model.screening.status};
                    injectCategoryId(query);
                    let results = await db.Opinion
                        .find(query)
                        .sort({editDate: -1})
                        .limit(MAX_RESULT)
                        .lean()
                        .exec();
                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                        flowUtils.setEditorsUsername(results, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                            });
                            model.opinions = results;
                            if (results.length === MAX_RESULT) {
                                model.opinionsMore = true;
                            }
                        });
                    });
                }
            }, function (err, results) {
                flowUtils.createEntrySet(model);
                res.render(templates.index, model);
            });
        }
    });

    /* Entry routes mapping */

    router.get('/topic(/:friendlyUrl)?/link/:id', function (req, res) {
        topicController.GET_link_entry(req, res);
    });

    router.get('/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        topicController.GET_entry(req, res);
    });

    router.get('/argument(/:friendlyUrl)?/link/:id', function (req, res) {
        argumentController.GET_link_entry(req, res);
    });

    router.get('/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        argumentController.GET_entry(req, res);
    });

    router.get('/artifact(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        artifactController.GET_entry(req, res);
    });

    router.get('/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        questionController.GET_entry(req, res);
    });

    router.get('/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        answerController.GET_entry(req, res);
    });


    /* Opinions and Aliases */

    router.get('/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/comment(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/comments/', function (req, res) {
        opinionController.GET_index(req, res);
    });

    router.get('/comments/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/comments/create', function (req, res) {
        opinionController.GET_create(req, res);
    });

    router.post('/comments/create', function (req, res) {
        opinionController.POST_create(req, res);
    });


    router.get('/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        issueController.GET_entry(req, res);
    });

    router.get('/logout-switch', function (req, res) {
        req.session.destroy();
        req.logout();
        res.redirect(paths.fastSwitch);
    });

    router.get('/fast-switch', function (req, res) {
        let model = {};
        res.render(templates.fastSwitch, model);
    });

    router.post('/fast-switch', function (req, res) {
        let model = {};
        let cookieString = req.body.cookie;
        let pin = req.body.pin;
        let success = false;
        if(cookieString && pin && pin.length == 6) {
            let secret = pin + '|' + req.app.config.jwtSecret;
            let cookies = cookieParser.JSONCookie(cookieString);
            if(cookies.length > 0) {
                for (let cookie of cookies) {
                    jwt.verify(cookie.data, secret, function (err, decoded) {
                        if (!err && decoded && decoded.userId) {
                            // pin matched, auto-login the user
                            // decoded.userId
                            // cookie.id -- client_id
                            success = true;
                            // redirect

                        }
                    });
                }
            }
        }

        if(!success) {
            model.error = 'Not cookies or session found.';
            res.render(templates.fastSwitch, model);
        }
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function() {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.wiki.related, model);
                });
            });
        });
    });

    router.get('/test', function (req, res) {
        var model = {};
        res.render('dust/test/index', model);
    });

    router.get('/vash', function (req, res) {
        var model = {
            message: 'hello world!'
        };
        res.render('vash/test.vash', model);
    });
};
