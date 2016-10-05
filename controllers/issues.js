'use strict';

var mongoose    = require('mongoose'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

module.exports = function (router) {

    /* Issues */

    router.get('/', function (req, res) {
        var model = {};
        var query = flowUtils.createOwnerQueryFromQuery(req);
        if(query.ownerId) {
            flowUtils.setEntryModels(query, req, model, function (err) {
                db.Issue.find(flowUtils.createOwnerQueryFromModel(model)).sort({title: 1}).exec(function (err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            flowUtils.appendEntryExtra(result);
                        });
                        model.issues = results;
                        flowUtils.setModelOwnerEntry(model);
                        res.render(templates.truth.issues.index, model);
                    });
                });
            });
        } else {
            // Top Issues
            db.Issue.find({ ownerType: constants.OBJECT_TYPES.topic }).limit(100).exec(function(err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtra(result);
                    });
                    model.issues = results;
                    res.render(templates.truth.issues.index, model);
                });
            });
        }
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        var model = {};
        if(!req.query.issue) {
            if(req.params.id) {
                req.query.issue = req.params.id;
            } else {
                req.query.issue = req.params.friendlyUrl;
            }
        }
        flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
            model.entry = model.issue;
            model.issueType = constants.ISSUE_TYPES['type' + model.issue.issueType].text;
            model.entryType = constants.OBJECT_TYPES.issue;
            res.render(templates.truth.issues.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
            model.ISSUE_TYPES = constants.ISSUE_TYPES;
            res.render(templates.truth.issues.create, model);
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.issue || new mongoose.Types.ObjectId() };
        db.Issue.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.title = req.body.title;
            entity.content = req.body.content;
            entity.issueType = req.body.issueType;
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
                } else if(req.query.question) {
                    entity.ownerId = req.query.question;
                    entity.ownerType = constants.OBJECT_TYPES.question;
                } else if(req.query.topic) { // parent is a topic
                    entity.ownerId = req.query.topic;
                    entity.ownerType = constants.OBJECT_TYPES.topic;
                }
            }
            db.Issue.update(query, entity, {upsert: true}, function(err, writeResult) {
                var updateRedirect = function () {
                    res.redirect((result ? paths.truth.issues.entry : paths.truth.issues.index) +
                        '?topic=' + req.query.topic +
                        (req.query.argument ? '&argument=' + req.query.argument : '') +
                        (result ? '&issue=' + req.query.issue : '')
                    );
                };
                if(!result) {
                    flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.issue, function () {
                        updateRedirect();
                    });
                } else {
                    updateRedirect();
                }
            });
        });
    });
};
