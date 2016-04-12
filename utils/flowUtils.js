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
    setArgumentModel: setArgumentModel,
    setTopicModels: setTopicModels
};