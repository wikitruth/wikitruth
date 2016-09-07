'use strict';

var utils       = require('../utils/utils'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models,
    flowUtils   = require('../utils/flowUtils'),
    async       = require('async');

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
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, all if has topic parameter
                if(req.query.topic) { // include TopicLinks
                    flowUtils.getTopics({ parentId: req.query.topic }, 0, function (err, results) {
                        model.topics = results;
                        callback();
                    });
                } else {
                    var query = { parentId: {$ne: null} };
                    db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } } ], function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function(result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.topics = results;
                            callback();
                        });
                    });
                }
            },
            categories: function(callback) {
                if(!req.query.topic) {
                    db.Topic.find({parentId: null }).sort({title: 1}).exec(function (err, results) {
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
                            model.categories = results;
                            callback();
                        });
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.truth.topics.index, model);
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
            res.render(templates.truth.clipboard, model);
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

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function() {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.truth.related, model);
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
