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
    nextUrl.search = null; // important, ensures new 'query' to take effect
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
            flowUtils.getTopics({ parentId: req.query.topic, 'screening.status': model.screening.status }, 0, req, function (err, results) {
                model.topics = results;
                callback();
            });
        }
    }, function (err, results) {
        if(!model.topic || !flowUtils.isEntryOnIntendedUrl(req, model.topic)) return res.redirect('/');
        flowUtils.setScreeningModelCount(model, model.topic.childrenCount.topics);
        flowUtils.setModelOwnerEntry(req, model);
        res.render(templates.wiki.topics.index, model);
    });
}

function GET_entry(req, res) {
    // Topic home: display top subtopics, top arguments
    var model = {};
    flowUtils.ensureEntryIdParam(req, 'topic');
    flowUtils.setTopicModels(req, model, function () {

        if(!model.topic || !flowUtils.isEntryOnIntendedUrl(req, model.topic)) return res.redirect('/');
        if(!req.query.topic) req.query.topic = model.topic._id;
        flowUtils.setModelOwnerEntry(req, model);

        async.parallel({
            categories: function(callback) {
                if(model.mainTopic) {
                    db.Topic
                        .find({parentId: model.topic._id, 'screening.status': constants.SCREENING_STATUS.status1.code })
                        .sort({title: 1})
                        .lean()
                        .exec(function (err, results) {
                            async.each(results, function(result, callback) {
                                result.friendlyUrl = utils.urlify(result.title);
                                db.Topic
                                    .find( { parentId: result._id } )
                                    .limit(constants.SETTINGS.SUBCATEGORY_LIST_SIZE)
                                    .sort({ title: 1 })
                                    .lean()
                                    .exec(function(err, subtopics) {
                                        if(subtopics.length > 0) {
                                            subtopics.forEach(function (subtopic) {
                                                subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                                subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN);
                                            });
                                            result.subtopics = subtopics;
                                            callback();
                                        } else {
                                            // if subtopics are less than 3, get some arguments
                                            var query = {
                                                parentId: null,
                                                ownerId: result._id,
                                                ownerType: constants.OBJECT_TYPES.topic,
                                                'screening.status': constants.SCREENING_STATUS.status1.code
                                            };
                                            flowUtils.getArguments(query, constants.SETTINGS.SUBCATEGORY_LIST_SIZE, req, function (err, subarguments) {
                                                subarguments.forEach(function (subargument) {
                                                    flowUtils.setVerdictModel(subargument);
                                                    subargument.shortTitle = utils.getShortText(subargument.contextTitle ? subargument.contextTitle : subargument.title, constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN);
                                                });
                                                flowUtils.sortArguments(subarguments);
                                                result.subarguments = subarguments;
                                                callback();
                                            });
                                        }
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
                var query = { parentId: req.query.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopics(query, 15, req, function (err, results) {
                    model.topics = results;
                    model.keyTopics = results.filter(function (result) {
                        return result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
                    });
                    if(model.keyTopics.length > 0) {
                        model.hasKeyEntries = true;
                    }
                    callback();
                });
            },
            links: function (callback) {
                // Top Linked Topics
                var query = { topicId: req.query.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
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
                    ownerType: constants.OBJECT_TYPES.topic,
                    'screening.status': constants.SCREENING_STATUS.status1.code
                };
                flowUtils.getArguments(query, 0, req, function (err, results) {
                    results.forEach(function (result) {
                        flowUtils.setVerdictModel(result);
                    });
                    flowUtils.sortArguments(results);
                    model.arguments = results.slice(0, 15);
                    model.keyArguments = results.filter(function (result) {
                        return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
                    });
                    if(model.keyArguments.length > 0) {
                        model.hasKeyEntries = true;
                    }
                    model.verdict = {
                        counts: flowUtils.getVerdictCount(results)
                    };
                    callback(null, results);
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
                db.Question.find(query).limit(15).exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtras(result);
                        });
                        model.questions = results;
                        callback();
                    });
                });
            },
            artifacts: function (callback) {
                // Top Issues
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopArtifacts(query, model, req, callback);
            },
            issues: function (callback) {
                // Top Issues
                var query = { ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopIssues(query, model, req, callback);
            },
            opinions: function (callback) {
                // Top Opinions
                var query = { parentId: null, ownerId: req.query.topic, ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            res.render(templates.wiki.topics.entry, model);
        });
    });
}

function GET_create(req, res) {
    var model = {};
    async.series({
        topic: function(callback){
            if(req.query.id) {
                db.Topic.findOne({_id: req.query.id}, function (err, result) {
                    flowUtils.appendEntryExtras(result);
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
                    flowUtils.appendEntryExtras(result);
                    model.parentTopic = result;
                    callback();
                });
            } else {
                callback();
            }
        }
    }, function (err, results) {
        if(model.topic && !flowUtils.isEntryOwner(req, model.topic)) {
            // not the owner, stop editing
            return res.redirect('/');
        }
        flowUtils.setModelContext(req, model);
        if(!model.topic && !model.parentTopic && !req.params.username && !req.user.isAdmin()) {
            // A public create on root topics but not an admin
            return res.redirect(model.wikiBaseUrl);
        }
        model.TOPIC_TAGS = constants.TOPIC_TAGS;
        model.cancelUrl = flowUtils.buildCancelUrl(model, model.wikiBaseUrl + paths.wiki.topics.entry, model.topic, model.parentTopic);
        res.render(templates.wiki.topics.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
    db.Topic.findOne(query, function(err, result) {
        if(result && !flowUtils.isEntryOwner(req, result)) {
            // not the owner, stop editing
            return res.redirect('/');
        }
        var entity = result ? result : {};
        var tags = req.body.topicTags;
        var dateNow = Date.now();
        if(tags && !(tags instanceof Array)) {
            tags = [tags];
        }
        entity.content = req.body.content;
        entity.contentPreview = flowUtils.createContentPreview(req.body.content);
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
            flowUtils.initScreeningStatus(req, entity);
        }
        if(req.params.username) {
            entity.private = true;
            entity.ownerType = constants.OBJECT_TYPES.user;
            entity.ownerId = req.user.id;
        } else if(!entity.parentId && !req.user.isAdmin()) {
            // root topic & not admin & not private - non-admins are not allowed to create categories
            return res.redirect('/');
        }
        flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.topic }, function () {
            db.Topic.findOneAndUpdate(query, entity, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }, function (err, updatedEntity) {
                var updateRedirect = function () {
                    var model = {};
                    flowUtils.setModelContext(req, model);
                    var url = model.wikiBaseUrl + paths.wiki.topics.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                    res.redirect(url);
                };

                if (entity.parentId && !result) { // update parent count on create only
                    flowUtils.updateChildrenCount(updatedEntity.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                        updateRedirect();
                    });
                } else {
                    updateRedirect();
                }
            });
        });
    });
}

function GET_link_entry(req, res) {
    var model = {};
    var ownerQuery = { ownerId: req.params.id, ownerType: constants.OBJECT_TYPES.topicLink };
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        if (!flowUtils.isEntryOnIntendedUrl(req, model.topicLink)) {
            return res.redirect('/');
        }

        async.parallel({
            topics: function(callback) {
                // Top Subtopics
                var query = { parentId: model.topicLink.topicId, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopics(query, 15, req, function (err, results) {
                    model.topics = results;
                    model.keyTopics = results.filter(function (result) {
                        return result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
                    });
                    if(model.keyTopics.length > 0) {
                        model.hasKeyEntries = true;
                    }
                    callback();
                });
            },
            links: function (callback) {
                // Top Linked Topics
                var query = { topicId: model.topicLink.topicId, 'screening.status': constants.SCREENING_STATUS.status1.code };
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
                    ownerId: model.topicLink.topicId,
                    ownerType: constants.OBJECT_TYPES.topic,
                    'screening.status': constants.SCREENING_STATUS.status1.code
                };
                flowUtils.getArguments(query, 0, req, function (err, results) {
                    results.forEach(function (result) {
                        flowUtils.setVerdictModel(result);
                    });
                    flowUtils.sortArguments(results);
                    model.arguments = results.slice(0, 15);
                    model.keyArguments = results.filter(function (result) {
                        return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
                    });
                    if(model.keyArguments.length > 0) {
                        model.hasKeyEntries = true;
                    }
                    model.verdict = {
                        counts: flowUtils.getVerdictCount(results)
                    };
                    callback(null, results);
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: model.topicLink.topicId, ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
                db.Question.find(query).limit(15).exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                        });
                        model.questions = results;
                        callback();
                    });
                });
            },
            issues: function (callback) {
                // Top Issues
                var query = { ownerId: ownerQuery.ownerId, ownerType: ownerQuery.ownerType, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopIssues(query, model, req, callback);
            },
            opinions: function (callback) {
                // Top Opinions
                var query = { parentId: null, ownerId: ownerQuery.ownerId, ownerType: ownerQuery.ownerType, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            flowUtils.setModelOwnerEntry(req, model);
            res.render(templates.wiki.topics.link.entry, model);
        });
    });

    /*async.series({
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

    });*/
}

function GET_link_edit(req, res) {
    var model = {};
    var ownerQuery = { ownerId: req.query.id, ownerType: constants.OBJECT_TYPES.topicLink };
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        if(model.topicLink) {
            if(!flowUtils.isEntryOwner(req, model.topicLink)) {
                // VALIDATION: non-owners cannot update other's entry
                return res.redirect(createCancelUrl(req));
            }
        }
        model.cancelUrl = createCancelUrl(req);
        flowUtils.setModelOwnerEntry(req, model);
        res.render(templates.wiki.topics.link.edit, model);
    });
    /*async.series({
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

    });*/
}

function POST_link_edit(req, res) {
    var action = req.body.action;
    if(action === 'delete') {
        if(!req.user.isAdmin()) {
            // VALIDATION: only admin can delete a link
            return res.redirect(createCancelUrl(req));
        }
        db.TopicLink.findByIdAndRemove(req.query.id, function(err, link) {
            flowUtils.updateChildrenCount(link.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic, function () {
                res.redirect(flowUtils.buildParentUrl(req, link));
            });
        });
    } else if(action === 'submit') {
        var query = { _id: req.query.id };
        db.TopicLink.findOne(query, function (err, result) {
            if(result && !flowUtils.isEntryOwner(req, result)) {
                // VALIDATION: non-owners cannot update other's entry
                return res.redirect(createCancelUrl(req));
            }
            var entity = result ? result : {};
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                flowUtils.initScreeningStatus(req, entity);
            }
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


    router.get('/entry(/:friendlyUrl)?/link/:id', function (req, res) {
        GET_link_entry(req, res);
    });

    router.get('/link/edit', function (req, res) {
        GET_link_edit(req, res);
    });

    router.post('/link/edit', function (req, res) {
        POST_link_edit(req, res);
    });

    /**
     * Place this here to prevent it from overriding /link/* paths
     */
    router.get('/:friendlyUrl/:id', function (req, res) {
        GET_index(req, res);
    });
};

module.exports.GET_index = GET_index;
module.exports.GET_entry = GET_entry;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;
module.exports.GET_link_entry = GET_link_entry;
module.exports.GET_link_edit = GET_link_edit;
module.exports.POST_link_edit = POST_link_edit;