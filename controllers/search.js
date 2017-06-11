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
        var tab = req.query.tab ? req.query.tab : 'all';
        var model = {
            tab: tab,
            keyword: keyword,
            results: tab !== 'all'
        };
        if(!keyword) {
            return res.render(templates.search, model);
        }
        var privacyFilter = req.user ? [ { private: false }, { private: true, createUserId: req.user.id } ] : [ { private: false } ];
        if(req.user) {
            req.params.username = req.user.username;
        }
        flowUtils.setModelContext(req, model);
        async.parallel({
            topics: function(callback) {
                if(tab !== 'all' && tab !== 'topics') {
                    return callback();
                }
                db.Topic
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        if(err || !results) {
                            callback(err);
                        }
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    //result.link = false;
                                });
                                model.topics = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
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
                if(tab !== 'all' && tab !== 'arguments') {
                    return callback();
                }
                db.Argument
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    flowUtils.setVerdictModel(result);
                                });
                                flowUtils.sortArguments(results);
                                model.arguments = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
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
                if(tab !== 'all' && tab !== 'questions') {
                    return callback();
                }
                db.Question
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.questions = results;
                            if (results.length > 0) {
                                model.results = true;
                            }
                            callback();
                        });
                    });
                });
            },
            answers: function (callback) {
                if(tab !== 'all' && tab !== 'answers') {
                    return callback();
                }
                db.Answer
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.answers = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            issues: function (callback) {
                if(tab !== 'all' && tab !== 'issues') {
                    return callback();
                }
                db.Issue
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
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
                if(tab !== 'all' && tab !== 'opinions') {
                    return callback();
                }
                db.Opinion
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
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
