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
                            flowUtils.setModelOwnerEntry(model);
                            res.render(templates.truth.questions.index, model);
                        });
                    });
                });
            });
        } else {
            // Top Questions
            var query = { ownerType: constants.OBJECT_TYPES.topic };
            //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
            db.Question
                .find(query)
                .sort({editDate: -1})
                .limit(25)
                .lean()
                .exec(function (err, results) {
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

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        var model = {};
        if(!req.query.question) {
            if(req.params.id) {
                req.query.question = req.params.id;
            } else {
                req.query.question = req.params.friendlyUrl;
            }
        }
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            async.parallel({
                issues: function (callback) {
                    // Top Issues
                    db.Issue.find(ownerQuery).limit(15).sort({ title: 1 }).exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.issues = results;
                            callback();
                        });
                    });
                },
                opinions: function (callback) {
                    // Top Opinions
                    db.Opinion.find(ownerQuery).limit(15).sort({ title: 1 }).exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.opinions = results;
                            callback();
                        });
                    });
                }
            }, function (err, results) {
                model.entry = model.question;
                model.entryType = constants.OBJECT_TYPES.question;
                res.render(templates.truth.questions.entry, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function () {
            res.render(templates.truth.questions.create, model);
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
                var updateRedirect = function () {
                    res.redirect((result ? paths.truth.questions.entry : paths.truth.questions.index) +
                        '?topic=' + req.query.topic +
                        (req.query.argument ? '&argument=' + req.query.argument : '') +
                        (result ? '&question=' + req.query.question : '')
                    );
                };
                if(!result) {
                    flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.question, function () {
                        updateRedirect();
                    });
                } else {
                    updateRedirect();
                }
            });
        });
    });
};
