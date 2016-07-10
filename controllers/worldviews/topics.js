'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            worldview: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, 100 if has topic parameter
                var query = { groupId: constants.CORE_GROUPS.worldviews };
                if(req.query.worldview) {
                    query.ownerId = req.query.worldview;
                    query.ownerType = constants.OBJECT_TYPES.worldview;
                    query.parentId = req.query.topic ? req.query.topic : null;
                }
                db.Topic.find(query).limit(req.query.worldview ? 100 : 15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                        result.worldview = {
                            _id: result.ownerId
                        };
                    });
                    model.topics = results;
                    callback();
                });
            }/*,
            categories: function(callback) {
                if(!req.query.topic && !req.query.worldview) {
                    db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.worldviews }).sort({title: 1}).exec(function (err, results) {
                        results.forEach(function (result) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                            result.worldview = {
                                _id: result.ownerId
                            };
                        });
                        model.categories = results;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            arguments: function(callback) {
                if(req.query.topic || req.query.worldview) {
                    var query = {};
                    if(req.query.topic) {
                        query.ownerId = req.query.topic;
                        query.ownerType = constants.OBJECT_TYPES.topic;
                    } else {
                        query.ownerId = req.query.worldview;
                        query.ownerType = constants.OBJECT_TYPES.worldview;
                    }
                    db.Argument.find(query).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                        });
                        model.arguments = results;
                        callback();
                    });
                } else {
                    // Top Arguments
                    db.Argument.find({ groupId: constants.CORE_GROUPS.worldviews }).limit(100).exec(function(err, results) {
                        results.forEach(function(result) {
                            if(result.ownerType === constants.OBJECT_TYPES.topic) {
                                result.topic = {
                                    _id: result.ownerId
                                };
                            } else {
                                result.worldview = {
                                    _id: result.ownerId
                                };
                            }
                            result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                        });
                        model.arguments = results;
                        callback();
                    });
                }
            }*/
        }, function (err, results) {
            res.render(templates.worldviews.topics.index, model);
        });
    });

    router.get('/entry', function (req, res) {
        // Topic home: display top subtopics, top arguments
        var model = {};
        async.parallel({
            worldview: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // Top Subtopics
                var query = { parentId: req.query.topic, groupId: constants.CORE_GROUPS.worldviews };
                db.Topic.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.topics = results;
                    callback();
                });
            },
            arguments: function(callback) {
                // Top Arguments
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.worldviews };
                db.Argument.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.arguments = results;
                    callback();
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.worldviews };
                db.Question.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.questions = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.worldviews.topics.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        async.series({
            worldview: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            topic: function(callback){
                if(req.query.id) {
                    db.Topic.findOne({_id: req.query.id}, function (err, result) {
                        model.topic = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parentTopic: function(callback) {
                var query = {
                    _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null
                };
                if(query._id) {
                    db.Topic.findOne(query, function (err, result) {
                        model.parentTopic = result;
                        callback();
                    });
                    /*if(req.query.worldview) {
                        db.Ideology.findOne({_id: query}, function(err, result) {
                            model.parent = result;
                            callback();
                        });
                    } else {
                    }*/
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.worldviews.topics.create, model);
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
        db.Topic.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.references = req.body.references;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
                entity.groupId = constants.CORE_GROUPS.worldviews;
            }
            if(req.query.worldview && (!entity.ownerId || entity.ownerId.toString() !== req.query.worldview)) {
                entity.ownerId = req.query.worldview;
                entity.ownerType = constants.OBJECT_TYPES.worldview;
            }
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect(paths.worldviews.topics.entry + '?worldview=' + req.query.worldview + '&topic=' + result._id);
                } else {
                    res.redirect(paths.worldviews.topics.index + '?worldview=' + req.query.worldview + (req.query.id ? '&topic=' + req.query.id : req.query.topic ? '&topic=' + req.query.topic : ''));
                }
            });
        });
    });
};
