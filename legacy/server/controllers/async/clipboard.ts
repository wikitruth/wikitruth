'use strict';

const constants = require('../../models/constants'),
    flowUtils = require('../../utils/flowUtils'),
    db = require('../../app').db.models,
    async = require('async');

function createNewArrayExcludeId(sourceIds, excludeId) {
    const ids = [];
    for (let i = 0; i < sourceIds.length; ++i) { // remove self if included
        const id = sourceIds[i];
        if (!excludeId || excludeId !== id) {
            ids.push(id);
        }
    }
    return ids;
}

module.exports = function (router) {

    router.post('/mark', function (req, res) {
        const id = req.body.id;
        const type = req.body.type;

        const clipboard = flowUtils.setupClipboard(req, type);
        if(clipboard['object' + type].indexOf(id) < 0) {
            clipboard['object' + type].push(id);
        }
        req.session.clipboard = clipboard;
        res.send({});
    });

    router.post('/paste-link', function (req, res) {
        // destination
        const id = req.body.id;
        const targetOwnerType = req.body.type; // the type of destination

        if(!id || !targetOwnerType) {
            return res.send({}); // linking to root, stop!
        }

        const dateNow = Date.now();
        const clipboard = flowUtils.setupClipboard(req, targetOwnerType);
        const topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        const args = clipboard['object' + constants.OBJECT_TYPES.argument];
        if(targetOwnerType === constants.OBJECT_TYPES.topic) {
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
                        const ids = createNewArrayExcludeId(args, id);
                        async.each(ids, function(argumentId, callback){
                            const entity = {};
                            entity.editUserId = req.user.id;
                            entity.editDate = dateNow;
                            // A child argument.
                            entity.argumentId = argumentId;
                            entity.parentId = null;
                            entity.ownerId = parent._id;
                            entity.ownerType = constants.OBJECT_TYPES.topic;
                            entity.threadId = null;
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
                                    if (updatedEntity && !updatedEntity.threadId) {
                                        return db.ArgumentLink.findOneAndUpdate(
                                            { _id: updatedEntity._id },
                                            { threadId: updatedEntity._id },
                                            { new: true },
                                            function () {
                                                callback();
                                            },
                                        );
                                    }
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
        } else if(targetOwnerType === constants.OBJECT_TYPES.argument) {
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
        } else if(targetOwnerType === constants.OBJECT_TYPES.artifact) {
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
        let targetOwnerId = req.body.id;
        let targetOwnerType = req.body.type;
        const username = req.body.username;

        const clipboard = flowUtils.setupClipboard(req, targetOwnerType);
        const topics = clipboard['object' + constants.OBJECT_TYPES.topic];

        if(!targetOwnerId) { // if moving to root
            targetOwnerId = null;
            targetOwnerType = null;
        }

        const moveChildArguments = function (parentArgument, callback) {
            const facts = clipboard['object' + constants.OBJECT_TYPES.argument];
            if (facts.length === 0 || !targetOwnerId) {
                return callback();
            }
            const ids = createNewArrayExcludeId(facts, targetOwnerId);
            db.Argument
                .find({_id: {$in: ids}})
                .lean()
                .exec(function (err, results) {
                    const childrenCountTasks: Array<{ entryId: string; entryType: number; specificEntryType: number }> = [];
                    // Update each moved entry and their parent count
                    async.each(results, function (result, callback) {
                        let updatedResult;
                        const oldParentId = result.parentId;
                        const oldOwnerId = result.ownerId;
                        // Update entry
                        if (targetOwnerType === constants.OBJECT_TYPES.topic) {
                            result.parentId = null;
                            result.ownerId = targetOwnerId; // children are synchronized via syncChildren recursive flow
                            result.ownerType = targetOwnerType;
                            result.threadId = result._id;
                        } else { // if (targetOwnerType == constants.OBJECT_TYPES.argument); has a parent argument
                            result.parentId = targetOwnerId;
                            result.ownerId = parentArgument.ownerId; // children are synchronized via syncChildren recursive flow
                            result.ownerType = parentArgument.ownerType;
                            result.threadId = parentArgument.threadId ? parentArgument.threadId : targetOwnerId;
                        }

                        async.series({
                            syncCategoryId: function (callback) {
                                flowUtils.syncCategoryId(result, {
                                    entryType: constants.OBJECT_TYPES.argument,
                                    update: false,
                                    recursive: true
                                }, callback);
                            },
                            findOneAndUpdate: function (callback) {
                                db.Argument.findOneAndUpdate({_id: result._id}, result, {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                }, function (err, updatedEntity) {
                                    updatedResult = updatedEntity;
                                    callback();
                                });
                            },
                            syncChildren: function (callback) {
                                flowUtils.syncChildren(updatedResult, {entryType: constants.OBJECT_TYPES.argument}, callback);
                            },
                            updateChildrenCount: function (callback) {
                                // Queue count updates and flush once to avoid repeated recomputation on large moves.
                                if (oldParentId) {
                                    childrenCountTasks.push({
                                        entryId: oldParentId,
                                        entryType: constants.OBJECT_TYPES.argument,
                                        specificEntryType: constants.OBJECT_TYPES.argument,
                                    });
                                } else {
                                    childrenCountTasks.push({
                                        entryId: oldOwnerId,
                                        entryType: constants.OBJECT_TYPES.topic,
                                        specificEntryType: constants.OBJECT_TYPES.argument,
                                    });
                                }
                                callback();
                            }
                        }, function (err, results) {
                            callback();
                        });

                    }, function () {
                        // Update the new owner's children count
                        childrenCountTasks.push({
                            entryId: targetOwnerId,
                            entryType: targetOwnerType,
                            specificEntryType: constants.OBJECT_TYPES.argument,
                        });
                        flowUtils.updateChildrenCountBatch(childrenCountTasks, { transactional: true })
                            .then(function () {
                                callback();
                            })
                            .catch(function (batchError: unknown) {
                                callback(batchError);
                            });
                    });
                });
        };

        const moveChildQuestions = function (callback) {
            var questions = clipboard['object' + constants.OBJECT_TYPES.question];
            if (questions.length === 0 || !targetOwnerId) {
                return callback();
            }
            var ids = createNewArrayExcludeId(questions, targetOwnerId);
            db.Question
                .find({_id: {$in: ids}})
                .lean()
                .exec(function (err, results) {
                    const childrenCountTasks: Array<{ entryId: string; entryType: number; specificEntryType: number }> = [];
                    // Update each moved entry and their parent count
                    async.each(results, function (result, callback) {
                        var updatedResult;
                        var oldOwnerId = result.ownerId;
                        var oldOwnerType = result.ownerType;
                        // Update entry
                        result.ownerId = targetOwnerId; // children are synchronized via syncChildren recursive flow
                        result.ownerType = targetOwnerType;

                        async.series({
                            syncCategoryId: function (callback) {
                                flowUtils.syncCategoryId(result, {
                                    entryType: constants.OBJECT_TYPES.question,
                                    update: false,
                                    recursive: true
                                }, callback);
                            },
                            findOneAndUpdate: function (callback) {
                                db.Question.findOneAndUpdate({_id: result._id}, result, {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                }, function (err, updatedEntity) {
                                    updatedResult = updatedEntity;
                                    callback();
                                });
                            },
                            syncChildren: function (callback) {
                                flowUtils.syncChildren(updatedResult, {entryType: constants.OBJECT_TYPES.question}, callback);
                            },
                            updateChildrenCount: function (callback) {
                                // Update old owner's children count
                                childrenCountTasks.push({
                                    entryId: oldOwnerId,
                                    entryType: oldOwnerType,
                                    specificEntryType: constants.OBJECT_TYPES.question,
                                });
                                callback();
                            }
                        }, function (err, results) {
                            callback();
                        });
                    }, function () {
                        // Update the new owner's children count
                        childrenCountTasks.push({
                            entryId: targetOwnerId,
                            entryType: targetOwnerType,
                            specificEntryType: constants.OBJECT_TYPES.question,
                        });
                        flowUtils.updateChildrenCountBatch(childrenCountTasks, { transactional: true })
                            .then(function () {
                                callback();
                            })
                            .catch(function (batchError: unknown) {
                                callback(batchError);
                            });
                    });
                });
        };

        if(!targetOwnerId || targetOwnerType === constants.OBJECT_TYPES.topic) {
            async.parallel({

                topics: function (callback) { // move topics as children
                    if (topics.length === 0 || !username && !req.user.isAdmin()) { // if moving to root but user is not admin, deny
                        return callback();
                    }
                    var ids = createNewArrayExcludeId(topics, targetOwnerId);
                    db.Topic
                        .find({_id: {$in: ids}})
                        .lean()
                        .exec(function (err, results) {
                            const childrenCountTasks: Array<{ entryId: string; entryType: number; specificEntryType: number }> = [];
                            // Update each moved entry and their parent count
                            async.each(results, function(result, callback){
                                // Guardrail: prevent cross privacy-domain moves (Diary <-> public) until ownership migration is formalized.
                                if(result.private && !username || !result.private && username) {
                                    return callback();
                                }

                                var updatedResult;
                                var parentId = result.parentId;
                                // Update entry parent
                                result.parentId = targetOwnerId;

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
                                        if (parentId) {
                                            childrenCountTasks.push({
                                                entryId: parentId,
                                                entryType: constants.OBJECT_TYPES.topic,
                                                specificEntryType: constants.OBJECT_TYPES.topic,
                                            });
                                        }
                                        callback();
                                    }
                                }, function (err, results) {
                                    callback();
                                });
                            }, function () {
                                if(targetOwnerId) {
                                    // update new parent's children
                                    childrenCountTasks.push({
                                        entryId: targetOwnerId,
                                        entryType: constants.OBJECT_TYPES.topic,
                                        specificEntryType: constants.OBJECT_TYPES.topic,
                                    });
                                    flowUtils.updateChildrenCountBatch(childrenCountTasks, { transactional: true })
                                        .then(function () {
                                            callback();
                                        })
                                        .catch(function (batchError: unknown) {
                                            callback(batchError);
                                        });
                                } else {
                                    callback();
                                }
                            });
                    });
                },

                arguments: function (callback) {
                    moveChildArguments(null, callback);
                },

                questions: function (callback) {
                    moveChildQuestions(callback);
                }

            }, function () {
                res.send({});
            });
        } else if(targetOwnerType === constants.OBJECT_TYPES.argument) {
            async.parallel({
                arguments: async function (callback) {
                    let parent = await db.Argument.findOne({_id: targetOwnerId});
                    moveChildArguments(parent, callback);
                },
                questions: function (callback) {
                    moveChildQuestions(callback);
                }
            }, function () {
                res.send({});
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
        res.send(req.session.clipboard);
    });
};
