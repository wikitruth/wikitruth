'use strict';

var constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.post('/take-ownership', function (req, res) {
        var id = req.body.id;
        var type = req.body.type;

        if(req.user.isAdmin()) {
            var query = {_id: id};
            if(type == constants.OBJECT_TYPES.topic) {
                db.Topic.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = Date.now();
                    db.Topic.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else if(type == constants.OBJECT_TYPES.argument) {
                db.Argument.findOne(query, function(err, entry) {
                    entry.createUserId = req.user.id;
                    entry.editUserId = req.user.id;
                    entry.editDate = Date.now();
                    db.Argument.update(query, entry, {upsert: true}, function(err, writeResult) {
                        res.send({});
                    });
                });
            } else {
                res.send({});
            }
        } else {
            res.send({});
        }
    });

    router.post('/delete', function (req, res) {
        var id = req.body.id;
        var type = req.body.type;

        if(req.user.isAdmin()) {
            if(type == constants.OBJECT_TYPES.topic) {
                db.Topic.findByIdAndRemove(id, function(err, entry) {
                    res.send({});
                });
            } else if(type == constants.OBJECT_TYPES.argument) {
                db.Argument.findByIdAndRemove(id, function(err, entry) {
                    res.send({});
                });
            } else {
                res.send({});
            }
        } else {
            res.send({});
        }
    });
};
