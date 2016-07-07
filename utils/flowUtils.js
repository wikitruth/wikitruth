'use strict';

var db      = require('../app').db.models,
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

function setArgumentModel(req, model, callback) {
    if(req.query.argument) {
        db.Argument.findOne({_id: req.query.argument}, function (err, result) {
            if(isOwner(req, result, model)) {
                model.isArgumentOwner = true;
            }
            db.User.findOne({_id: result.editUserId}, function (err, user) {
                result.editUsername = user.username;
                model.argument = result;
                callback(err);
            });
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
    setArgumentModel: setArgumentModel,
    setTopicModels: setTopicModels,
    setQuestionModel: setQuestionModel
};