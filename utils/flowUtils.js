'use strict';

var db          = require('../app').db.models,
    utils       = require('./utils'),
    constants   = require('../models/constants'),
    config      = require('../config/config'),
    async       = require('async');

function getBackupDir() {
    if(config.mongodb.backupRoot) {
        if(config.mongodb.backupRoot.startsWith('~')) {
            return __dirname + '/..' + config.mongodb.backupRoot.substring(1);
        }
        return config.mongodb.backupRoot;
    }
    return __dirname + '/../config/mongodb';
}

function isOwner(req, item, model) {
    return item && req.user && item.createUserId && req.user.id && item.createUserId.equals(req.user.id);
}

function appendOwnerFlag(req, item, model) {
    if(isOwner(req, item, model)) {
        model.isItemOwner = true;
    }
}

function appendEntryExtra(item) {
    item.comments = utils.randomInt(0,999);
    //item.editUsername = 'root';
    item.points = utils.randomInt(0,9999) + ' points';

    //var editDateString = result.editDate.toUTCString();
    item.editDateString = utils.timeSince(item.editDate)/* + ' ago'*/; //editDateString.substring(0, editDateString.length - 4);
}

function setEditorsUsername(items, callback) {
    if(items && items.length > 0) {
        var seen = {};
        var userIds = items
            .filter(function (item) {
                var id = item.editUserId ? item.editUserId.valueOf() : null;
                if (!id || seen[id]) {
                    return;
                }
                seen[id] = true;
                return item;
                //return !!item.editUserId;
            }).map(function (item) {
                return item.editUserId;
            }
        );

        var query = {
            _id: {
                $in: userIds
            }
        };

        db.User.find(query, {username: 1}, function (err, results) {
            var userNames = {};
            results.forEach(function (result) {
                userNames[result._id.valueOf()] = result.username;
            });
            items.forEach(function (item) {
                if (item.editUserId) {
                    item.editUsername = userNames[item.editUserId.valueOf()];
                }
            });
            callback();
        });
    } else {
        callback();
    }
}

function setQuestionModel(req, model, callback) {
    if(req.query.question) {
        db.Question.findOne({_id: req.query.question}, function (err, result) {
            result.friendlyUrl = utils.urlify(result.title);
            result.shortTitle = utils.getShortText(result.title);
            if(isOwner(req, result, model)) {
                model.isQuestionOwner = true;
            }
            db.User.findOne({_id: result.editUserId}, function (err, user) {
                result.editUsername = user.username;
                model.question = result;
                callback(err);
            });
        });
    } else {
        callback();
    }
}

function setIssueModel(req, model, callback) {
    if(req.query.issue) {
        db.Issue.findOne({_id: req.query.issue}, function (err, result) {
            result.friendlyUrl = utils.urlify(result.title);
            result.shortTitle = utils.getShortText(result.title);
            if(isOwner(req, result, model)) {
                model.isIssueOwner = true;
            }
            db.User.findOne({_id: result.editUserId}, function (err, user) {
                result.editUsername = user.username;
                model.issue = result;
                callback(err);
            });
        });
    } else {
        callback();
    }
}

function setOpinionModel(req, model, callback) {
    if(req.query.opinion) {
        db.Opinion.findOne({_id: req.query.opinion}, function (err, result) {
            result.friendlyUrl = utils.urlify(result.title);
            result.shortTitle = utils.getShortText(result.title);
            if(isOwner(req, result, model)) {
                model.isOpinionOwner = true;
            }
            db.User.findOne({_id: result.editUserId}, function (err, user) {
                result.editUsername = user.username;
                model.opinion = result;
                callback(err);
            });
        });
    } else {
        callback();
    }
}

function setArgumentModels(req, model, callback) {
    if(req.query.argument) {
        async.series({
            argument: function (callback) {
                db.Argument.findOne({_id: req.query.argument}, function (err, result) {
                    if(err || !result) {
                        return callback(err);
                    }
                    result.friendlyUrl = utils.urlify(result.title);
                    result.shortTitle = utils.getShortText(result.title);
                    if (isOwner(req, result, model)) {
                        model.isArgumentOwner = true;
                    }
                    db.User.findOne({_id: result.editUserId}, function (err, user) {
                        result.editUsername = user.username;
                        model.argument = result;
                        callback(err);
                    });
                });
            },
            parentArgument: function (callback) {
                if(model.argument && model.argument.parentId) {
                    db.Argument.findOne({_id: model.argument.parentId}, function (err, result) {
                        if (result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.shortTitle = utils.getShortText(result.title);
                            model.parentArgument = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            grandParentArgument: function (callback) {
                if(model.parentArgument && model.parentArgument.parentId) {
                    db.Argument.findOne({_id: model.parentArgument.parentId}, function (err, result) {
                        if (result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.shortTitle = utils.getShortText(result.title);
                            model.grandParentArgument = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            callback();
        });
    } else {
        callback();
    }
}

function setEntryModels(query, req, model, callback) {
    if(query.ownerType === constants.OBJECT_TYPES.topic) {
        req.query.topic = query.ownerId;
        setTopicModels(req, model, callback);
    } else if(query.ownerType === constants.OBJECT_TYPES.argument) {
        req.query.argument = query.ownerId;
        setArgumentModels(req, model, function () {
            setTopicModels(req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.question) {
        req.query.question = query.ownerId;
        setQuestionModel(req, model, function () {
            setEntryModels(model.question, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.issue) {
        req.query.issue = query.ownerId;
        setIssueModel(req, model, function () {
            setEntryModels(model.issue, req, model, callback);
        });
    } else if(query.ownerType === constants.OBJECT_TYPES.opinion) {
        req.query.opinion = query.ownerId;
        setOpinionModel(req, model, function () {
            setEntryModels(model.opinion, req, model, callback);
        });
    }
}

function setTopicModels(req, model, callback) {
    var query = { _id: model.argument ? model.argument.ownerId : req.query.topic ? req.query.topic : null };
    if(query._id) {
        async.series({
            topic: function (callback) {
                db.Topic.findOne(query, function(err, result) {
                    if(err || !result) {
                        return callback(err);
                    }
                    result.friendlyUrl = utils.urlify(result.title);
                    result.shortTitle = utils.getShortText(result.title);
                    if(isOwner(req, result, model)) {
                        model.isTopicOwner = true;
                    }
                    db.User.findOne({_id: result.editUserId}, function (err, user) {
                        result.editUsername = user.username;
                        model.topic = result;
                        callback(err);
                    });
                });
            },
            parentTopic: function (callback) {
                if(model.topic && model.topic.parentId) {
                    db.Topic.findOne({_id: model.topic.parentId}, function (err, result) {
                        if (result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.shortTitle = utils.getShortText(result.title);
                            model.parentTopic = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            grandParentTopic: function (callback) {
                if(model.parentTopic && model.parentTopic.parentId) {
                    db.Topic.findOne({_id: model.parentTopic.parentId}, function (err, result) {
                        if (result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.shortTitle = utils.getShortText(result.title);
                            model.grandParentTopic = result;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            callback();
        });
    } else {
        callback();
    }
}

function prepareClipboardOptions(req, model, entryType) {
    var clipboard = req.session.clipboard;
    if(clipboard) {
        var topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        var args = clipboard['object' + constants.OBJECT_TYPES.argument];
        var count = topics.length + args.length;
        if (count > 0) {
            model.clipboard = {
                count: count
            };
            var marked = false;
            if ((entryType === constants.OBJECT_TYPES.topic && model.topic && topics.indexOf(model.topic._id.toString()) > -1) ||
                (entryType === constants.OBJECT_TYPES.argument && model.argument && args.indexOf(model.argument._id.toString()) > -1)) {
                model.clipboard.marked = true;
                marked = true;
            }
            if(!(count === 1 && marked)) {
                model.clipboard.canPaste = true;
            }
        }
    }
}

function getTopics(query, limit, callback) {
    async.parallel({
        children: function (callback) {
            db.Topic
                .find(query)
                .limit(limit)
                .sort({ title: 1 })
                .lean()
                .exec(function(err, results) {
                setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        appendEntryExtra(result);
                        //result.link = false;
                    });
                    callback(null, results);
                });
            });
        },
        links: function (callback) {
            db.TopicLink
                .find(query)
                .limit(limit)
                .lean()
                .exec(function(err, links) {
                    if(links.length > 0) {
                        var ids = links.map(function (link) {
                            return link.topicId;
                        });
                        var query = {
                            _id: {
                                $in: ids
                            }
                        };
                        db.Topic
                            .find(query)
                            .limit(limit)
                            .sort({title: 1})
                            .lean()
                            .exec(function (err, results) {
                                setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        result.friendlyUrl = utils.urlify(result.title);
                                        appendEntryExtra(result);
                                        var link = links.find(function (link) {
                                            return link.topicId.equals(result._id);
                                        });
                                        if (link) {
                                            result.link = link;
                                        }
                                    });
                                    callback(null, results);
                                });
                            });
                    } else {
                        callback(null, []);
                    }
            });
        }
    }, function (err, results) {
        var topics = results.children.concat(results.links).sort(utils.titleCompare);
        callback(null, topics);
    });
}

function getArguments(query, limit, callback) {
    async.parallel({
        children: function (callback) {
            db.Argument
                .find(query)
                .limit(limit)
                .sort({ title: 1 })
                .lean()
                .exec(function(err, results) {
                setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        appendEntryExtra(result);
                        //result.link = false;
                        //result.against = false;
                    });
                    callback(null, results);
                });
            });
        },
        links: function (callback) {
            db.ArgumentLink
                .find(query)
                .limit(limit)
                .lean()
                .exec(function(err, links) {
                    if(links.length > 0) {
                        var ids = links.map(function (link) {
                            return link.argumentId;
                        });
                        var query = {
                            _id: {
                                $in: ids
                            }
                        };
                        db.Argument
                            .find(query)
                            .limit(limit)
                            .sort({title: 1})
                            .lean()
                            .exec(function (err, results) {
                                setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        result.friendlyUrl = utils.urlify(result.title);
                                        appendEntryExtra(result);
                                        var link = links.find(function (link) {
                                            return link.argumentId.equals(result._id);
                                        });
                                        if (link) {
                                            result.link = link;
                                            result.against = link.against;
                                        }
                                    });
                                    callback(null, results);
                                });
                            });
                    } else {
                        callback(null, []);
                    }
            });
        }
    }, function (err, results) {
        var args = results.children.concat(results.links).sort(utils.titleCompare);
        callback(null, args);
    });
}

function syncChildren(parentIds, entryType, callback) {
    if(entryType === constants.OBJECT_TYPES.topic) {
        callback();
    } else if(entryType === constants.OBJECT_TYPES.argument) {
        var processArgumentsRecursive = function (parent, callback) {
            db.Argument.find({parentId: parent._id}, function (err, children) {
                if(children.length > 0) {
                    async.each(children, function (child, callback) {
                        child.ownerId = parent.ownerId;
                        child.ownerType = parent.ownerType;
                        child.threadId = parent.parentId ? parent.threadId : parent._id;
                        db.Argument.update({_id: child._id}, child, {upsert: true}, function(err, writeResult) {
                            processArgumentsRecursive(child, callback);
                        });
                    }, function (err) {
                        callback();
                    });
                } else {
                    callback();
                }
            });
        };

        async.each(parentIds, function (parentId, callback) {
            db.Argument.findOne({_id: parentId}, function (err, parent) {
                processArgumentsRecursive(parent, callback);
            });
        }, function () {
            callback();
        });
    }
}

function setVerdictModel(result) {
    if(!result.verdict || !result.verdict.status) {
        result.verdict = {
            status: constants.VERDICT_STATUS.pending
        };
    }
    var status = result.verdict.status;
    var category = constants.VERDICT_STATUS.getCategory(status);
    switch (category) {
        case constants.VERDICT_STATUS.categories.true:
            result.verdict.true = true;
            break;
        case constants.VERDICT_STATUS.categories.false:
            result.verdict.false = true;
            break;
        case constants.VERDICT_STATUS.categories.pending:
            result.verdict.pending = true;
            break;
    }

    result.verdict.label = constants.VERDICT_STATUS.getLabel(status);
    result.verdict.theme = constants.VERDICT_STATUS.getTheme(status);

    if( typeof result.typeId !== 'undefined' && result.typeId !== constants.ARGUMENT_TYPES.factual) {
        result.typeUX = constants.ARGUMENT_TYPES.getUXInfo(result.typeId);
    }
}

function getVerdictCount(args) {
    var verdictCount = {
        true: 0,
        false: 0,
        pending: 0
    };
    args.forEach(function(arg) {
        var varg = arg.verdict && arg.verdict.status ? arg.verdict.status : constants.VERDICT_STATUS.pending;
        var category = constants.VERDICT_STATUS.getCategory(varg);
        switch (category) {
            case constants.VERDICT_STATUS.categories.true:
                verdictCount.true++;
                break;
            case constants.VERDICT_STATUS.categories.false:
                verdictCount.false++;
                break;
            case constants.VERDICT_STATUS.categories.pending:
                verdictCount.pending++;
                break;
        }
    });
    if(verdictCount.true === 0) {
        delete verdictCount.true;
    }
    if(verdictCount.false === 0) {
        delete verdictCount.false;
    }
    if(verdictCount.pending === 0) {
        delete verdictCount.pending;
    }
    return verdictCount;
}

function createOwnerQueryFromQuery(req) {
    if(req.query.issue) {
        return {
            ownerType: constants.OBJECT_TYPES.issue,
            ownerId: req.query.issue
        };
    } else if(req.query.opinion) {
        return {
            ownerType: constants.OBJECT_TYPES.opinion,
            ownerId: req.query.opinion
        };
    } else if(req.query.question) {
        return {
            ownerType: constants.OBJECT_TYPES.question,
            ownerId: req.query.question
        };
    } else if(req.query.argument) {
        return {
            ownerType: constants.OBJECT_TYPES.argument,
            ownerId: req.query.argument
        };
    } else if(req.query.topic) {
        return {
            ownerType: constants.OBJECT_TYPES.topic,
            ownerId: req.query.topic
        };
    }
    return {};
}

function createOwnerQueryFromModel(model) {
    if(model.issue) {
        return {
            ownerType: constants.OBJECT_TYPES.issue,
            ownerId: model.issue._id
        };
    } else if(model.opinion) {
        return {
            ownerType: constants.OBJECT_TYPES.opinion,
            ownerId: model.opinion._id
        };
    } else if(model.question) {
        return {
            ownerType: constants.OBJECT_TYPES.question,
            ownerId: model.question._id
        };
    } else if(model.argument) {
        return {
            ownerType: constants.OBJECT_TYPES.argument,
            ownerId: model.argument._id
        };
    } else if(model.topic) {
        return {
            ownerType: constants.OBJECT_TYPES.topic,
            ownerId: model.topic._id
        };
    }
    return {};
}

module.exports = {
    getBackupDir: getBackupDir,
    isOwner: isOwner,
    appendOwnerFlag: appendOwnerFlag,
    setArgumentModels: setArgumentModels,
    setTopicModels: setTopicModels,
    setQuestionModel: setQuestionModel,
    setIssueModel: setIssueModel,
    setOpinionModel: setOpinionModel,
    setEntryModels: setEntryModels,
    appendEntryExtra: appendEntryExtra,
    setEditorsUsername: setEditorsUsername,
    prepareClipboardOptions: prepareClipboardOptions,

    getTopics: getTopics,
    getArguments: getArguments,
    syncChildren: syncChildren,
    getVerdictCount: getVerdictCount,
    setVerdictModel: setVerdictModel,
    createOwnerQueryFromQuery: createOwnerQueryFromQuery,
    createOwnerQueryFromModel: createOwnerQueryFromModel
};