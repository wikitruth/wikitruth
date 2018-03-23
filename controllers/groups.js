'use strict';

var mongoose    = require('mongoose'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    async       = require('async'),
    url         = require('url'),
    flowUtils   = require('../utils/flowUtils'),
    utils       = require('../utils/utils'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

module.exports = function (router) {

    var prefix = '/:groupTitleUrl/:group/posts';

    router.get('/', function (req, res) {
        var model = {};
        db.Group
            .find({})
            .sort({title: 1})
            .lean()
            .exec(function (err, results) {
                results.forEach(function (result) {
                    result.friendlyUrl = utils.urlify(result.title);
                });
                model.privateGroups = results.filter(function (group) {
                    return group.privacyType !== constants.GROUP_PRIVACY_TYPES.type10.code;
                });
                model.publicGroups = results.filter(function (group) {
                    return group.privacyType == constants.GROUP_PRIVACY_TYPES.type10.code;
                });
                res.render(templates.groups.index, model);
            });
    });

    router.get('/create', function (req, res) {
        var model = {};
        model.cancelUrl = flowUtils.buildReturnUrl(req, paths.groups.index);
        if(req.query.id) req.query.group = req.query.id;
        flowUtils.setGroupModel(req, model, function () {
            res.render(templates.groups.create, model);
        });
    });

    router.post('/create', function (req, res) {
        POST_create(req, res);
    });

    router.get('/:friendlyUrl/:id', function (req, res) {
        var model = {};
        req.query.group = req.params.id;
        flowUtils.setGroupModel(req, model, function() {
            var groupFilter = { ownerId: model.group._id, ownerType: constants.OBJECT_TYPES.group };
            flowUtils.countEntries(model, groupFilter, function () {
                model.url = flowUtils.buildGroupUrl(model.group) + paths.groups.group.posts;
                model.contributions = model.totalCount;
                res.render(templates.groups.group.index, model);
            });
        });
    });

    router.get('/:friendlyUrl/:id/members', function (req, res) {
        var model = {};
        req.query.group = req.params.id;
        flowUtils.setGroupModel(req, model, function () {
            res.render(templates.groups.group.members, model);
        });
    });

    /* All Posts */
    router.get(prefix, function (req, res) {
        GET_posts(req, res);
    });

    flowUtils.setupEntryRouters(router, prefix);
};

function POST_create(req, res) {
    var query = { _id: req.query.id || new mongoose.Types.ObjectId() };
    db.Group.findOne(query, function(err, result) {
        var dateNow = Date.now();
        var titleChanged = !result || result.title !== req.body.title;
        var entity = result ? result : {};
        entity.title = req.body.title;
        entity.description = flowUtils.getEditorContent(req.body.description);
        entity.contentPreview = flowUtils.createContentPreview(entity.description);
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.privacyType = req.body.privacyType;
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if(!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
        }
        if(!entity.members || entity.members.length == 0) {
            entity.members = [
                {
                    userId: req.user.id,
                    roleType: constants.GROUP_ROLE_TYPES.type20.code
                }
            ];
        }
        db.Group.findOneAndUpdate(query, entity, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }, function (err, updatedEntity) {
            // clear cache
            if(!result || titleChanged) delete req.app.locals.myGroups;
            var url = paths.groups.index + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
            res.redirect(url);
        });
    });
}

function GET_posts(req, res) {
    var LIMIT = req.query.tab ? 25 : 15;
    var allTabs = !req.query.tab;
    var tab = req.query.tab ? req.query.tab : 'all';
    var baseUrl = url.parse(req.originalUrl);
    var model = {
        tab: tab,
        url: baseUrl.pathname
    };
    async.series({
        group: function(callback){
            // this is handled by the middleware
            model.group = res.locals.group;
            callback();
            /*
            req.query.group = req.params.group;
            flowUtils.setGroupModel(req, model, callback);
            */
        },
        categories: function(callback) {
            db.Topic
                .find({ parentId: null, ownerType: constants.OBJECT_TYPES.group, ownerId: model.group._id })
                .sort({title: 1})
                .lean()
                .exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.friendlyUrl = utils.urlify(result.title);
                        flowUtils.getTopics({ parentId: result._id }, { limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE, req: req, shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN }, function (err, subtopics) {
                            if(subtopics.length > 0) {
                                result.subtopics = subtopics;
                            }
                            // if subtopics are less than SUBCATEGORY_LIST_SIZE, get some arguments
                            if(subtopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
                                var query = {
                                    parentId: null,
                                    ownerId: result._id,
                                    ownerType: constants.OBJECT_TYPES.topic
                                };
                                flowUtils.getArguments(query, { limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE - subtopics.length, req: req, shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN }, function (err, subarguments) {
                                    subarguments.forEach(function (subargument) {
                                        flowUtils.setVerdictModel(subargument);
                                    });
                                    flowUtils.sortArguments(subarguments);
                                    result.subarguments = subarguments;
                                    callback();
                                });
                            } else {
                                callback();
                            }
                        });
                    }, function(err) {
                        model.categories = results;
                        callback();
                    });
                });
        },
        rootTopics: function(callback) {
            // display 15 if top topics, all if has topic parameter
            flowUtils.getTopics({ parentId: null, ownerType: constants.OBJECT_TYPES.group, ownerId: model.group._id }, { limit: 0, req: req }, function (err, results) {
                model.rootTopics = results;
                callback();
            });
        }
    }, function (err, results) {
        flowUtils.setModelContext(req, model);
        flowUtils.setClipboardModel(req, model);

        async.parallel({
            topics: function(callback) {
                if(!allTabs && model.tab !== 'topics') {
                    return callback();
                }
                var query = { private: true, ownerType: constants.OBJECT_TYPES.group, ownerId: model.group._id };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Topic
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                results.forEach(function(result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                });
                                model.topics = results;
                                if(results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.topicsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            arguments: function(callback) {
                if(!allTabs && model.tab !== 'arguments') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: true, createUserId: model.group._id
                };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Argument
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                                    flowUtils.setVerdictModel(result);
                                });
                                model.arguments = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.argumentsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            questions: function(callback) {
                if(!allTabs && model.tab !== 'questions') {
                    return callback();
                }
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: true, createUserId: model.group._id
                };
                //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Question
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                                });
                                model.questions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.questionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            answers: function(callback) {
                if(!allTabs && model.tab !== 'answers') {
                    return callback();
                }
                //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                var query = { private: true, createUserId: model.group._id };
                db.Answer
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                                });
                                model.answers = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.answersMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            artifacts: function(callback) {
                if(!allTabs && model.tab !== 'artifacts') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: true, createUserId: model.group._id
                };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Artifact
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    //.lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                                    result.setThumbnailPath(req.params.username);
                                });
                                model.artifacts = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.artifactsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            issues: function (callback) {
                if(!allTabs && model.tab !== 'issues') {
                    return callback();
                }
                var query = { private: true, createUserId: model.group._id };
                db.Issue
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.issuesMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            opinions: function (callback) {
                if(!allTabs && model.tab !== 'opinions') {
                    return callback();
                }
                var query = { private: true, createUserId: model.group._id };
                db.Opinion
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        model.opinionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            }
        }, function (err, results) {
            flowUtils.createEntrySet(model);
            res.render(templates.groups.group.posts, model);
        });
    });
}