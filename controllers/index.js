'use strict';

var templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models,
    async       = require('async');

var topicController     = require('./topics'),
    argumentController  = require('./arguments'),
    artifactController  = require('./artifacts'),
    opinionController     = require('./opinions'),
    questionController     = require('./questions'),
    answerController     = require('./answers'),
    issueController     = require('./issues');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var injectCategoryId = function (query) {
            if(res.locals.application) {
                query.categoryId = res.locals.application.exploreTopicId;
            }
        };
        var MAX_RESULT = 5;
        var model = {};
        db.User.findOne({}, function(err, result) {
            if(!result) {
                res.redirect(paths.install);
            } else {
                flowUtils.setScreeningModel(req, model);
                flowUtils.setModelContext(req, model);
                async.parallel({
                    topics: function(callback) {
                        var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                        injectCategoryId(query);
                        db.Topic
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEditorsUsername(results, function() {
                                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                        results.forEach(function(result) {
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic);
                                        });
                                        model.topics = results;
                                        if(results.length === MAX_RESULT) {
                                            model.topicsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    arguments: function(callback) {
                        var query = {
                            ownerType: constants.OBJECT_TYPES.topic,
                            private: false,
                            'screening.status': model.screening.status
                        };
                        injectCategoryId(query);
                        db.Argument
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEditorsUsername(results, function() {
                                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function() {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument);
                                            flowUtils.setVerdictModel(result);
                                        });
                                        model.arguments = results;
                                        if(results.length === MAX_RESULT) {
                                            model.argumentsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    questions: function(callback) {
                        var query = {
                            ownerType: constants.OBJECT_TYPES.topic,
                            private: false,
                            'screening.status': model.screening.status
                        };
                        injectCategoryId(query);
                        db.Question
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question);
                                        });
                                        model.questions = results;
                                        if (results.length === MAX_RESULT) {
                                            model.questionsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    artifacts: function(callback) {
                        var query = {
                            ownerType: constants.OBJECT_TYPES.topic,
                            private: false,
                            'screening.status': model.screening.status
                        };
                        injectCategoryId(query);
                        db.Artifact
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact);
                                        });
                                        model.artifacts = results;
                                        console.log(results);
                                        if (results.length === MAX_RESULT) {
                                            model.artifactsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    answers: function(callback) {
                        var query = { private: false, 'screening.status': model.screening.status };
                        injectCategoryId(query);
                        db.Answer
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer);
                                        });
                                        model.answers = results;
                                        if (results.length === MAX_RESULT) {
                                            model.answersMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    issues: function (callback) {
                        var query = { private: false, 'screening.status': model.screening.status };
                        injectCategoryId(query);
                        db.Issue
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function(err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue);
                                        });
                                        model.issues = results;
                                        if (results.length === MAX_RESULT) {
                                            model.issuesMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    opinions: function (callback) {
                        var query = { private: false, 'screening.status': model.screening.status };
                        injectCategoryId(query);
                        db.Opinion
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function(err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion);
                                        });
                                        model.opinions = results;
                                        if (results.length === MAX_RESULT) {
                                            model.opinionsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    }
                }, function (err, results) {
                    res.render(templates.index, model);
                });
            }
        });
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

    router.get('/vash', function (req, res) {
        var model = {
            message: 'hello world!'
        };
        res.render('vash/test.vash', model);
    });
};
