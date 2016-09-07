'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

module.exports = function (router) {

    /* Questions */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModels(req, model, function () {
                    var query = req.query.argument ?
                        { ownerId: model.argument._id, ownerType: constants.OBJECT_TYPES.argument } :
                        { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
                    db.Question.find(query).sort({ title: 1 }).exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.questions = results;
                            res.render(templates.truth.questions.index, model);
                        });
                    });
                });
            });
        } else {
            // Top Questions
            var query = { ownerType: constants.OBJECT_TYPES.topic };
            db.Question.aggregate([ {$match: query}, {$sample: { size: 100 } } ], function(err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtra(result);
                    });
                    model.questions = results;
                    res.render(templates.truth.questions.index, model);
                });
            });
        }
    });

    router.get('/entry(/:friendlyUrl)?', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            argument: function (callback) {
                flowUtils.setArgumentModels(req, model, callback);
            },
            question: function (callback) {
                flowUtils.setQuestionModel(req, model, callback);
            },
            issues: function (callback) {
                // Top Issues
                var query = { ownerId: req.query.question, ownerType: constants.OBJECT_TYPES.question };
                db.Issue.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.comments = utils.randomInt(0,999);
                    });
                    model.issues = results;
                    callback();
                });
            },
            opinions: function (callback) {
                // Top Opinions
                var query = { ownerId: req.query.question, ownerType: constants.OBJECT_TYPES.question };
                db.Opinion.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.comments = utils.randomInt(0,999);
                    });
                    model.opinions = results;
                    callback();
                });
            }
        }, function (err, results) {
            model.entry = model.question;
            res.render(templates.truth.questions.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.truth.questions.create, model);
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
                res.redirect((result ? paths.truth.questions.entry : paths.truth.questions.index) +
                    '?topic=' + req.query.topic +
                    (req.query.argument ? '&argument=' + req.query.argument : '') +
                    (result ? '&question=' + req.query.question : ''));
            });
        });
    });
};
