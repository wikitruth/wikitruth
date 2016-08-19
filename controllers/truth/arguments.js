'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    /* Arguments */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModels(req, model, function () {
                    var query = {};
                    if(req.query.argument) {
                        query.parentId = model.argument._id;
                    } else {
                        query.parentId = null;
                        query.ownerId = model.topic._id;
                        query.ownerType = constants.OBJECT_TYPES.topic;
                    }
                    db.Argument.find(query).sort({ title: 1 }).exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                                if (utils.randomBool()) {
                                    result.isLink = true;
                                }
                                if (query.parentId && utils.randomBool()) {
                                    result.pro = true;
                                }
                            });
                            model.arguments = results;
                            res.render(templates.truth.arguments.index, model);
                        });
                    });
                });
            });
        } else {
            // Top Discussions
            db.Argument.find({ ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.truth }).limit(100).exec(function(err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtra(result);
                    });
                    model.arguments = results;
                    res.render(templates.truth.arguments.index, model);
                });
            });
        }
    });

    router.get('/entry', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            argument: function (callback) {
                flowUtils.setArgumentModels(req, model, callback);
            },
            arguments: function(callback) {
                // Top Arguments
                var query = {
                    parentId: req.query.argument,
                    ownerId: req.query.topic,
                    ownerType: constants.OBJECT_TYPES.topic,
                    groupId: constants.CORE_GROUPS.truth
                };
                db.Argument.find(query).limit(15).exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                            if (utils.randomBool()) {
                                result.isLink = true;
                            }
                            if (utils.randomBool()) {
                                result.pro = true;
                            }
                        });
                        model.arguments = results;
                        callback();
                    });
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.truth };
                db.Question.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
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
                var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.truth };
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
                var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.truth };
                db.Opinion.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.opinions = results;
                    callback();
                });
            }
        }, function (err, results) {
            model.entry = model.argument;
            res.render(templates.truth.arguments.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            async.series({
                argument: function (callback) {
                    if(req.query.id) {
                        db.Argument.findOne({_id: req.query.id}, function (err, result) {
                            model.argument = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                parentArgument: function (callback) {
                    var query = { _id: req.query.argument ? req.query.argument : model.argument && model.argument.parentId ? model.argument.parentId : null };
                    if(query._id) {
                        db.Argument.findOne(query, function (err, result) {
                            model.parentArgument = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                }
            }, function (err, results) {
                res.render(templates.truth.arguments.create, model);
            });
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
        db.Argument.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.references = req.body.references;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            entity.parentId = req.body.parent ? req.body.parent : null;
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
                entity.groupId = constants.CORE_GROUPS.truth;
            }
            if(!entity.ownerId) {
                /*if(req.query.argument) { // parent is an argument
                    entity.ownerId = req.query.argument;
                    entity.ownerType = modelTypes.argument;
                } else*/
                if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = constants.OBJECT_TYPES.topic;
                }
            }
            db.Argument.update(query, entity, {upsert: true}, function(err, writeResult) {
                res.redirect((result ? paths.truth.arguments.entry : paths.truth.arguments.index)
                    + '?topic=' + req.query.topic + (result ? '&argument=' + result._id : '')
                );
            });
        });
    });
};
