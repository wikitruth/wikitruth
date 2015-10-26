'use strict';

var utils = require('../../utils/utils'),
    wikiUtils = require('../../utils/wikiUtils'),
    mongoose = require('mongoose'),
    constants = require('../../models/constants'),
    db = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        db.Ideology.find({}).limit(100).sort({ title: 1 }).exec(function(err, results) {
            results.forEach(function(result) {
                result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
            });
            model.items = results;
            res.render('dust/ideology/index', model);
        });
    });

    router.get('/entry', function (req, res) {
        var model = {};
        db.Ideology.findOne({_id: req.query.id}, function(err, result) {
            model.item = result;
            wikiUtils.appendOwnerFlag(req, result, model);
            res.render('dust/ideology/item', model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        if(req.query.id) {
            db.Ideology.findOne({_id: req.query.id}, function (err, result) {
                model.item = result;
                res.render('dust/ideology/create', model);
            });
        } else {
            res.render('dust/ideology/create', model);
        }
    });

    router.post('/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };

        db.Ideology.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }

            db.Ideology.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }

                if(result) {
                    res.redirect('/ideology/entry?id=' + req.query.id);
                } else {
                    res.redirect('/ideology');
                }
            });
        });
    });

    /* Questions */

    router.get('/questions', function (req, res) {
        var model = {};
        if(req.query.id) {
            db.Ideology.findOne({_id: req.query.id}, function (err, result) {
                model.item = result;
                wikiUtils.appendOwnerFlag(req, result, model);
                res.render('dust/ideology/questions', model);
            });
        } else {
            // Top Questions
            // TODO: Filter top 100 based on number of activities
            res.render('dust/ideology/questions', model);
        }
    });

    router.get('/question/create', function (req, res) {
        var model = {};
        db.Ideology.findOne({_id: req.query.id}, function (err, result) {
            model.item = result;
            res.render('dust/ideology/question/create', model);
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        db.Ideology.findOne({_id: req.query.id}, function (err, result) {
            model.item = result;
            wikiUtils.appendOwnerFlag(req, result, model);
            res.render('dust/ideology/related', model);
        });
    });
};
