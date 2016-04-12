'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    modelTypes  = require('../../models/constants').MODEL_TYPES,
    db          = require('../../app').db.models;

module.exports = function (router) {

    /* Arguments */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                db.Argument.find({ ownerId: model.topic._id, ownerType: modelTypes.topic }).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.arguments = results;
                    res.render(templates.truth.arguments.index, model);
                });
            });
        } else {
            // Top Discussions
            db.Argument.find({ ownerType: modelTypes.topic }).limit(100).exec(function(err, results) {
                results.forEach(function(result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                });
                model.arguments = results;
                res.render(templates.truth.arguments.index, model);
            });
        }
    });

    router.get('/entry', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.truth.arguments.entry, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.truth.arguments.create, model);
            });
        });
    });

    router.post('/create', function (req, res) {
        var query = {
            _id: req.query.argument ? req.query.argument : new mongoose.Types.ObjectId()
        };
        db.Argument.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            if(!entity.ownerId) {
                /*if(req.query.argument) { // parent is an argument
                    entity.ownerId = req.query.argument;
                    entity.ownerType = modelTypes.argument;
                } else*/
                if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = modelTypes.topic;
                }
            }
            db.Argument.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect(paths.truth.argument.entry + '?topic=' + req.query.topic + '&argument=' + req.query.argument);
                } else {
                    res.redirect(paths.truth.arguments.index + '?topic=' + req.query.topic);
                }
            });
        });
    });
};
