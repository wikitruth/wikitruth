'use strict';

var constants   = require('../../models/constants'),
    flowUtils   = require('../../utils/flowUtils'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.post('/take-ownership', function (req, res) {
        var id = req.body.id;
        var type = req.body.type;

        if(req.user.isAdmin()) {
            var dateNow = Date.now();
            var query = {_id: id};
            if(type == constants.OBJECT_TYPES.topic) {
                db.Topic.findOne(query, function (err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.Topic.update(query, entry, {upsert: true}, function (err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.topicLink) {
                    db.TopicLink.findOne(query, function(err, entry) {
                        entry.createUserId = req.user.id;
                        entry.editUserId = req.user.id;
                        entry.editDate = dateNow;
                        db.TopicLink.update(query, entry, {upsert: true}, function(err, writeResult) {
                            res.send({});
                        });
                    });
            } else if(type == constants.OBJECT_TYPES.argument) {
                db.Argument.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.Argument.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.argumentLink) {
                db.ArgumentLink.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.ArgumentLink.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.question) {
                db.Question.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.Question.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.answer) {
                db.Answer.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.Answer.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.issue) {
                db.Issue.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.Issue.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.opinion) {
                db.Opinion.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = dateNow;
                    db.Opinion.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else {
                res.send({});
            }
        } else {
            res.send({});
        }
    });

    router.post('/delete', function (req, res) {
        var id = req.body.id;
        var type = req.body.type;

        if(req.user.isAdmin()) {
            switch (type) {
                case constants.OBJECT_TYPES.topic:
                    db.Topic.findByIdAndRemove(id, function (err, entry) {
                        if (entry.parentId) {
                            flowUtils.updateChildrenCount(entry.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                                res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                            });
                        } else {
                            res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                        }
                    });
                    break;
                case constants.OBJECT_TYPES.topicLink:
                        db.TopicLink.findByIdAndRemove(id, function (err, entry) {
                            flowUtils.updateChildrenCount(entry.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                                res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                            });
                        });
                    break;
                case constants.OBJECT_TYPES.argument:
                    db.Argument.findByIdAndRemove(id, function (err, entry) {
                        if (entry.parentId) {
                            flowUtils.updateChildrenCount(entry.parentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, function () {
                                res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                            });
                        } else {
                            flowUtils.updateChildrenCount(entry.ownerId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument, function () {
                                res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                            });
                        }
                    });
                    break;
                case constants.OBJECT_TYPES.argumentLink:
                    db.ArgumentLink.findByIdAndRemove(id, function (err, entry) {
                        if (entry.parentId) {
                            flowUtils.updateChildrenCount(entry.parentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, function () {
                                res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                            });
                        } else {
                            flowUtils.updateChildrenCount(entry.ownerId, entry.ownerType, constants.OBJECT_TYPES.argument, function () {
                                res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                            });
                        }
                    });
                    break;
                case constants.OBJECT_TYPES.question:
                    db.Question.findByIdAndRemove(id, function (err, entry) {
                        flowUtils.updateChildrenCount(entry.ownerId, entry.ownerType, constants.OBJECT_TYPES.question, function () {
                            res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                        });
                    });
                    break;
                case constants.OBJECT_TYPES.artifact:
                    db.Artifact.findByIdAndRemove(id, function (err, entry) {
                        flowUtils.updateChildrenCount(entry.ownerId, entry.ownerType, constants.OBJECT_TYPES.artifact, function () {
                            res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                        });
                    });
                    break;
                case constants.OBJECT_TYPES.issue:
                    db.Issue.findByIdAndRemove(id, function (err, entry) {
                        flowUtils.updateChildrenCount(entry.ownerId, entry.ownerType, constants.OBJECT_TYPES.issue, function () {
                            res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                        });
                    });
                    break;
                case constants.OBJECT_TYPES.opinion:
                    db.Opinion.findByIdAndRemove(id, function (err, entry) {
                        flowUtils.updateChildrenCount(entry.ownerId, entry.ownerType, constants.OBJECT_TYPES.opinion, function () {
                            res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
                        });
                    });
                    break;
                default:
                    res.send({});
            }
        } else {
            res.send({});
        }
    });
};
