'use strict';

var constants   = require('../../models/constants'),
    flowUtils   = require('../../utils/flowUtils'),
    db          = require('../../app').db.models,
    async       = require('async');

function setupClipboard(req) {
    var clipboard = req.session.clipboard;
    if(!clipboard) {
        clipboard = {};
        clipboard['object' + constants.OBJECT_TYPES.topic] = [];
        clipboard['object' + constants.OBJECT_TYPES.argument] = [];
    }
    return clipboard;
}

function createNewArrayExcludeId(sourceIds, removeId) {
    var ids = [];
    for (var i = 0; i < sourceIds.length; ++i) { // remove self if included
        var id = sourceIds[i];
        if (removeId != id) {
            ids.push(id);
        }
    }
    return ids;
}

module.exports = function (router) {

    router.post('/mark', function (req, res) {
        var id = req.body.id;
        var type = req.body.type;

        var clipboard = setupClipboard(req);
        if(clipboard['object' + type].indexOf(id) < 0) {
            clipboard['object' + type].push(id);
        }
        req.session.clipboard = clipboard;
        res.send({});
    });

    router.post('/paste-link', function (req, res) {
        // Destination
        var id = req.body.id;
        var type = req.body.type;

        var clipboard = setupClipboard(req);
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];
        if(type == constants.OBJECT_TYPES.topic) {
            db.Topic.findOne({_id: id}, function(err, parent) {
                async.parallel({
                    topics: function (callback) {
                        if (topics.length === 0) {
                            return callback();
                        }
                        var ids = createNewArrayExcludeId(topics, id);
                        async.each(ids, function(topicId, callback){
                            var entity = {};
                            entity.editUserId = req.user.id;
                            entity.editDate = Date.now();
                            // A child topic.
                            entity.topicId = topicId;
                            entity.parentId = parent._id;
                            entity.ownerId = parent.ownerId;
                            entity.ownerType = parent.ownerType;
                            entity.createUserId = req.user.id;
                            entity.createDate = Date.now();
                            db.TopicLink.update({topicId: topicId, parentId: parent._id}, entity, {upsert: true}, function() {
                                callback();
                            });
                        }, function () {
                            callback();
                        });
                    },
                    arguments: function (callback) {
                        if (args.length === 0) {
                            return callback();
                        }
                        var ids = createNewArrayExcludeId(args, id);
                        async.each(ids, function(argumentId, callback){
                            var entity = {};
                            entity.editUserId = req.user.id;
                            entity.editDate = Date.now();
                            // A child argument.
                            entity.argumentId = argumentId;
                            entity.parentId = null;
                            entity.ownerId = parent._id;
                            entity.ownerType = constants.OBJECT_TYPES.topic;
                            entity.threadId = null; // TODO: set to self._id
                            entity.createUserId = req.user.id;
                            entity.createDate = Date.now();
                            db.ArgumentLink.update({argumentId: argumentId, parentId: null, ownerId: parent._id}, entity, {upsert: true}, function(err, writeResult) {
                                callback();
                            });
                        }, function () {
                            callback();
                        });
                    }
                }, function () {
                    res.send({});
                });
            });
        } else if(type == constants.OBJECT_TYPES.argument) {
            if (args.length === 0) {
                return res.send({});
            }
            db.Argument.findOne({_id: id}, function(err, parent) {
                var ids = createNewArrayExcludeId(args, id);
                async.each(ids, function(argumentId, callback){
                    var entity = {};
                    entity.editUserId = req.user.id;
                    entity.editDate = Date.now();
                    // A child argument.
                    entity.argumentId = argumentId;
                    entity.parentId = parent._id;
                    entity.ownerId = parent.ownerId;
                    entity.ownerType = parent.ownerType;
                    entity.threadId = parent.threadId ? parent.threadId : parent._id;
                    entity.createUserId = req.user.id;
                    entity.createDate = Date.now();
                    db.ArgumentLink.update({argumentId: argumentId, parentId: parent._id}, entity, {upsert: true}, function(err, writeResult) {
                        callback();
                    });
                }, function () {
                    res.send({});
                });
            });
        } else {
            res.send({});
        }
    });

    router.post('/move', function (req, res) {
        // Destination
        var id = req.body.id;
        var type = req.body.type;

        var clipboard = setupClipboard(req);
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];
        if(type == constants.OBJECT_TYPES.topic) {
            async.parallel({
                topics: function (callback) { // move topics as children
                    if (topics.length === 0) {
                        return callback();
                    }
                    var ids = createNewArrayExcludeId(topics, id);
                    db.Topic.update({_id: {$in: ids}}, {$set: {parentId: id}}, {multi: true}, function (err, num) {
                        callback();
                    });
                },
                arguments: function (callback) {
                    if (args.length === 0) {
                        return callback();
                    }
                    var ids = createNewArrayExcludeId(args, id);
                    db.Argument.update({_id: {$in: ids}}, {
                        $set: {
                            parentId: null,
                            ownerId: id, // TODO: how about children ???
                            ownerType: constants.OBJECT_TYPES.topic,
                            threadId: null // TODO: should set to self._id ???
                        }
                    }, {multi: true}, function (err, num) {
                        flowUtils.syncChildren(ids, constants.OBJECT_TYPES.argument, callback);
                    });
                }
            }, function (err, results) {
                res.send({});
            });
        } else if(type == constants.OBJECT_TYPES.argument) {
            if (args.length === 0) {
                return res.send({});
            }
            db.Argument.findOne({_id: id}, function(err, result) {
                var ids = createNewArrayExcludeId(args, id);
                db.Argument.update({_id: {$in: ids}}, {
                    $set: {
                        parentId: id,
                        ownerId: result.ownerId, // TODO: how about children ???
                        ownerType: result.ownerType,
                        threadId: result.threadId ? result.threadId : id
                    }
                }, {multi: true}, function (err, num) {
                    flowUtils.syncChildren(ids, constants.OBJECT_TYPES.argument, function () {
                        res.send({});
                    });
                });
            });
        } else {
            res.send({});
        }
    });

    router.post('/clear', function (req, res) {
        delete req.session.clipboard;
        res.send({});
    });

    router.get('/list', function (req, res) {
        //delete req.session.clipboard;
        res.send(req.session.clipboard);
    });
};
