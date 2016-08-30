'use strict';

var utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, 999 if has topic parameter
                if(req.query.topic) { // include TopicLinks
                    flowUtils.getTopics({ parentId: req.query.topic }, 999, function (err, results) {
                        model.topics = results;
                        callback();
                    });
                } else {
                    var query = { groupId: constants.CORE_GROUPS.truth, parentId: {$ne: null} };
                    db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } } ], function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function(result) {
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
                    db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.truth }).sort({title: 1}).exec(function (err, results) {
                        async.each(results, function(result, callback) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                            db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
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
};
