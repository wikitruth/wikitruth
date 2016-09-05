'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    url         = require('url'),
    querystring = require('querystring'),
    db          = require('../../app').db.models;

function createCancelUrl(req) {
    var nextUrl = url.parse(req.originalUrl);
    var nextQuery = querystring.parse(nextUrl.query);
    nextUrl.pathname = nextQuery.source;
    delete nextQuery.id;
    delete nextQuery.source;
    nextUrl.query = nextQuery;
    nextUrl.search = null;
    return url.format(nextUrl);
}

module.exports = function (router) {

    /* Arguments */

    router.get('/', function (req, res) {
        var model = {};
        if(req.query.topic) {
            flowUtils.setTopicModels(req, model, function () {
                flowUtils.setArgumentModels(req, model, function () {
                    var query = {};
                    if(req.query.argument) {
                        query.parentId = model.argument._id;
                    } else {
                        query.parentId = null;
                        query.ownerId = model.topic._id;
                        query.ownerType = constants.OBJECT_TYPES.topic;
                    }
                    flowUtils.getArguments(query, 0, function (err, results) {
                        var support = results.filter(function (arg) {
                            return !arg.against;
                        });
                        var contra = results.filter(function (arg) {
                            return arg.against;
                        });
                        if(support.length > 0) {
                            model.arguments = support;
                        }
                        if(contra.length > 0) {
                            model.contraArguments = contra;
                        }
                        results.forEach(function (result) {
                            flowUtils.setVerdictModel(result);
                        });
                        res.render(templates.truth.arguments.index, model);
                    });
                });
            });
        } else {
            // Top Discussions
            var query = { ownerType: constants.OBJECT_TYPES.topic, groupId: constants.CORE_GROUPS.truth };
            db.Argument.aggregate([ {$match: query}, {$sample: { size: 100 } } ], function(err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtra(result);
                        flowUtils.setVerdictModel(result);
                    });
                    model.arguments = results;
                    res.render(templates.truth.arguments.index, model);
                });
            });
        }
    });

    router.get('/entry(/:friendlyUrl)?', function (req, res) {
        var model = {};
        flowUtils.setArgumentModels(req, model, function (err) {
            async.parallel({
                /*argument: function (callback) {
                 flowUtils.setArgumentModels(req, model, callback);
                 },*/
                topic: function(callback){
                    flowUtils.setTopicModels(req, model, callback);
                },
                arguments: function(callback) {
                    // Top Arguments
                    var query = {
                        parentId: req.query.argument
                    };
                    flowUtils.getArguments(query, 0, function (err, results) {
                        results.forEach(function (result) {
                            flowUtils.setVerdictModel(result);
                        });
                        callback(null, results);
                    });
                },
                links: function (callback) {
                    // Top Questions
                    var query = { argumentId: req.query.argument };
                    db.ArgumentLink.find(query, function(err, results) {
                        callback(null, results);
                    });
                },
                questions: function (callback) {
                    // Top Questions
                    var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.truth };
                    db.Question.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.questions = results;
                            callback();
                        });
                    });
                },
                issues: function (callback) {
                    // Top Issues
                    var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.truth };
                    db.Issue.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.comments = utils.randomInt(0,999);
                        });
                        model.issues = results;
                        callback();
                    });
                },
                opinions: function (callback) {
                    // Top Opinions
                    var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, groupId: constants.CORE_GROUPS.truth };
                    db.Opinion.find(query).limit(15).sort({ title: 1 }).exec(function(err, results) {
                        results.forEach(function(result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.comments = utils.randomInt(0,999);
                        });
                        model.opinions = results;
                        callback();
                    });
                }
            }, function (err, results) {
                flowUtils.setVerdictModel(model.argument);
                if(model.isArgumentOwner) {
                    model.isEntryOwner = true;
                }
                var support = results.arguments.filter(function (arg) {
                    return !arg.against;
                });
                var contra = results.arguments.filter(function (arg) {
                    return arg.against;
                });
                if(support.length > 0) {
                    model.supportingArgumentCount = support.length;
                    model.arguments = support.slice(0, 15);
                }
                if(contra.length > 0) {
                    model.opposingArgumentCount = contra.length;
                    model.contraArguments = contra.slice(0, 15);
                }
                model.entry = model.argument;
                model.entryType = constants.OBJECT_TYPES.argument;
                if(results.links.length > 0) {
                    model.linkCount = results.links.length;
                }
                flowUtils.prepareClipboardOptions(req, model, constants.OBJECT_TYPES.argument);
                res.render(templates.truth.arguments.entry, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {
            argumentTypes: constants.ARGUMENT_TYPES
        };
        flowUtils.setTopicModels(req, model, function () {
            async.series({
                argument: function (callback) {
                    if(req.query.id) {
                        db.Argument.findOne({_id: req.query.id}, function (err, result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            model.argument = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                parentArgument: function (callback) {
                    var query = { _id: req.query.argument ? req.query.argument : model.argument && model.argument.parentId ? model.argument.parentId : null };
                    if(query._id) {
                        db.Argument.findOne(query, function (err, result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            model.parentArgument = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                }
            }, function (err, results) {
                res.render(templates.truth.arguments.create, model);
            });
        });
    });

    router.post('/create', function (req, res) {
        var parent = null;
        var entry = null;
        async.series({
            parent: function (callback) {
                if(req.body.parent) {
                    db.Argument.findOne({_id: req.body.parent}, function (err, result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        parent = result;
                        callback(err);
                    });
                } else {
                    callback();
                }
            },
            update: function (callback) {
                var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
                db.Argument.findOne(query, function(err, result) {
                    entry = result;
                    var entity = result ? result : {};
                    entity.content = req.body.content;
                    entity.title = req.body.title;
                    entity.references = req.body.references;
                    entity.editUserId = req.user.id;
                    entity.editDate = Date.now();
                    entity.typeId = req.body.typeId;
                    entity.ethicalStatus.hasValue = req.body.hasEthicalValue ? true : false;
                    if(parent) { // Parent is always an Argument
                        // A child argument.
                        entity.parentId = parent._id;
                        entity.ownerId = parent.ownerId; // TODO: redundant??? Since you can derive this from the parent? But filtering will be easier this way.
                        entity.ownerType = parent.ownerType; // TODO: redundant???
                        entity.threadId = parent.threadId ? parent.threadId : parent._id;
                        entity.against = !req.body.supportsParent;
                    } else {
                        // A root argument.
                        entity.parentId = null;
                        entity.threadId = null; // TODO: should set to self._id
                        entity.against = false;
                        if(req.query.topic) { // owner is a topic. Should the owner be specified only if it's a root argument, i.e. parent == null?
                            entity.ownerId = req.query.topic;
                            entity.ownerType = constants.OBJECT_TYPES.topic;
                        }
                        //if(!entity.ownerId) {} // Owner can be any object
                    }
                    if(!result) {
                        entity.createUserId = req.user.id;
                        entity.createDate = Date.now();
                        entity.groupId = constants.CORE_GROUPS.truth;
                    }
                    /*} else if(req.user.isAdmin()) {
                        entity.createUserId = req.body.author;
                    }*/
                    db.Argument.update(query, entity, {upsert: true}, function(err, writeResult) {
                        callback();
                    });
                });
            }
        }, function (err, results) {
            res.redirect((entry ? paths.truth.arguments.entry : paths.truth.arguments.index)
                + '?topic=' + req.query.topic + (entry ? '&argument=' + entry._id : '')
            );
        });

    });


    router.get('/link', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            async.series({
                argument: function (callback) {
                    if(req.query.id) {
                        db.ArgumentLink.findOne({_id: req.query.id}, function(err, link) {
                            model.link = link;
                            db.Argument.findOne({_id: link.argumentId}, function(err, result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                model.argument = result;
                                callback();
                            });
                        });
                    } else {
                        callback();
                    }
                },
                parentArgument: function (callback) {
                    var query = { _id: req.query.argument ? req.query.argument : model.link && model.link.parentId ? model.link.parentId : null };
                    if(query._id) {
                        db.Argument.findOne(query, function (err, result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            model.parentArgument = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                }
            }, function (err, results) {
                model.cancelUrl = createCancelUrl(req);
                res.render(templates.truth.arguments.link, model);
            });
        });
    });

    router.post('/link', function (req, res) {
        var action = req.body.action;
        if(action === 'delete') {
            db.ArgumentLink.findByIdAndRemove(req.query.id, function(err, link) {
                res.redirect(createCancelUrl(req));
            });
        } else if(action === 'submit') {
            var query = { _id: req.query.id };
            db.ArgumentLink.findOne(query, function (err, result) {
                var entity = result;
                entity.title = req.body.title;
                entity.editUserId = req.user.id;
                entity.editDate = Date.now();
                entity.against = !req.body.supportsParent;
                db.ArgumentLink.update(query, entity, {upsert: true}, function (err, writeResult) {
                    res.redirect(createCancelUrl(req));
                });
            });
        }
    });
};
