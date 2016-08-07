'use strict';

var mongoose    = require('mongoose'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    /* Issues */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModels(req, model, function () {
                    flowUtils.setQuestionModel(req, model, function () {
                        var query = {};
                        if(req.query.question) {
                            query.ownerId = model.question._id;
                            query.ownerType = constants.OBJECT_TYPES.question;
                        } else if(req.query.argument) {
                            query.ownerId = model.argument._id;
                            query.ownerType = constants.OBJECT_TYPES.argument;
                        } else {
                            query.ownerId = model.topic._id;
                            query.ownerType = constants.OBJECT_TYPES.topic;
                        }
                        db.Issue.find(query).sort({title: 1}).exec(function (err, results) {
                            results.forEach(function (result) {
                                result.comments = utils.randomInt(0, 999);
                            });
                            model.issues = results;
                            res.render(templates.truth.issues.index, model);
                        });
                    });
                });
            });
        } else {
            // Top Issues
            db.Issue.find({ ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.truth }).limit(100).exec(function(err, results) {
                results.forEach(function(result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    result.comments = utils.randomInt(0,999);
                });
                model.issues = results;
                res.render(templates.truth.issues.index, model);
            });
        }
    });

    router.get('/entry', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    flowUtils.setIssueModel(req, model, function () {
                        model.entry = model.issue;
                        res.render(templates.truth.issues.entry, model);
                    });
                });
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    flowUtils.setIssueModel(req, model, function () {
                        res.render(templates.truth.issues.create, model);
                    });
                });
            });
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.issue || new mongoose.Types.ObjectId() };
        db.Issue.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.title = req.body.title;
            entity.content = req.body.content;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
                entity.groupId = constants.CORE_GROUPS.truth;
            }
            if(!entity.ownerId) {
                if(req.query.argument) {
                    entity.ownerId = req.query.argument;
                    entity.ownerType = constants.OBJECT_TYPES.argument;
                } else if(req.query.question) {
                    entity.ownerId = req.query.question;
                    entity.ownerType = constants.OBJECT_TYPES.question;
                } else if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = constants.OBJECT_TYPES.topic;
                }
            }
            db.Issue.update(query, entity, {upsert: true}, function(err, writeResult) {
                res.redirect((result ? paths.truth.issues.entry : paths.truth.issues.index) +
                    '?topic=' + req.query.topic +
                    (req.query.argument ? '&argument=' + req.query.argument : '') +
                    (result ? '&issue=' + req.query.issue : ''));
            });
        });
    });
};
