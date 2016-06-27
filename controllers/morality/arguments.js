'use strict';

var mongoose    = require('mongoose'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    constants  = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    /* Arguments */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                db.Argument.find({ ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic }).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.arguments = results;
                    res.render(templates.morality.arguments.index, model);
                });
            });
        } else {
            // Top Discussions
            db.Argument.find({ ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.morality }).limit(100).exec(function(err, results) {
                results.forEach(function(result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                });
                model.arguments = results;
                res.render(templates.morality.arguments.index, model);
            });
        }
    });

    router.get('/entry', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.morality.arguments.entry, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.morality.arguments.create, model);
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
            entity.references = req.body.references;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
                entity.groupId = constants.CORE_GROUPS.morality;
            }
            if(!entity.ownerId) {
                if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = constants.OBJECT_TYPES.topic;
                }
            }
            db.Argument.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect(paths.morality.arguments.entry + '?topic=' + req.query.topic + '&argument=' + req.query.argument);
                } else {
                    res.redirect(paths.morality.arguments.index + '?topic=' + req.query.topic);
                }
            });
        });
    });
};
