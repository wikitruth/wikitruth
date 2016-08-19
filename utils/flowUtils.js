'use strict';

var db      = require('../app').db.models,
    utils   = require('./utils'),
    config  = require('../config/config'),
    async   = require('async');

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

    db.User.find(query, { username: 1}, function(err, results) {
        var userNames = {};
        results.forEach(function(result) {
            userNames[result._id.valueOf()] = result.username;
        });
        items.forEach(function(item) {
            if(item.editUserId) {
                item.editUsername = userNames[item.editUserId.valueOf()];
            }
        });
        callback ();
    });
}

function setWorldviewModel(req, model, callback) {
    if(req.query.worldview) {
        db.Ideology.findOne({_id: req.query.worldview}, function (err, result) {
            appendOwnerFlag(req, result, model);
            db.User.findOne({_id: result.editUserId}, function (err, user) {
                result.editUsername = user.username;
                model.worldview = result;
                callback(err);
            });
        });
    } else {
        callback();
    }
}

function setWorldviewModels(req, model, callback) {
    if(req.query.worldview) {
        async.series({
            worldview: function (callback) {
                setWorldviewModel(req, model, callback);
            },
            parentWorldview: function (callback) {
                if(model.worldview && model.worldview.parentId) {
                    db.Ideology.findOne({_id: model.worldview.parentId}, function (err, result) {
                        if (result) {
                            model.parentWorldview = result;
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

function setQuestionModel(req, model, callback) {
    if(req.query.question) {
        db.Question.findOne({_id: req.query.question}, function (err, result) {
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
                            model.parentArgument = result;
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

function setTopicModels(req, model, callback) {
    if(req.query.topic) {
        async.series({
            topic: function (callback) {
                db.Topic.findOne({_id: req.query.topic}, function(err, result) {
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
                            model.parentTopic = result;
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

module.exports = {
    getBackupDir: getBackupDir,
    isOwner: isOwner,
    appendOwnerFlag: appendOwnerFlag,
    setWorldviewModel: setWorldviewModel,
    setWorldviewModels: setWorldviewModels,
    setArgumentModels: setArgumentModels,
    setTopicModels: setTopicModels,
    setQuestionModel: setQuestionModel,
    setIssueModel: setIssueModel,
    setOpinionModel: setOpinionModel,
    appendEntryExtra: appendEntryExtra,
    setEditorsUsername: setEditorsUsername
};