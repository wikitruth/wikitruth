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
                var query = { parentId: req.query.topic, groupId: constants.CORE_GROUPS.truth };
                flowUtils.getTopics(query, 15, function (err, results) {
                    model.topics = results;
                    callback();
                });
            },
            arguments: function(callback) {
                // Top Arguments
                var query = {
                    parentId: null,
                    ownerId: req.query.topic,
                    ownerType: constants.OBJECT_TYPES.topic
                };
                flowUtils.getArguments(query, -1, function (err, results) {
                    //model.arguments = results;
                    callback(null, results);
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.truth };
                db.Question.find(query).limit(15).exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.questions = results;
                        callback();
                    });
                });
            },
            issues: function (callback) {
                // Top Issues
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.truth };
                db.Issue.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.issues = results;
                    callback();
                });
            },
            opinions: function (callback) {
                // Top Opinions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.truth };
                db.Opinion.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.opinions = results;
                    callback();
                });
            }
        }, function (err, results) {
            var verdict = model.topic.verdict && model.topic.verdict.status ? model.topic.verdict.status : constants.VERDICT_STATUS.pending;
            model.verdict = {
                label: constants.VERDICT_STATUS.getLabel(verdict),
                color: constants.VERDICT_STATUS.getColor(verdict)
            };
            model.entry = model.topic;
            model.arguments = results.arguments.slice(0, 15);
            model.entryType = constants.OBJECT_TYPES.topic;
            if(model.isTopicOwner) {
                model.isEntryOwner = true;
            }
            model.verdict.counts = flowUtils.getVerdictCount(results.arguments);
            flowUtils.prepareClipboardOptions(req, model, constants.OBJECT_TYPES.topic);
            res.render(templates.truth.topics.entry, model);
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
                var query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
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
            res.render(templates.truth.topics.create, model);
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
                entity.groupId = constants.CORE_GROUPS.truth;
            }
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                res.redirect((result ? paths.truth.topics.entry : paths.truth.index) +
                    (result ? '?topic=' + result._id : req.query.topic ? '?topic=' + req.query.topic : '')
                );
            });
        });
    });
};
