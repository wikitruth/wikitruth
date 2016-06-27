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
    if(req.query.id) {
        db.Ideology.findOne({_id: req.query.id}, function (err, result) {
            model.item = result;
            appendOwnerFlag(req, result, model);
            callback();
        });
    } else {
        callback();
    }
}

function setWorldviewModels(req, model, callback) {
    if(req.query.id) {
        async.series({
            item: function (callback) {
                db.Ideology.findOne({_id: req.query.id}, function(err, result) {
                    if(result) {
                        model.item = result;
                        appendOwnerFlag(req, result, model);
                    }
                    callback();
                });
            },
            parent: function (callback) {
                if(model.item && model.item.parentId) {
                    db.Ideology.findOne({_id: model.item.parentId}, function (err, result) {
                        if (result) {
                            model.parent = result;
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
            model.question = result;
            if(isOwner(req, result, model)) {
                model.isQuestionOwner = true;
            }
            callback();
        });
    } else {
        callback();
    }
}

function setArgumentModel(req, model, callback) {
    if(req.query.argument) {
        db.Argument.findOne({_id: req.query.argument}, function (err, result) {
            model.argument = result;
            if(isOwner(req, result, model)) {
                model.isArgumentOwner = true;
            }
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
                    if(result) {
                        model.topic = result;
                        if(isOwner(req, result, model)) {
                            model.isTopicOwner = true;
                        }
                    }
                    callback();
                });
            },
            parent: function (callback) {
                if(model.topic && model.topic.parentId) {
                    db.Topic.findOne({_id: model.topic.parentId}, function (err, result) {
                        if (result) {
                            model.parent = result;
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