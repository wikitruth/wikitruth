'use strict';

var mongoose    = require('mongoose'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

module.exports = function (router) {

    /* Opinions */

    router.get('/', function (req, res) {
        var model = {};
        var query = flowUtils.createOwnerQueryFromQuery(req);
        if(query.ownerId) {
            flowUtils.setEntryModels(query, req, model, function (err) {
                db.Opinion.find(flowUtils.createOwnerQueryFromModel(model)).sort({title: 1}).exec(function (err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            flowUtils.appendEntryExtra(result);
                        });
                        model.opinions = results;
                        res.render(templates.truth.opinions.index, model);
                    });
                });
            });
        } else {
            // Top Opinions
            db.Opinion.find({ ownerType: constants.OBJECT_TYPES.topic }).limit(100).exec(function(err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtra(result);
                    });
                    model.opinions = results;
                    res.render(templates.truth.opinions.index, model);
                });
            });
        }
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        var model = {};
        if(req.params.id && !req.query.opinion) {
            req.query.opinion = req.params.id;
        }
        flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
            model.entry = model.opinion;
            res.render(templates.truth.opinions.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
            res.render(templates.truth.opinions.create, model);
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.opinion || new mongoose.Types.ObjectId() };
        db.Opinion.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.title = req.body.title;
            entity.content = req.body.content;
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
            db.Opinion.update(query, entity, {upsert: true}, function(err, writeResult) {
                res.redirect((result ? paths.truth.opinions.entry : paths.truth.opinions.index) +
                    '?topic=' + req.query.topic +
                    (req.query.argument ? '&argument=' + req.query.argument : '') +
                    (result ? '&opinion=' + req.query.opinion : ''));
            });
        });
    });
};
