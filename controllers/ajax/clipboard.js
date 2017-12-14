'use strict';

var constants   = require('../../models/constants'),
    flowUtils   = require('../../utils/flowUtils'),
    db          = require('../../app').db.models,
    async       = require('async');

function setupClipboard(req, type) {
    var clipboard = req.session.clipboard;
    if(!clipboard) {
        clipboard = {};
        clipboard['object' + constants.OBJECT_TYPES.topic] = [];
        clipboard['object' + constants.OBJECT_TYPES.argument] = [];
    }
    if(!clipboard['object' + type]) {
        clipboard['object' + type] = [];
    }
    return clipboard;
}

function createNewArrayExcludeId(sourceIds, excludeId) {
    var ids = [];
    for (var i = 0; i < sourceIds.length; ++i) { // remove self if included
        var id = sourceIds[i];
        if (!excludeId || excludeId != id) {
            ids.push(id);
        }
    }
    return ids;
}

module.exports = function (router) {

    router.post('/mark', function (req, res) {
        var id = req.body.id;
        var type = req.body.type;

        var clipboard = setupClipboard(req, type);
        if(clipboard['object' + type].indexOf(id) < 0) {
            clipboard['object' + type].push(id);
        }
        req.session.clipboard = clipboard;
        res.send({});
    });

    router.post('/paste-link', function (req, res) {
        // Destination
        var id = req.body.id;
        var type = req.body.type; // the type of destination

        if(!id || !type) {
            return res.send({}); // linking to root, stop!
        }

        var dateNow = Date.now();
        var clipboard = setupClipboard(req, type);
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];
        if(type == constants.OBJECT_TYPES.topic) {
            db.Topic.findOne({_id: id}, function(err, parent) { // parent is the target
                async.parallel({
                    topics: function (callback) {
                        if (topics.length === 0) {
                            return callback();
                        }
                        var ids = createNewArrayExcludeId(topics, id);
                        async.each(ids, function(topicId, callback){
                            var entity = {};
                            entity.editUserId = req.user.id;
                            entity.editDate = dateNow;
                            // A child topic.
                            entity.topicId = topicId;
                            entity.parentId = parent._id;
                            entity.ownerId = parent.ownerId;
                            entity.ownerType = parent.ownerType;
                            entity.private = parent.private;
                            entity.createUserId = req.user.id;
                            entity.createDate = dateNow;
                            flowUtils.initScreeningStatus(req, entity);
                            //console.log('entity: ' + JSON.stringify(entity));
                            flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.topicLink }, function () {
                                db.TopicLink.findOneAndUpdate({
                                    topicId: topicId,
                                    parentId: parent._id
                                }, entity, {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                }, function (err, updatedEntity) {
                                    callback();
                                });
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
                            entity.editDate = dateNow;
                            // A child argument.
                            entity.argumentId = argumentId;
                            entity.parentId = null;
                            entity.ownerId = parent._id;
                            entity.ownerType = constants.OBJECT_TYPES.topic;
                            entity.private = parent.private;
                            entity.threadId = null; // TODO: set to self._id
                            entity.createUserId = req.user.id;
                            entity.createDate = dateNow;
                            flowUtils.initScreeningStatus(req, entity);
                            flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.argumentLink }, function () {
                                db.ArgumentLink.findOneAndUpdate({
                                    argumentId: argumentId,
                                    parentId: null,
                                    ownerId: parent._id
                                }, entity, {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                }, function (err, updatedEntity) {
                                    callback();
                                });
                            });
                        }, function () {
                            callback();
                        });
                    }
                }, function () {
                    flowUtils.updateChildrenCount(parent._id, constants.OBJECT_TYPES.topic, null, function () {
                        res.send({});
                    });
                });
            });
        } else if(type == constants.OBJECT_TYPES.argument) {
            if (args.length === 0) {
                return res.send({});
            }
            db.Argument.findOne({_id: id}, function (err, parent) {
                var ids = createNewArrayExcludeId(args, id);
                async.each(ids, function (argumentId, callback) {
                    var entity = {};
                    entity.editUserId = req.user.id;
                    entity.editDate = dateNow;
                    // A child argument.
                    entity.argumentId = argumentId;
                    entity.parentId = parent._id;
                    entity.ownerId = parent.ownerId;
                    entity.ownerType = parent.ownerType;
                    entity.threadId = parent.threadId ? parent.threadId : parent._id;
                    entity.private = parent.private;
                    entity.createUserId = req.user.id;
                    entity.createDate = dateNow;
                    flowUtils.initScreeningStatus(req, entity);
                    flowUtils.syncCategoryId(entity, {entryType: constants.OBJECT_TYPES.argumentLink}, function () {
                        db.ArgumentLink.findOneAndUpdate({
                            argumentId: argumentId,
                            parentId: parent._id
                        }, entity, {upsert: true, new: true, setDefaultsOnInsert: true}, function (err, updatedEntity) {
                            callback();
                        });
                    });
                }, function () {
                    flowUtils.updateChildrenCount(parent._id, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, function () {
                        res.send({});
                    });
                });
            });
        } else if(type == constants.OBJECT_TYPES.artifact) {
            var artifacts = clipboard['object' + constants.OBJECT_TYPES.artifact];
            if (artifacts.length === 0) {
                return res.send({});
            }
            return res.send({});
        } else {
            res.send({});
        }
    });

    router.post('/move', function (req, res) {
        // Destination
        var id = req.body.id;
        var type = req.body.type;
        var username = req.body.username;

        var clipboard = setupClipboard(req, type);
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];

        if(!id) { // if moving to root
            id = null;
            type = null;
        }

        if(!id || type == constants.OBJECT_TYPES.topic) {
            async.parallel({

                topics: function (callback) { // move topics as children
                    if (topics.length === 0 || !username && !req.user.isAdmin()) { // if moving to root but user is not admin, deny
                        return callback();
                    }
                    var ids = createNewArrayExcludeId(topics, id);
                    db.Topic
                        .find({_id: {$in: ids}})
                        .lean()
                        .exec(function (err, results) {
                            // Update each moved entry and their parent count
                            async.each(results, function(result, callback){
                                // FIXME: for now, prevent moving from Diary to public and vice versa
                                if(result.private && !username || !result.private && username) {
                                    return callback();
                                }

                                var updatedResult;
                                var parentId = result.parentId;
                                // Update entry parent
                                result.parentId = id;

                                async.series({
                                    syncCategoryId: function (callback) {
                                        flowUtils.syncCategoryId(result, { entryType: constants.OBJECT_TYPES.topic, update: false, recursive: true }, callback);
                                    },
                                    findOneAndUpdate: function (callback) {
                                        db.Topic.findOneAndUpdate({_id: result._id}, result, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
                                            updatedResult = updatedEntity;
                                            callback();
                                        });
                                    },
                                    syncChildren: function (callback) {
                                        flowUtils.syncChildren(updatedResult, { entryType: constants.OBJECT_TYPES.topic }, callback);
                                    },
                                    updateChildrenCount: function (callback) {
                                        // FIXME: is this needed per id? or can we batch this at the end by collecting all parentId/ownerId and doing it once?
                                        if (parentId) {
                                            // Update old parent's children
                                            flowUtils.updateChildrenCount(parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, callback);
                                        } else {
                                            callback();
                                        }
                                    }
                                }, function (err, results) {
                                    callback();
                                });
                            }, function () {
                                if(id) {
                                    // update new parent's children
                                    flowUtils.updateChildrenCount(id, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, callback);
                                } else {
                                    callback();
                                }
                            });
                    });
                },

                arguments: function (callback) {
                    if (args.length === 0 || !id) return callback();

                    var ids = createNewArrayExcludeId(args, id);
                    db.Argument
                        .find({_id: {$in: ids}})
                        .lean()
                        .exec(function (err, results) {
                            // Update each moved entry and their parent count
                            async.each(results, function(result, callback){
                                var updatedResult;
                                var parentId = result.parentId;
                                var ownerId = result.ownerId;
                                // Update entry
                                result.parentId = null;
                                result.ownerId = id; // TODO: how about children ???
                                result.ownerType = constants.OBJECT_TYPES.topic;
                                result.threadId = null; // TODO: should set to self._id ???

                                async.series({
                                    syncCategoryId: function (callback) {
                                        flowUtils.syncCategoryId(result, { entryType: constants.OBJECT_TYPES.argument, update: false, recursive: true }, callback);
                                    },
                                    findOneAndUpdate: function (callback) {
                                        db.Argument.findOneAndUpdate({_id: result._id}, result, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
                                            updatedResult = updatedEntity;
                                            callback();
                                        });
                                    },
                                    syncChildren: function (callback) {
                                        flowUtils.syncChildren(updatedResult, { entryType: constants.OBJECT_TYPES.argument }, callback);
                                    },
                                    updateChildrenCount: function (callback) {
                                        // FIXME: is this needed per id? or can we batch this at the end by collecting all parentId/ownerId and doing it once?
                                        if (parentId) {
                                            flowUtils.updateChildrenCount(parentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, callback);
                                        } else {
                                            flowUtils.updateChildrenCount(ownerId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument, callback);
                                        }
                                    }
                                }, function (err, results) {
                                    callback();
                                });

                            }, function () {
                                flowUtils.updateChildrenCount(id, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument, callback);
                            });
                    });
                }
            }, function () {
                res.send({});
            });
        } else if(type == constants.OBJECT_TYPES.argument) {
            if (args.length === 0) {
                return res.send({});
            }
            db.Argument.findOne({_id: id}, function(err, parent) {
                var ids = createNewArrayExcludeId(args, id);
                db.Argument
                    .find({_id: {$in: ids}})
                    .lean()
                    .exec(function (err, results) {
                        // Update each and their parent count
                        async.each(results, function(result, callback){
                            var updatedResult;
                            var parentId = result.parentId;
                            var ownerId = result.ownerId;
                            // Update entry
                            result.parentId = id;
                            result.ownerId = parent.parentId; // TODO: how about children ???
                            result.ownerType = parent.ownerType;
                            result.threadId = parent.threadId ? parent.threadId : id;

                            async.series({
                                syncCategoryId: function (callback) {
                                    flowUtils.syncCategoryId(result, { entryType: constants.OBJECT_TYPES.argument, update: false, recursive: true }, callback);
                                },
                                findOneAndUpdate: function (callback) {
                                    db.Argument.findOneAndUpdate({_id: result._id}, result, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
                                        updatedResult = updatedEntity;
                                        callback();
                                    });
                                },
                                syncChildren: function (callback) {
                                    flowUtils.syncChildren(updatedResult, { entryType: constants.OBJECT_TYPES.argument }, callback);
                                },
                                updateChildrenCount: function (callback) {
                                    // FIXME: is this needed per id? or can we batch this at the end by collecting all parentId/ownerId and doing it once?
                                    if (parentId) {
                                        flowUtils.updateChildrenCount(parentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, callback);
                                    } else {
                                        flowUtils.updateChildrenCount(ownerId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument, callback);
                                    }
                                }
                            }, function (err, results) {
                                callback();
                            });

                        }, function () {
                            flowUtils.updateChildrenCount(id, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, function() {
                                res.send({});
                            });
                        });
                });

                /*db.Argument.update({_id: {$in: ids}}, {
                    $set: {
                        parentId: id,
                        ownerId: result.ownerId, // TODO: how about children ???
                        ownerType: result.ownerType,
                        threadId: result.threadId ? result.threadId : id
                    }
                }, {multi: true}, function (err, num) {
                    async.parallel([
                        function (callback) {
                            flowUtils.syncChildren(ids, constants.OBJECT_TYPES.argument, callback);
                        },
                        function (callback) {
                            // FIXME: update the old parents count
                            flowUtils.updateChildrenCount(id, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, callback);
                        }
                    ], function () {
                        res.send({});
                    });
                });*/
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
