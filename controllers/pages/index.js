'use strict';

var utils = require('../../utils/utils'),
    wikiUtils = require('../../utils/wikiUtils'),
    mongoose = require('mongoose'),
    constants = require('../../models/constants'),
    db = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        if(req.user && req.user.id) {
            db.Page.find({ createUserId: req.user.id }).sort({ title: 1 }).exec(function(err, results) {
                model.pages = results;
                res.render('dust/pages/index', model);
            });
        } else {
            res.render('dust/pages/index', model);
        }
    });

    router.get('/page', function (req, res) {
        var model = {};
        db.Page.findOne({_id: req.query.id}, function(err, result) {
            model.page = result;
            wikiUtils.appendOwnerFlag(req, result, model);
            res.render('dust/pages/page', model);
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        if(req.user && req.user.id && req.query.id) {
            db.Page.findOne({ createUserId: req.user.id, _id: req.query.id}, function (err, result) {
                model.page = result;
                res.render('dust/pages/create', model);
            });
        } else {
            res.render('dust/pages/create', model);
        }
    });

    router.post('/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };

        db.Page.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.id = req.body.id;
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }

            db.Page.update(query, entity, {upsert: true}, function(err, writeResult) {
                if (err) {
                    throw err;
                }

                if(result) {
                    res.redirect('/pages/page?id=' + req.query.id);
                } else {
                    res.redirect('/pages');
                }
            });
        });
    });
};
