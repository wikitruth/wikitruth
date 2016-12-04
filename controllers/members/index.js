'use strict';

var templates   = require('../../models/templates'),
    async       = require('async'),
    flowUtils   = require('../../utils/flowUtils'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
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

    router.get('/:username', function (req, res) {
        var model = {};
        if(req.params.username) {
            if(req.user && req.user.username === req.params.username) {
                model.user = req.user;
                model.loggedIn = true;
            } else {
                return db.User.findOne({'username': req.params.username}, function (err, result) {
                    model.user = result;
                    res.render(templates.members.profile.index, model);
                });
            }
        }
        res.render(templates.members.profile.index, model);
    });

    router.get('/:username/contributions', function (req, res) {
        var model = {};
        if(req.params.username) {
            if(req.user && req.user.username === req.params.username) {
                model.user = req.user;
                model.loggedIn = true;
            } else {
                return db.User.findOne({'username': req.params.username}, function (err, result) {
                    model.user = result;
                    res.render(templates.members.profile.contributions, model);
                });
            }
        }
        res.render(templates.members.profile.contributions, model);
    });

    router.get('/:username/topics', function (req, res) {
        var model = {};
        async.series({
            user: function(callback){
                if(req.params.username) {
                    if (req.user && req.user.username === req.params.username) {
                        model.user = req.user;
                        model.loggedIn = true;
                    } else {
                        return db.User.findOne({username: req.params.username}, function (err, result) {
                            model.user = result;
                            callback();
                        });
                    }
                }
                callback();
            },
            topics: function(callback) {
                // display 15 if top topics, all if has topic parameter
                flowUtils.getTopics({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: model.user._id }, 0, function (err, results) {
                    model.topics = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.members.profile.topics, model);
        });
    });
};
