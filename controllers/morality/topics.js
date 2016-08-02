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

    router.get('/entry', function (req, res) {
        // Topic home: display top subtopics, top arguments
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // Top Subtopics
                var query = { parentId: req.query.topic, groupId: constants.CORE_GROUPS.morality };
                db.Topic.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.topics = results;
                    callback();
                });
            },
            arguments: function(callback) {
                // Top Arguments
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.morality };
                db.Argument.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.arguments = results;
                    callback();
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.morality };
                db.Question.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.questions = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.morality.topics.entry, model);
        });
    });

    /**
     * basic rule: id is the entry, query.topic or topic.parentId is the parent.
     */
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
            parentTopic: function(callback) {
                var query = {
                    _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null
                };
                if(query._id) {
                    db.Topic.findOne(query, function (err, result) {
                        model.parentTopic = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.morality.topics.create, model);
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
                entity.groupId = constants.CORE_GROUPS.morality;
            }
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                res.redirect((result ? paths.morality.topics.entry : paths.morality.index)
                    + (result ? '?topic=' + result._id : req.query.topic ? '?topic=' + req.query.topic : '')
                );
            });
        });
    });
};