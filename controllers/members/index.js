'use strict';

var templates   = require('../../models/templates'),
    async       = require('async'),
    flowUtils   = require('../../utils/flowUtils'),
    utils       = require('../../utils/utils'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models;

function setMemberModel(model, req, callback) {
    if(req.params.username) {
        if (req.user && req.user.username === req.params.username) {
            model.member = req.user;
            model.loggedIn = true;
        } else {
            return db.User.findOne({username: req.params.username}, function (err, result) {
                model.member = result;
                callback();
            });
        }
    }
    callback();
}

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
        setMemberModel(model, req, function() {
            model.url = '/members/' + model.member.username + '/contributions';
            async.parallel({
                topics: function(callback) {
                    db.Topic
                        .find({ createUserId: model.member._id })
                        .count(function(err, count) {
                            model.topics = count;
                            callback();
                        });
                },
                arguments: function(callback) {
                    db.Argument
                        .find({ createUserId: model.member._id })
                        .count(function(err, count) {
                            model.arguments = count;
                            callback();
                        });
                },
                questions: function (callback) {
                    db.Question
                        .find({ createUserId: model.member._id })
                        .count(function(err, count) {
                            model.questions = count;
                            callback();
                        });
                },
                issues: function (callback) {
                    db.Issue
                        .find({ createUserId: model.member._id })
                        .count(function(err, count) {
                            model.issues = count;
                            callback();
                        });
                },
                opinions: function (callback) {
                    db.Opinion
                        .find({ createUserId: model.member._id })
                        .count(function(err, count) {
                            model.opinions = count;
                            callback();
                        });
                }
            }, function (err, results) {
                model.contributions = model.topics + model.arguments + model.questions + model.issues + model.opinions;
                res.render(templates.members.profile.index, model);
            });
        });
    });

    router.get('/:username/contributions', function (req, res) {
        var model = {};
        setMemberModel(model, req, function () {
            var tab = req.query.tab ? req.query.tab : 'all';
            model.tab = tab;
            model.results = tab !== 'all';
            model.url = '/members/' + model.member.username + '/contributions';
            async.parallel({
                topics: function(callback) {
                    if(tab !== 'all' && tab !== 'topics') {
                        return callback();
                    }
                    db.Topic
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            if(err || !results) {
                                callback(err);
                            }
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    result.friendlyUrl = utils.urlify(result.title);
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.topics = results;
                                if(results.length > 0) {
                                    if(results.length === 15) {
                                        model.topicsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                arguments: function(callback) {
                    if(tab !== 'all' && tab !== 'arguments') {
                        return callback();
                    }
                    db.Argument
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    result.friendlyUrl = utils.urlify(result.title);
                                    flowUtils.appendEntryExtra(result);
                                    flowUtils.setVerdictModel(result);
                                });
                                model.arguments = results;
                                if (results.length > 0) {
                                    if(results.length === 15) {
                                        model.argumentsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                questions: function (callback) {
                    if(tab !== 'all' && tab !== 'questions') {
                        return callback();
                    }
                    db.Question
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    result.friendlyUrl = utils.urlify(result.title);
                                    result.friendlyUrl = utils.urlify(result.title);
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.questions = results;
                                if(results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                issues: function (callback) {
                    if(tab !== 'all' && tab !== 'issues') {
                        return callback();
                    }
                    db.Issue
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    result.friendlyUrl = utils.urlify(result.title);
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if(results.length === 15) {
                                        model.issuesMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                opinions: function (callback) {
                    if(tab !== 'all' && tab !== 'opinions') {
                        return callback();
                    }
                    db.Opinion
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    result.friendlyUrl = utils.urlify(result.title);
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if(results.length === 15) {
                                        model.opinionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                }
            }, function (err, results) {
                res.render(templates.members.profile.contributions, model);
            });
        });
    });

    router.get('/:username/topics', function (req, res) {
        var model = {};
        async.series({
            user: function(callback){
                setMemberModel(model, req, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, all if has topic parameter
                flowUtils.getTopics({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id }, 0, function (err, results) {
                    model.topics = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.members.profile.topics, model);
        });
    });
};
