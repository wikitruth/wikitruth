'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    url         = require('url'),
    querystring = require('querystring'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

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

function getEntry(req, res) {
    // Topic home: display top subtopics, top arguments
    var model = {};
    if(!req.query.topic) {
        if(req.params.id) {
            req.query.topic = req.params.id;
        } else {
            var friendlyId = req.params.friendlyUrl;
            if(friendlyId) {
                if(utils.isObjectIdString(friendlyId)) {
                    req.query.topic = friendlyId;
                } else {
                    req.query.friendlyUrl = friendlyId;
                }
            }
        }
    }
    flowUtils.setTopicModels(req, model, function () {
        if(!model.topic) {
            return res.redirect('/');
        }
        if(!req.query.topic) {
            req.query.topic = model.topic._id;
        }
        async.parallel({
            topics: function(callback) {
                // Top Subtopics
                var query = { parentId: req.query.topic };
                flowUtils.getTopics(query, 15, function (err, results) {
                    model.topics = results;
                    callback();
                });
            },
            links: function (callback) {
                // Top Linked Topics
                var query = { topicId: req.query.topic };
                /*db.TopicLink.find(query, function(err, results) {
                 callback(null, results);
                 });*/
                db.TopicLink
                    .find(query)
                    .lean()
                    .exec(function(err, links) {
                        if(links.length > 0) {
                            model.linkCount = links.length + 1;
                            var ids = links.map(function (link) {
                                return link.parentId;
                            });
                            var query = {
                                _id: {
                                    $in: ids
                                }
                            };
                            db.Topic
                                .find(query)
                                .sort({title: 1})
                                .lean()
                                .exec(function (err, results) {
                                    if (results.length > 0) {
                                        model.topicLinks = results;
                                        results.forEach(function (result) {
                                            result.friendlyUrl = utils.urlify(result.title);
                                            var link = links.find(function (link) {
                                                return link.topicId.equals(result._id);
                                            });
                                            if (link) {
                                                result.link = link;
                                            }
                                        });
                                    }
                                    callback();
                                });
                        } else {
                            callback();
                        }
                    });
            },
            arguments: function(callback) {
                // Top Arguments
                var query = {
                    parentId: null,
                    ownerId: req.query.topic,
                    ownerType: constants.OBJECT_TYPES.topic
                };
                flowUtils.getArguments(query, 0, function (err, results) {
                    results.forEach(function (result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        flowUtils.setVerdictModel(result);
                    });
                    callback(null, results);
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic };
                db.Question.find(query).limit(15).exec(function(err, results) {
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
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic };
                db.Issue
                    .find(query)
                    .limit(15)
                    .sort({ title: 1 })
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.issues = results;
                            callback();
                        });
                    });
            },
            opinions: function (callback) {
                // Top Opinions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic };
                db.Opinion
                    .find(query)
                    .limit(15)
                    .sort({ title: 1 })
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            results.forEach(function (result) {
                                result.friendlyUrl = utils.urlify(result.title);
                                flowUtils.appendEntryExtra(result);
                            });
                            model.opinions = results;
                            callback();
                        });
                    });
            }
        }, function (err, results) {
            model.entry = model.topic;
            model.entryType = constants.OBJECT_TYPES.topic;
            if(model.isTopicOwner) {
                model.isEntryOwner = true;
            }
            model.arguments = results.arguments.slice(0, 15);
            model.verdict = {
                counts: flowUtils.getVerdictCount(results.arguments)
            };
            flowUtils.prepareClipboardOptions(req, model, constants.OBJECT_TYPES.topic);
            res.render(templates.truth.topics.entry, model);
        });
    });
}

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, all if has topic parameter
                flowUtils.getTopics({ parentId: req.query.topic }, 0, function (err, results) {
                    model.topics = results;
                    callback();
                });
            }
        }, function (err, results) {
            model.entry = model.topic;
            res.render(templates.truth.topics.index, model);
        });
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        getEntry(req, res);
    });

    /**
     * basic rule: id is the entry, query.topic or topic.parentId is the parent.
     */
    router.get('/create', function (req, res) {
        var model = {};
        async.series({
            topic: function(callback){
                if(req.query.id) {
                    db.Topic.findOne({_id: req.query.id}, function (err, result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.shortTitle = utils.getShortText(result.title);
                        model.topic = result;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            parentTopic: function(callback) {
                var query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
                if(query._id) {
                    db.Topic.findOne(query, function (err, result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.shortTitle = utils.getShortText(result.title);
                        model.parentTopic = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.truth.topics.create, model);
        });
    });

    router.post('/create', function (req, res) {
        var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
        db.Topic.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.contextTitle = req.body.contextTitle;
            entity.references = req.body.references;
            entity.friendlyUrl = utils.urlify(req.body.title);
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            entity.icon = req.body.icon;
            if(!entity.ethicalStatus) {
                entity.ethicalStatus = {};
            }
            entity.ethicalStatus.hasValue = req.body.hasEthicalValue ? true : false;
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            entity.parentId = req.body.parent ? req.body.parent : null;
            db.Topic.update(query, entity, {upsert: true}, function(err, writeResult) {
                var updateRedirect = function () {
                    var url = "";
                    var query = "";
                    if(result) {
                        url = paths.truth.topics.entry;
                        query = '/' + result._id;
                    } else {
                        url = req.query.topic ? paths.truth.topics.entry : paths.truth.index;
                        query = req.query.topic ? '/' + req.query.topic : '';
                    }
                    res.redirect(url + query);
                };

                if(entity.parentId && !result) { // update parent count on create only
                    flowUtils.updateChildrenCount(entity.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                        updateRedirect();
                    });
                } else {
                    updateRedirect();
                }
            });
        });
    });


    router.get('/link', function (req, res) {
        var model = {};
        async.series({
            entry: function (callback) {
                if(req.query.id) {
                    db.TopicLink.findOne({_id: req.query.id}, function(err, link) {
                        model.link = link;
                        db.Topic.findOne({_id: link.topicId}, function(err, result) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.shortTitle = utils.getShortText(result.title);
                            model.topic = result;
                            callback();
                        });
                    });
                } else {
                    callback();
                }
            },
            parentEntry: function (callback) {
                var query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
                if(query._id) {
                    db.Topic.findOne(query, function (err, result) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.shortTitle = utils.getShortText(result.title);
                        model.parentTopic = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            model.cancelUrl = createCancelUrl(req);
            res.render(templates.truth.topics.link, model);
        });
    });

    router.post('/link', function (req, res) {
        var action = req.body.action;
        if(action === 'delete') {
            db.TopicLink.findByIdAndRemove(req.query.id, function(err, link) {
                flowUtils.updateChildrenCount(link.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                    res.redirect(createCancelUrl(req));
                });
            });
        } else if(action === 'submit') {
            var query = { _id: req.query.id };
            db.TopicLink.findOne(query, function (err, result) {
                var entity = result;
                entity.title = req.body.title;
                entity.editUserId = req.user.id;
                entity.editDate = Date.now();
                db.TopicLink.update(query, entity, {upsert: true}, function (err, writeResult) {
                    res.redirect(createCancelUrl(req));
                });
            });
        }
    });
};

module.exports.getEntry = getEntry;