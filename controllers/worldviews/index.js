'use strict';

var utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    mongoose    = require('mongoose'),
    async       = require('async'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            worldview: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            worldviews: function(callback) {
                var query = req.query.worldview ? { parentId: req.query.worldview } : { parentId: null};
                db.Ideology.find(query).limit(100).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.worldviews = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.worldviews.index, model);
        });
    });

    // worldview details
    router.get('/entry', function (req, res) {
        var model = {};
        async.parallel({
            worldview: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            worldviews: function(callback) {
                var query = { parentId: req.query.worldview };
                db.Ideology.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.worldviews = results;
                    callback();
                });
            },
            topics: function(callback) {
                // Top Subtopics
                var query = { parentId: null, ownerId: req.query.worldview, ownerType: constants.OBJECT_TYPES.worldview, groupId: constants.CORE_GROUPS.worldviews };
                db.Topic.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.topics = results;
                    callback();
                });
            },
            arguments: function(callback) {
                // Top Arguments
                var query = { ownerId: req.query.worldview, ownerType: constants.OBJECT_TYPES.worldview, groupId: constants.CORE_GROUPS.worldviews };
                db.Argument.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.arguments = results;
                    callback();
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.worldview, ownerType: constants.OBJECT_TYPES.worldview, groupId: constants.CORE_GROUPS.worldviews };
                db.Question.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.questions = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.worldviews.entry, model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        async.series({
            worldview: function(callback){
                if(req.query.id) {
                    db.Ideology.findOne({_id: req.query.id}, function (err, result) {
                        model.worldview = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parentWorldview: function(callback) {
                var query = {
                    _id: req.query.worldview ? req.query.worldview : model.worldview && model.worldview.parentId ? model.worldview.parentId : null
                };
                if(query._id) {
                    db.Ideology.findOne(query, function (err, result) {
                        model.parentWorldview = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.worldviews.create, model);
        });
    });

    router.post('/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };
        db.Ideology.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.references = req.body.references;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Ideology.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }
                if(result) {
                    res.redirect(paths.worldviews.entry + '?worldview=' + result._id);
                } else {
                    res.redirect(paths.worldviews.index + (req.query.id ? '?worldview=' + req.query.id : ''));
                }
            });
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setWorldviewModel(req, model, function() {
            res.render(templates.worldviews.related, model);
        });
    });
};
