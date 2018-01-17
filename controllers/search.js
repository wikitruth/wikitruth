'use strict';

var templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var MAX_RESULT = 15;
        var keyword = req.query.q;
        var allTabs = !req.query.tab;
        var searchContent = (req.query.content ? req.query.content : 'all').toLowerCase();
        var limit = allTabs ? MAX_RESULT : 0;
        var tab = req.query.tab ? req.query.tab : 'all';
        var model = {
            tab: tab,
            keyword: keyword,
            content: searchContent,
            results: !allTabs // this is to allow the user to switch to other tabs if the current is empty
        };
        if(!keyword) {
            return res.render(templates.search, model);
        }
        var privacyFilter = [ { private: false } ];
        switch (searchContent) {
            case 'wiki':
                privacyFilter = [ { private: false } ];
                break;
            case 'diary':
                privacyFilter = req.user ? [ { private: true, createUserId: req.user.id } ] : [ { private: false } ];
                break;
            //case 'all':
            default:
                privacyFilter = req.user ? [ { private: false }, { private: true, createUserId: req.user.id } ] : [ { private: false } ];
        }
        if(req.user) {
            req.params.username = req.user.username;
        }
        flowUtils.setModelContext(req, model);
        async.parallel({
            topics: function(callback) {
                if(!allTabs && tab !== 'topics') {
                    return callback();
                }
                db.Topic
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    .lean()
                    .exec(function(err, results) {
                        if(err || !results) {
                            callback(err);
                        }
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                    //result.link = false;
                                });
                                model.topics = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= MAX_RESULT) {
                                        model.topicsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            },
            arguments: function(callback) {
                if(!allTabs && tab !== 'arguments') {
                    return callback();
                }
                db.Argument
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                                    flowUtils.setVerdictModel(result);
                                });
                                flowUtils.sortArguments(results);
                                model.arguments = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= MAX_RESULT) {
                                        model.argumentsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            },
            questions: function (callback) {
                if(!allTabs && tab !== 'questions') {
                    return callback();
                }
                db.Question
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    .lean()
                    .exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                            });
                            model.questions = results;
                            if (results.length > 0) {
                                if (allTabs && results.length >= MAX_RESULT) {
                                    model.questionsMore = true;
                                }
                                model.results = true;
                            }
                            callback();
                        });
                    });
                });
            },
            answers: function (callback) {
                if(!allTabs && tab !== 'answers') {
                    return callback();
                }
                db.Answer
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                                });
                                model.answers = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= MAX_RESULT) {
                                        model.answersMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            artifacts: function (callback) {
                if(!allTabs && tab !== 'artifacts') {
                    return callback();
                }
                db.Artifact
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    //.lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                                    result.setThumbnailPath(req.params.username);
                                });
                                model.artifacts = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= MAX_RESULT) {
                                        model.artifactsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            issues: function (callback) {
                if(!allTabs && tab !== 'issues') {
                    return callback();
                }
                db.Issue
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= MAX_RESULT) {
                                        model.issuesMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            },
            opinions: function (callback) {
                if(!allTabs && tab !== 'opinions') {
                    return callback();
                }
                db.Opinion
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(limit)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= MAX_RESULT) {
                                        model.opinionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            }
        }, function (err, results) {
            res.render(templates.search, model);
        });
    });

};
