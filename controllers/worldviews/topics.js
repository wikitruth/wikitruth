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
            item: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, 100 if has topic parameter
                var query = req.query.topic ? { parentId: req.query.topic } : { groupId: constants.CORE_GROUPS.worldviews };
                db.Topic.find(query).limit(req.query.topic ? 100 : 15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.topics = results;
                    callback();
                });
            },
            categories: function(callback) {
                if(!req.query.topic) {
                    db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.worldviews }).sort({title: 1}).exec(function (err, results) {
                        results.forEach(function (result) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        });
                        model.categories = results;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.worldviews.topics.index, model);
        });
    });

    router.get('/entry', function (req, res) {
        // Topic home: display top subtopics, top arguments
        var model = {};
        async.parallel({
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
            }
        }, function (err, results) {
            res.render(templates.worldviews.topics.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        async.series({
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
            parent: function(callback) {
                var query = {
                    _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null
                };
                if(query._id) {
                    db.Topic.findOne(query, function (err, result) {
                        model.parent = result;
                        callback();
                    });
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
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                res.redirect(result ? paths.worldviews.topics.entry : paths.worldviews.index
                    + (req.query.topic ? '?topic=' + req.query.id : '')
                );
            });
        });
    });
};
