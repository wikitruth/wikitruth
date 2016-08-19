'use strict';

var templates   = require('../../models/templates'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/contributors', function (req, res) {
        var model = {};
        db.User.find({}).sort({title: 1}).exec(function (err, results) {
            model.contributors = results;
            res.render(templates.members.contributors, model);
        });
    });

    router.get('/reviewers', function (req, res) {
        var model = {};
        db.User.find({ 'roles.reviewer': true}).sort({title: 1}).exec(function (err, results) {
            model.reviewers = results;
            res.render(templates.members.reviewers, model);
        });
    });

    router.get('/administrators', function (req, res) {
        var model = {};
        db.User.find({ 'roles.admin': {$exists: true}}).sort({title: 1}).exec(function (err, results) {
            model.administrators = results;
            res.render(templates.members.administrators, model);
        });
    });

    router.get('/profile', function (req, res) {
        var model = {};
        if(req.query.username) {
            db.User.findOne({'username': req.query.username}, function (err, result) {
                model.member = result;
                res.render(templates.members.profile, model);
            });
        } else {
            model.member = req.user;
            res.render(templates.members.profile, model);
        }
    });
};
