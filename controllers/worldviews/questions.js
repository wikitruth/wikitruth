'use strict';

var mongoose    = require('mongoose'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    /* Questions */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModel(req, model, function () {
                    var query = req.query.argument ?
                    { ownerId: model.argument._id, ownerType: constants.OBJECT_TYPES.argument } :
                    { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
                    db.Question.find(query).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                        });
                        model.questions = results;
                        res.render(templates.worldviews.questions.index, model);
                    });
                });
            });
        } else {
            // Top Questions
            db.Question.find({ ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.worldviews }).limit(100).exec(function(err, results) {
                results.forEach(function(result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                });
                model.questions = results;
                res.render(templates.worldviews.questions.index, model);
            });
        }
    });

    router.get('/entry', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.worldviews.questions.entry, model);
                });
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.worldviews.questions.create, model);
                });
            });
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.question || new mongoose.Types.ObjectId() };
        db.Question.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.title = req.body.title;
            entity.content = req.body.content;
            entity.references = req.body.references;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
                entity.groupId = constants.CORE_GROUPS.worldviews;
            }
            if(!entity.ownerId) {
                if(req.query.argument) {
                    entity.ownerId = req.query.argument;
                    entity.ownerType = constants.OBJECT_TYPES.argument;
                } else if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = constants.OBJECT_TYPES.topic;
                }
            }
            db.Question.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                res.redirect((result ? paths.worldviews.questions.entry : paths.worldviews.questions.index) +
                    '?topic=' + req.query.topic +
                    (req.query.argument ? '&argument=' + req.query.argument : '') +
                    (result ? '&question=' + req.query.question : ''));
            });
        });
    });
};
