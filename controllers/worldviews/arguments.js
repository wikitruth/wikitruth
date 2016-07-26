'use strict';

var mongoose    = require('mongoose'),
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
        flowUtils.setWorldviewModels(req, model, function () {
            if(req.query.topic) {
                flowUtils.setTopicModels(req, model, function () {
                    db.Argument.find({ ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic }).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.comments = utils.randomInt(0,999);
                        });
                        model.arguments = results;
                        res.render(templates.worldviews.arguments.index, model);
                    });
                });
            } else if(req.query.worldview) {
                db.Argument.find({ ownerId: model.worldview._id, ownerType: constants.OBJECT_TYPES.worldview }).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.comments = utils.randomInt(0,999);
                        });
                        model.arguments = results;
                        res.render(templates.worldviews.arguments.index, model);
                    });
            } else {
                // Top Arguments
                db.Argument.find({ groupId: constants.CORE_GROUPS.worldviews }).limit(100).exec(function(err, results) {
                    results.forEach(function(result) {
                        if(result.ownerType === constants.OBJECT_TYPES.topic) {
                            result.topic = {
                                _id: result.ownerId
                            };
                        } else if(result.ownerType === constants.OBJECT_TYPES.worldview) {
                            result.worldview = {
                                _id: result.ownerId
                            };
                        }
                        result.comments = utils.randomInt(0,999);
                    });
                    model.arguments = results;
                    res.render(templates.worldviews.arguments.index, model);
                });
            }
        });
    });

    router.get('/entry', function (req, res) {
        var model = {};
        flowUtils.setWorldviewModels(req, model, function () {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModels(req, model, function () {
                    // Top Questions
                    var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.worldviews };
                    db.Question.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.comments = utils.randomInt(0,999);
                        });
                        model.questions = results;
                        res.render(templates.worldviews.arguments.entry, model);
                    });
                });
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setWorldviewModels(req, model, function () {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModels(req, model, function () {
                    res.render(templates.worldviews.arguments.create, model);
                });
            });
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.argument || new mongoose.Types.ObjectId() };
        db.Argument.findOne(query, function(err, result) {
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
            if(!entity.ownerId) {
                /*if(req.query.argument) { // parent is an argument
                    entity.ownerId = req.query.argument;
                    entity.ownerType = modelTypes.argument;
                } else*/
                if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = constants.OBJECT_TYPES.topic;
                } else {
                    entity.ownerId = req.query.worldview;
                    entity.ownerType = constants.OBJECT_TYPES.worldview;
                }
            }
            db.Argument.update(query, entity, {upsert: true}, function(err, writeResult) {
                res.redirect((result ? paths.worldviews.arguments.entry : paths.worldviews.arguments.index)
                    + "?worldview=" + req.query.worldview
                    + (req.query.topic ? '&topic=' + req.query.topic : '')
                    + (req.query.argument ? '&argument=' + req.query.argument : '')
                );
            });
        });
    });
};
