'use strict';

var db      = require('../app').db.models,
    utils   = require('./utils'),
    async   = require('async');

function isOwner(req, item, model) {
    if(item && req.user && item.createUserId && req.user.id && item.createUserId.equals(req.user.id)) {
        return true;
    }
    return false;
}

function appendOwnerFlag(req, item, model) {
    if(isOwner(req, item, model)) {
        model.isItemOwner = true;
    }
}

function appendEntryExtra(result) {
    result.comments = utils.randomInt(0,999);
    result.editUsername = 'root';
    result.points = utils.randomInt(0,9999);

    var editDateString = result.editDate.toUTCString();
    result.editDateString = editDateString.substring(0, editDateString.length - 4);
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
    isOwner: isOwner,
    appendOwnerFlag: appendOwnerFlag,
    setWorldviewModel: setWorldviewModel,
    setWorldviewModels: setWorldviewModels,
    setArgumentModels: setArgumentModels,
    setTopicModels: setTopicModels,
    setQuestionModel: setQuestionModel,
    setIssueModel: setIssueModel,
    setOpinionModel: setOpinionModel,
    appendEntryExtra: appendEntryExtra
};