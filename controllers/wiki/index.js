'use strict';

var utils = require('../../utils/utils'),
    mongoose = require('mongoose'),
    db = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        db.Topic.find({}, function(err, results) {
            results.forEach(function(result) {
                result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
            });
            model.topics = results;
            res.render('dust/wiki/index', model);
        });
        //res.send('<code><pre>' + JSON.stringify(model, null, 2) + '</pre></code>');
    });

    router.get('/topic', function (req, res) {
        var model = {};
        db.Topic.findOne({_id: req.query.id}, function(err, result) {
            model.topic = result;
            res.render('dust/wiki/topic', model);
        });
    });

    router.get('/topic/create', function (req, res) {
        var model = {};
        if(req.query.id) {
            db.Topic.findOne({_id: req.query.id}, function (err, result) {
                model.topic = result;
                res.render('dust/wiki/topic/create', model);
            });
        } else {
            res.render('dust/wiki/topic/create', model);
        }
    });

    router.post('/topic/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };

        db.Topic.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }

            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }

                if(result) {
                    res.redirect('/wiki/topic?id=' + req.query.id);
                } else {
                    res.redirect('/wiki');
                }
            });
        });
    });

    router.get('/arguments', function (req, res) {
        var model = {};
        db.Topic.findOne({_id: req.query.id}, function(err, result) {
            model.topic = result;
            res.render('dust/wiki/arguments', model);
        });
    });
};
