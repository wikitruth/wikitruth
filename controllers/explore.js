'use strict';

var templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var MAX_RESULT = 25;
        var model = {
            tab: req.query.tab ? req.query.tab : 'topics'
        };
        flowUtils.setScreeningModel(req, model);
        flowUtils.setModelContext(req, model);
        async.parallel({
            topics: function(callback) {
                if(model.tab !== 'topics') {
                    return callback();
                }
                var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Topic
                    .find(query)
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                results.forEach(function(result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.topics = results;
                                if(results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            arguments: function(callback) {
                if(model.tab !== 'arguments') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Argument
                    .find(query)
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    flowUtils.setVerdictModel(result);
                                });
                                model.arguments = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            questions: function(callback) {
                if(model.tab !== 'questions') {
                    return callback();
                }
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Question
                    .find(query)
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            flowUtils.setEditorsUsername(results, function () {
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
            answers: function(callback) {
                if(model.tab !== 'answers') {
                    return callback();
                }
                //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Answer
                    .find({ private: false, 'screening.status': model.screening.status })
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                            flowUtils.setEditorsUsername(results, function () {
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
                if(model.tab !== 'issues') {
                    return callback();
                }
                db.Issue
                    .find({ private: false, 'screening.status': model.screening.status })
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            opinions: function (callback) {
                if(model.tab !== 'opinions') {
                    return callback();
                }
                db.Opinion
                    .find({ private: false, 'screening.status': model.screening.status })
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            }/*,
            categories: function(callback) {
                flowUtils.getCategories(model, callback);
            }*/
        }, function (err, results) {
            flowUtils.setClipboardModel(req, model);
            res.render(templates.wiki.index, model);
        });
    });

};
