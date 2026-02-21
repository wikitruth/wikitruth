'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
    flowUtils = require('../../utils/flowUtils'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
    db = require('../../app').db.models,
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    async = require('async');

// @ts-ignore TS(7006): Parameter 'sourceIds' implicitly has an 'any' type... Remove this comment to see the full error message
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

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
            // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
            db.Topic.findOne({_id: id}, function(err, parent) { // parent is the target
                async.parallel({
                    // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                    topics: function (callback) {
                        if (topics.length === 0) {
                            return callback();
                        }
                        var ids = createNewArrayExcludeId(topics, id);
                        // @ts-ignore TS(7006): Parameter 'topicId' implicitly has an 'any' type.
                        async.each(ids, function(topicId, callback){
                            var entity = {};
                            // @ts-ignore TS(2339): Property 'editUserId' does not exist on type '{}'.
                            entity.editUserId = req.user.id;
                            // @ts-ignore TS(2339): Property 'editDate' does not exist on type '{}'.
                            entity.editDate = dateNow;
                            // A child topic.
                            // @ts-ignore TS(2339): Property 'topicId' does not exist on type '{}'.
                            entity.topicId = topicId;
                            // @ts-ignore TS(2339): Property 'parentId' does not exist on type '{}'.
                            entity.parentId = parent._id;
                            // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{}'.
                            entity.ownerId = parent.ownerId;
                            // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{}'.
                            entity.ownerType = parent.ownerType;
                            // @ts-ignore TS(2339): Property 'createUserId' does not exist on type '{}... Remove this comment to see the full error message
                            entity.createUserId = req.user.id;
                            // @ts-ignore TS(2339): Property 'createDate' does not exist on type '{}'.
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
                                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                                }, function (err, updatedEntity) {
                                    callback();
                                });
                            });
                        }, function () {
                            callback();
                        });
                    },
                    // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                    arguments: function (callback) {
                        if (args.length === 0) {
                            return callback();
                        }
                        const ids = createNewArrayExcludeId(args, id);
                        // @ts-ignore TS(7006): Parameter 'argumentId' implicitly has an 'any' typ... Remove this comment to see the full error message
                        async.each(ids, function(argumentId, callback){
                            const entity = {};
                            // @ts-ignore TS(2339): Property 'editUserId' does not exist on type '{}'.
                            entity.editUserId = req.user.id;
                            // @ts-ignore TS(2339): Property 'editDate' does not exist on type '{}'.
                            entity.editDate = dateNow;
                            // A child argument.
                            // @ts-ignore TS(2339): Property 'argumentId' does not exist on type '{}'.
                            entity.argumentId = argumentId;
                            // @ts-ignore TS(2339): Property 'parentId' does not exist on type '{}'.
                            entity.parentId = null;
                            // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{}'.
                            entity.ownerId = parent._id;
                            // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{}'.
                            entity.ownerType = constants.OBJECT_TYPES.topic;
                            // @ts-ignore TS(2339): Property 'threadId' does not exist on type '{}'.
                            entity.threadId = null; // TODO: set to self._id
                            // @ts-ignore TS(2339): Property 'createUserId' does not exist on type '{}... Remove this comment to see the full error message
                            entity.createUserId = req.user.id;
                            // @ts-ignore TS(2339): Property 'createDate' does not exist on type '{}'.
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
                                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
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
        } else if(targetOwnerType === constants.OBJECT_TYPES.argument) {
            if (args.length === 0) {
                return res.send({});
            }
            // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
            db.Argument.findOne({_id: id}, function (err, parent) {
                var ids = createNewArrayExcludeId(args, id);
                // @ts-ignore TS(7006): Parameter 'argumentId' implicitly has an 'any' typ... Remove this comment to see the full error message
                async.each(ids, function (argumentId, callback) {
                    var entity = {};
                    // @ts-ignore TS(2339): Property 'editUserId' does not exist on type '{}'.
                    entity.editUserId = req.user.id;
                    // @ts-ignore TS(2339): Property 'editDate' does not exist on type '{}'.
                    entity.editDate = dateNow;
                    // A child argument.
                    // @ts-ignore TS(2339): Property 'argumentId' does not exist on type '{}'.
                    entity.argumentId = argumentId;
                    // @ts-ignore TS(2339): Property 'parentId' does not exist on type '{}'.
                    entity.parentId = parent._id;
                    // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{}'.
                    entity.ownerId = parent.ownerId;
                    // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{}'.
                    entity.ownerType = parent.ownerType;
                    // @ts-ignore TS(2339): Property 'threadId' does not exist on type '{}'.
                    entity.threadId = parent.threadId ? parent.threadId : parent._id;
                    // @ts-ignore TS(2339): Property 'createUserId' does not exist on type '{}... Remove this comment to see the full error message
                    entity.createUserId = req.user.id;
                    // @ts-ignore TS(2339): Property 'createDate' does not exist on type '{}'.
                    entity.createDate = dateNow;
                    flowUtils.initScreeningStatus(req, entity);
                    flowUtils.syncCategoryId(entity, {entryType: constants.OBJECT_TYPES.argumentLink}, function () {
                        db.ArgumentLink.findOneAndUpdate({
                            argumentId: argumentId,
                            parentId: parent._id
                        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
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

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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

        // @ts-ignore TS(7006): Parameter 'parentArgument' implicitly has an 'any'... Remove this comment to see the full error message
        const moveChildArguments = function (parentArgument, callback) {
            const facts = clipboard['object' + constants.OBJECT_TYPES.argument];
            if (facts.length === 0 || !targetOwnerId) {
                return callback();
            }
            const ids = createNewArrayExcludeId(facts, targetOwnerId);
            db.Argument
                .find({_id: {$in: ids}})
                .lean()
                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                .exec(function (err, results) {
                    // Update each moved entry and their parent count
                    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                    async.each(results, function (result, callback) {
                        // @ts-ignore TS(7034): Variable 'updatedResult' implicitly has type 'any'... Remove this comment to see the full error message
                        let updatedResult;
                        const oldParentId = result.parentId;
                        const oldOwnerId = result.ownerId;
                        // Update entry
                        if (targetOwnerType === constants.OBJECT_TYPES.topic) {
                            result.parentId = null;
                            result.ownerId = targetOwnerId; // TODO: how about children ???
                            result.ownerType = targetOwnerType;
                            result.threadId = null; // TODO: should set to self._id ???
                        } else { // if (targetOwnerType == constants.OBJECT_TYPES.argument); has a parent argument
                            result.parentId = targetOwnerId;
                            result.ownerId = parentArgument.ownerId; // TODO: how about children ???
                            result.ownerType = parentArgument.ownerType;
                            result.threadId = parentArgument.threadId ? parentArgument.threadId : targetOwnerId;
                        }

                        async.series({
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            syncCategoryId: function (callback) {
                                flowUtils.syncCategoryId(result, {
                                    entryType: constants.OBJECT_TYPES.argument,
                                    update: false,
                                    recursive: true
                                }, callback);
                            },
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            findOneAndUpdate: function (callback) {
                                db.Argument.findOneAndUpdate({_id: result._id}, result, {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                                }, function (err, updatedEntity) {
                                    updatedResult = updatedEntity;
                                    callback();
                                });
                            },
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            syncChildren: function (callback) {
                                // @ts-ignore TS(7005): Variable 'updatedResult' implicitly has an 'any' t... Remove this comment to see the full error message
                                flowUtils.syncChildren(updatedResult, {entryType: constants.OBJECT_TYPES.argument}, callback);
                            },
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            updateChildrenCount: function (callback) {
                                // FIXME: is this needed per id? or can we batch this at the end by collecting all parentId/ownerId and doing it once?
                                if (oldParentId) {
                                    flowUtils.updateChildrenCount(oldParentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, callback);
                                } else {
                                    flowUtils.updateChildrenCount(oldOwnerId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument, callback);
                                }
                            }
                        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                        }, function (err, results) {
                            callback();
                        });

                    }, function () {
                        // Update the new owner's children count
                        flowUtils.updateChildrenCount(targetOwnerId, targetOwnerType, constants.OBJECT_TYPES.argument, callback);
                    });
                });
        };

        // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
        const moveChildQuestions = function (callback) {
            var questions = clipboard['object' + constants.OBJECT_TYPES.question];
            if (questions.length === 0 || !targetOwnerId) {
                return callback();
            }
            var ids = createNewArrayExcludeId(questions, targetOwnerId);
            db.Question
                .find({_id: {$in: ids}})
                .lean()
                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                .exec(function (err, results) {
                    // Update each moved entry and their parent count
                    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                    async.each(results, function (result, callback) {
                        // @ts-ignore TS(7034): Variable 'updatedResult' implicitly has type 'any'... Remove this comment to see the full error message
                        var updatedResult;
                        var oldOwnerId = result.ownerId;
                        var oldOwnerType = result.ownerType;
                        // Update entry
                        result.ownerId = targetOwnerId; // TODO: how about children ???
                        result.ownerType = targetOwnerType;

                        async.series({
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            syncCategoryId: function (callback) {
                                flowUtils.syncCategoryId(result, {
                                    entryType: constants.OBJECT_TYPES.question,
                                    update: false,
                                    recursive: true
                                }, callback);
                            },
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            findOneAndUpdate: function (callback) {
                                db.Question.findOneAndUpdate({_id: result._id}, result, {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                                }, function (err, updatedEntity) {
                                    updatedResult = updatedEntity;
                                    callback();
                                });
                            },
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            syncChildren: function (callback) {
                                // @ts-ignore TS(7005): Variable 'updatedResult' implicitly has an 'any' t... Remove this comment to see the full error message
                                flowUtils.syncChildren(updatedResult, {entryType: constants.OBJECT_TYPES.question}, callback);
                            },
                            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                            updateChildrenCount: function (callback) {
                                // Update old owner's children count
                                // FIXME: is this needed per id? or can we batch this at the end by collecting all parentId/ownerId and doing it once?
                                flowUtils.updateChildrenCount(oldOwnerId, oldOwnerType, constants.OBJECT_TYPES.question, callback);
                            }
                        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                        }, function (err, results) {
                            callback();
                        });
                    }, function () {
                        // Update the new owner's children count
                        flowUtils.updateChildrenCount(targetOwnerId, targetOwnerType, constants.OBJECT_TYPES.question, callback);
                    });
                });
        };

        if(!targetOwnerId || targetOwnerType === constants.OBJECT_TYPES.topic) {
            async.parallel({

                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                topics: function (callback) { // move topics as children
                    if (topics.length === 0 || !username && !req.user.isAdmin()) { // if moving to root but user is not admin, deny
                        return callback();
                    }
                    var ids = createNewArrayExcludeId(topics, targetOwnerId);
                    db.Topic
                        .find({_id: {$in: ids}})
                        .lean()
                        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                        .exec(function (err, results) {
                            // Update each moved entry and their parent count
                            // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                            async.each(results, function(result, callback){
                                // FIXME: for now, prevent moving from Diary to public and vice versa
                                if(result.private && !username || !result.private && username) {
                                    return callback();
                                }

                                // @ts-ignore TS(7034): Variable 'updatedResult' implicitly has type 'any'... Remove this comment to see the full error message
                                var updatedResult;
                                var parentId = result.parentId;
                                // Update entry parent
                                result.parentId = targetOwnerId;

                                async.series({
                                    // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                                    syncCategoryId: function (callback) {
                                        flowUtils.syncCategoryId(result, { entryType: constants.OBJECT_TYPES.topic, update: false, recursive: true }, callback);
                                    },
                                    // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                                    findOneAndUpdate: function (callback) {
                                        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                                        db.Topic.findOneAndUpdate({_id: result._id}, result, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
                                            updatedResult = updatedEntity;
                                            callback();
                                        });
                                    },
                                    // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                                    syncChildren: function (callback) {
                                        // @ts-ignore TS(7005): Variable 'updatedResult' implicitly has an 'any' t... Remove this comment to see the full error message
                                        flowUtils.syncChildren(updatedResult, { entryType: constants.OBJECT_TYPES.topic }, callback);
                                    },
                                    // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                                    updateChildrenCount: function (callback) {
                                        // FIXME: is this needed per id? or can we batch this at the end by collecting all parentId/ownerId and doing it once?
                                        if (parentId) {
                                            // Update old parent's children
                                            flowUtils.updateChildrenCount(parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, callback);
                                        } else {
                                            callback();
                                        }
                                    }
                                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                                }, function (err, results) {
                                    callback();
                                });
                            }, function () {
                                if(targetOwnerId) {
                                    // update new parent's children
                                    flowUtils.updateChildrenCount(targetOwnerId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, callback);
                                } else {
                                    callback();
                                }
                            });
                    });
                },

                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                arguments: function (callback) {
                    moveChildArguments(null, callback);
                },

                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                questions: function (callback) {
                    moveChildQuestions(callback);
                }

            }, function () {
                res.send({});
            });
        } else if(targetOwnerType === constants.OBJECT_TYPES.argument) {
            async.parallel({
                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                arguments: async function (callback) {
                    let parent = await db.Argument.findOne({_id: targetOwnerId});
                    moveChildArguments(parent, callback);
                },
                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
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

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.post('/clear', function (req, res) {
        delete req.session.clipboard;
        res.send({});
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/list', function (req, res) {
        res.send(req.session.clipboard);
    });
};
