'use strict';

var utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    mongoose    = require('mongoose'),
    async       = require('async'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            item: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            items: function(callback) {
                var query = req.query.id ? { parentId: req.query.id } : { parentId: null};
                db.Ideology.find(query).limit(100).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.items = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.worldviews.index, model);
        });
    });

    // item details
    router.get('/entry', function (req, res) {
        var model = {};
        async.parallel({
            item: function(callback){
                flowUtils.setWorldviewModels(req, model, callback);
            },
            items: function(callback) {
                var query = { parentId: req.query.id };
                db.Ideology.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.items = results;
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
            item: function(callback){
                if(req.query._id) {
                    db.Ideology.findOne({_id: req.query._id}, function (err, result) {
                        model.item = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parent: function(callback) {
                var query = {
                    _id: req.query.id ? req.query.id : model.item && model.item.parentId ? model.item.parentId : null
                };
                if(query._id) {
                    db.Ideology.findOne(query, function (err, result) {
                        model.parent = result;
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
            _id: req.query._id ? req.query._id : new mongoose.Types.ObjectId()
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
                    res.redirect(paths.worldviews.entry + '?id=' + req.query._id);
                } else if(req.query.id) {
                    res.redirect(paths.worldviews.index + '?id=' + req.query.id);
                } else {
                    res.redirect(paths.worldviews.index);
                }
            });
        });
    });

    /* Questions */

    router.get('/questions', function (req, res) {
        var model = {};
        flowUtils.setWorldviewModel(req, model, function() {
            /*if(!req.query.id) {
                // Top Questions
                // TODO: Filter top 100 based on number of activities
            }*/
            res.render(templates.worldviews.questions.index, model);
        });
    });

    router.get('/questions/create', function (req, res) {
        var model = {};
        flowUtils.setWorldviewModel(req, model, function() {
            res.render(templates.worldviews.questions.create, model);
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
