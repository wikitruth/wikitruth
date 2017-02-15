'use strict';

var utils       = require('../utils/utils'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models,
    flowUtils   = require('../utils/flowUtils'),
    async       = require('async');

var argumentController  = require('./arguments'),
    topicController     = require('./topics'),
    opinionController     = require('./opinions'),
    questionController     = require('./questions'),
    answerController     = require('./answers'),
    issueController     = require('./issues');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        db.User.findOne({}, function(err, result) {
            if(!result) {
                res.redirect(paths.install);
            } else {
                res.render(templates.index, model);
            }
        });
        /*async.parallel({
            truth: function(callback) {
                db.Topic.find({parentId: null }).limit(3).exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                            subtopics.forEach(function(subtopic){
                                subtopic.friendlyUrl = utils.urlify(subtopic.title);
                            });
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.truth = results;
                        callback();
                    });
                });
            },
            worldviews: function(callback) {
                db.Ideology.find({ parentId: null }).limit(3).sort({ title: 1 }).exec(function(err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Ideology.find( { parentId: result._id } ).limit(2).exec(function(err, subworldviews) {
                            result.subworldviews = subworldviews;
                            callback();
                        });
                    }, function(err) {
                        model.worldviews = results;
                        callback();
                    });
                });
            },
            morality: function(callback) {
                db.Topic.find({parentId: null}).limit(3).exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.morality = results;
                        callback();
                    });
                });
            }
        }, function (err, results) {
            // Detect if the DB has no data, if yes, redirect the user to install/1st run page.
            if(model.truth.lengh > 0) {
                res.render(templates.index, model);
            } else {
                db.User.findOne({}, function(err, result) {
                    if(!result) {
                        res.redirect(paths.install);
                    } else {
                        res.render(templates.index, model);
                    }
                });
            }
        });*/
    });

    router.get('/explore', function (req, res) {
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
                    .limit(25)
                    .lean()
                    .exec(function (err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function(result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.topics = results;
                        callback();
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
                    .limit(25)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.topic = {
                                    _id: result.ownerId
                                };
                                flowUtils.appendEntryExtra(result);
                                flowUtils.setVerdictModel(result);
                            });
                            model.arguments = results;
                            callback();
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
                    .limit(25)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.topic = {
                                    _id: result.ownerId
                                };
                                flowUtils.appendEntryExtra(result);
                            });
                            model.questions = results;
                            callback();
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
                    .limit(25)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function () {
                            results.forEach(function (result) {
                                result.topic = {
                                    _id: result.ownerId
                                };
                                flowUtils.appendEntryExtra(result);
                            });
                            model.answers = results;
                            callback();
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
                    .limit(25)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.issues = results;
                            callback();
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
                    .limit(25)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.opinions = results;
                            callback();
                        });
                    });
            },
            categories: function(callback) {
                db.Topic
                    .find({parentId: null, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code })
                    .sort({title: 1})
                    .lean()
                    .exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(3).sort({ title: 1 }).exec(function(err, subtopics) {
                            subtopics.forEach(function(subtopic){
                                subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, 38);
                            });
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.categories = results;
                        callback();
                    });
                });
            }
        }, function (err, results) {
            res.render(templates.wiki.index, model);
        });
    });

    router.get('/clipboard', function (req, res) {
        var model = {};
        var clipboard = req.session.clipboard || {};
        var topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
        var argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];
        async.parallel({
            topics: function (callback) {
                if(topicIds && topicIds.length > 0) {
                    var query = {
                        _id: {
                            $in: topicIds
                        }
                    };
                    db.Topic.find(query, function(err, results) {
                        model.topics = results;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            arguments: function (callback) {
                if(argumentIds && argumentIds.length > 0) {
                    var query = {
                        _id: {
                            $in: argumentIds
                        }
                    };
                    db.Argument.find(query, function(err, results) {
                        model.arguments = results;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err) {
            res.render(templates.wiki.clipboard, model);
        });
    });

    router.post('/clipboard', function (req, res) {
        var action = req.body.action;
        if(action === 'delete') {
            //var clipboard = req.session.clipboard;
            var topics = req.body.topics;
            var args = req.body.arguments;
            if(topics) {
                //var topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
                if( typeof topics === 'string' ) {
                    // single selection
                    topics = [topics];
                }
            }
            if(args) {
                //var argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];
                if( typeof args === 'string' ) {
                    // single selection
                    args = [args];
                }
            }
            res.redirect(req.originalUrl);
        }
    });


    router.get('/search', function (req, res) {
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
                    .limit(tab === 'all' ? 15 : 0)
                    .lean()
                    .exec(function(err, results) {
                        if(err || !results) {
                            callback(err);
                        }
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                                //result.link = false;
                            });
                            model.topics = results;
                            if(results.length > 0) {
                                if(results.length === 15) {
                                    model.topicsMore = true;
                                }
                                model.results = true;
                            }
                            callback();
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
                    .limit(tab === 'all' ? 15 : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                                flowUtils.setVerdictModel(result);
                            });
                            flowUtils.sortArguments(results);
                            model.arguments = results;
                            if (results.length > 0) {
                                if(results.length === 15) {
                                    model.argumentsMore = true;
                                }
                                model.results = true;
                            }
                            callback();
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
                    .limit(tab === 'all' ? 15 : 0)
                    .lean()
                    .exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.questions = results;
                        if(results.length > 0) {
                            model.results = true;
                        }
                        callback();
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
                    .limit(tab === 'all' ? 15 : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.answers = results;
                            if(results.length > 0) {
                                model.results = true;
                            }
                            callback();
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
                    .limit(tab === 'all' ? 15 : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.issues = results;
                            if (results.length > 0) {
                                if(results.length === 15) {
                                    model.issuesMore = true;
                                }
                                model.results = true;
                            }
                            callback();
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
                    .limit(tab === 'all' ? 15 : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.opinions = results;
                            if (results.length > 0) {
                                if(results.length === 15) {
                                    model.opinionsMore = true;
                                }
                                model.results = true;
                            }
                            callback();
                        });
                });
            }
        }, function (err, results) {
            res.render(templates.search, model);
        });
    });

    /* Entry routes mapping */

    router.get('/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        topicController.GET_entry(req, res);
    });

    router.get('/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        argumentController.GET_entry(req, res);
    });

    router.get('/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        questionController.GET_entry(req, res);
    });

    router.get('/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        answerController.GET_entry(req, res);
    });

    router.get('/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
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
