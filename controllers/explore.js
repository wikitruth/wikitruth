'use strict';

var templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var injectCategoryId = function (query) {
            if(res.locals.application) {
                query.categoryId = res.locals.application.exploreTopicId;
            }
        };

        var LIMIT = req.query.tab ? 25 : 15;
        var allTabs = !req.query.tab;
        var tab = req.query.tab ? req.query.tab : 'all';
        var model = {
            tab: tab
        };
        flowUtils.setScreeningModel(req, model);
        flowUtils.setModelContext(req, model);
        async.parallel({
            topics: function(callback) {
                if(!allTabs && model.tab !== 'topics') {
                    return callback();
                }
                var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                injectCategoryId(query);
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Topic
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                results.forEach(function(result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic);
                                });
                                model.topics = results;
                                if(results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
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
                if(!allTabs && model.tab !== 'arguments') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                injectCategoryId(query);
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Argument
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument);
                                    flowUtils.setVerdictModel(result);
                                });
                                model.arguments = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.argumentsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            questions: function(callback) {
                if(!allTabs && model.tab !== 'questions') {
                    return callback();
                }
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                injectCategoryId(query);
                //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Question
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question);
                                });
                                model.questions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.questionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            answers: function(callback) {
                if(!allTabs && model.tab !== 'answers') {
                    return callback();
                }
                //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                var query = { private: false, 'screening.status': model.screening.status };
                injectCategoryId(query);
                db.Answer
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer);
                                });
                                model.answers = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.answersMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            artifacts: function(callback) {
                if(!allTabs && model.tab !== 'artifacts') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                injectCategoryId(query);
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Artifact
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact);
                                });
                                model.artifacts = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
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
                if(!allTabs && model.tab !== 'issues') {
                    return callback();
                }
                var query = { private: false, 'screening.status': model.screening.status };
                injectCategoryId(query);
                db.Issue
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
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
                if(!allTabs && model.tab !== 'opinions') {
                    return callback();
                }
                var query = { private: false, 'screening.status': model.screening.status };
                injectCategoryId(query);
                db.Opinion
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
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
            flowUtils.setClipboardModel(req, model);
            res.render(templates.wiki.index, model);
        });
    });

};
