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

function GET_index(req, res) {
    var model = {};
    flowUtils.setScreeningModel(req, model);
    if(!req.query.topic && req.params.id) {
        req.query.topic = req.params.id;
    }
    async.parallel({
        topic: function(callback){
            flowUtils.setTopicModels(req, model, callback);
        },
        topics: function(callback) {
            // display 15 if top topics, all if has topic parameter
            flowUtils.getTopics({ parentId: req.query.topic, 'screening.status': model.screeningStatus }, 0, function (err, results) {
                model.topics = results;
                callback();
            });
        }
    }, function (err, results) {
        model.entry = model.topic;
        flowUtils.setModelContext(req, model);
        res.render(templates.truth.topics.index, model);
    });
}

function GET_entry(req, res) {
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

        // Topic Tags
        var tags = model.topic.tags;
        if(tags && tags.length > 0) {
            var tagLabels = [];
            if(model.topic.ethicalStatus.hasValue) {
                tagLabels.push(constants.TOPIC_TAGS.tag10);
            }
            tags.forEach(function (tag) {
                tagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
                if(tag === constants.TOPIC_TAGS.tag520.code) {
                    model.mainTopic = true;
                }
            });
            model.tagLabels = tagLabels;
        }

        async.parallel({
            categories: function(callback) {
                if(model.mainTopic) {
                db.Topic
                    .find({parentId: model.topic._id })
                    .sort({title: 1})
                    .lean()
                    .exec(function (err, results) {
                        async.each(results, function(result, callback) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                            db.Topic
                                .find( { parentId: result._id } )
                                .limit(3)
                                .sort({ title: 1 })
                                .lean()
                                .exec(function(err, subtopics) {
                                subtopics.forEach(function(subtopic){
                                    subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                    subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, 38);
                                });
                                result.subtopics = subtopics;
                                callback();
                            });
                        }, function(err) {
                            model.categories = results;
                            callback();
                        });
                    });
                } else {
                    callback();
                }
            },
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
                        flowUtils.setVerdictModel(result);
                    });
                    flowUtils.sortArguments(results);
                    callback(null, results);
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic };
                db.Question.find(query).limit(15).exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
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
            model.keyArguments = results.arguments.filter(function (result) {
                return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
            });
            model.verdict = {
                counts: flowUtils.getVerdictCount(results.arguments)
            };

            flowUtils.setModelContext(req, model);
            flowUtils.prepareClipboardOptions(req, model, constants.OBJECT_TYPES.topic);
            res.render(templates.truth.topics.entry, model);
        });
    });
}

function GET_create(req, res) {
    var model = {};

    async.series({
        topic: function(callback){
            if(req.query.id) {
                db.Topic.findOne({_id: req.query.id}, function (err, result) {
                    flowUtils.appendEntryExtra(result);
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
                    flowUtils.appendEntryExtra(result);
                    model.parentTopic = result;
                    callback();
                });
            } else {
                callback();
            }
        }
    }, function (err, results) {
        flowUtils.setModelContext(req, model);
        if(!model.topic && !model.parentTopic && !req.params.username && !req.user.isAdmin()) {
            // A public create on root topics but not an admin
            return res.redirect(model.wikiBaseUrl);
        }
        model.TOPIC_TAGS = constants.TOPIC_TAGS;
        model.cancelUrl = flowUtils.buildCancelUrl(model, model.wikiBaseUrl + paths.truth.topics.entry, model.topic, model.parentTopic);
        res.render(templates.truth.topics.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
    db.Topic.findOne(query, function(err, result) {
        var entity = result ? result : {};
        var tags = req.body.topicTags;
        var dateNow = Date.now();
        entity.content = req.body.content;
        entity.title = req.body.title;
        entity.contextTitle = req.body.contextTitle;
        entity.references = req.body.references;
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        entity.referenceDate = req.body.referenceDate ? new Date(req.body.referenceDate) : null;
        entity.tags = tags ? tags : [];
        entity.icon = req.body.icon;
        if(!entity.ethicalStatus) {
            entity.ethicalStatus = {};
        }
        entity.ethicalStatus.hasValue = req.body.hasEthicalValue ? true : false;
        entity.parentId = req.body.parent ? req.body.parent : null;
        if(!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
        }
        if(req.params.username) {
            entity.private = true;
            entity.ownerType = constants.OBJECT_TYPES.user;
            entity.ownerId = req.user.id;
        } else if(!entity.parentId && !req.user.isAdmin()) {
            // root topic & not admin & not private
            return res.redirect('/');
        }
        db.Topic.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function(err, updatedEntity) {
            var updateRedirect = function () {
                var model = {};
                flowUtils.setModelContext(req, model);
                var url = model.wikiBaseUrl + paths.truth.topics.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                res.redirect(url);
            };

            if(entity.parentId && !result) { // update parent count on create only
                flowUtils.updateChildrenCount(updatedEntity.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                    updateRedirect();
                });
            } else {
                updateRedirect();
            }
        });
    });
}

function GET_link(req, res) {
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
        flowUtils.setModelContext(req, model);
        model.cancelUrl = createCancelUrl(req);
        res.render(templates.truth.topics.link, model);
    });
}

function POST_link(req, res) {
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
            db.TopicLink.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
                res.redirect(createCancelUrl(req));
            });
        });
    }
}

module.exports = function (router) {

    router.get('/', function (req, res) {
        GET_index(req, res);
    });

    router.get('/:friendlyUrl/:id', function (req, res) {
        GET_index(req, res);
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        GET_entry(req, res);
    });

    /**
     * basic rule: id is the entry, query.topic or topic.parentId is the parent.
     */
    router.get('/create', function (req, res) {
        GET_create(req, res);
    });

    router.post('/create', function (req, res) {
        POST_create(req, res);
    });


    router.get('/link', function (req, res) {
        GET_link(req, res);
    });

    router.post('/link', function (req, res) {
        POST_link(req, res);
    });
};

module.exports.GET_index = GET_index;
module.exports.GET_entry = GET_entry;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;
module.exports.GET_link = GET_link;
module.exports.POST_link = POST_link;