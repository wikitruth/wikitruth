// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
var mongoose = require('mongoose'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    templates = require('../models/templates'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    paths = require('../models/paths'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    async = require('async'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'url'.
    url = require('url'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    flowUtils = require('../utils/flowUtils'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    utils = require('../utils/utils'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    constants = require('../models/constants'),
    // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
    db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {

    const prefix = '/:groupTitleUrl/:group/posts';

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/', async function (req, res) {
        const model = {}
        let results = await db.Group
            .find({})
            .sort({title: 1})
            .lean();
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function (result) {
            result.friendlyUrl = utils.urlify(result.title);
        })
        if (req.user) {
            // @ts-ignore TS(2339): Property 'privateGroups' does not exist on type '{... Remove this comment to see the full error message
            model.privateGroups = results.filter(function (group) {
                return group.privacyType !== constants.GROUP_PRIVACY_TYPES.type10.code
                    // @ts-ignore TS(7006): Parameter 'member' implicitly has an 'any' type.
                    && group.members && group.members.some(function (member) {
                        const memberUserId = member.userId && member.userId._id ? member.userId._id : member.userId;
                        return String(memberUserId || '') === String(req.user.id || req.user._id || '');
                    });
            })
        }
        // @ts-ignore TS(2339): Property 'publicGroups' does not exist on type '{}... Remove this comment to see the full error message
        model.publicGroups = results.filter(function (group) {
            return group.privacyType === constants.GROUP_PRIVACY_TYPES.type10.code;
        })
        res.render(templates.groups.index, model)
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/create', async function (req, res) {
        const model = {};
        // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{}'.
        model.cancelUrl = flowUtils.buildReturnUrl(req, paths.groups.index);
        if (req.query.id) req.query.group = req.query.id;
        await flowUtils.setGroupModel(req, model);
        res.render(templates.groups.create, model);
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.post('/create', function (req, res) {
        POST_create(req, res);
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/:friendlyUrl/:id', async function (req, res) {
        const model = {};
        req.query.group = req.params.id;
        await flowUtils.setGroupModel(req, model);
        // @ts-ignore TS(2339): Property 'group' does not exist on type '{}'.
        const groupFilter = {ownerId: model.group._id, ownerType: constants.OBJECT_TYPES.group};
        flowUtils.countEntries(model, groupFilter, function () {
            // @ts-ignore TS(2339): Property 'url' does not exist on type '{}'.
            model.url = flowUtils.buildGroupUrl(model.group) + paths.groups.group.posts;
            // @ts-ignore TS(2339): Property 'contributions' does not exist on type '{... Remove this comment to see the full error message
            model.contributions = model.totalCount;
            res.render(templates.groups.group.index, model);
        });
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/:friendlyUrl/:id/members', async function (req, res) {
        const model = {};
        req.query.group = req.params.id;
        await flowUtils.setGroupModel(req, model);
        res.render(templates.groups.group.members, model);
    });

    /* All Posts */
    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get(prefix, function (req, res) {
        GET_posts(req, res);
    });

    flowUtils.setupEntryRouters(router, prefix);
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function POST_create(req, res) {
    var query = {_id: req.query.id || new mongoose.Types.ObjectId()};
    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
    db.Group.findOne(query, function (err, result) {
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
        if (!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
        }
        if (!entity.members || entity.members.length === 0) {
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
        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
        }, function (err, updatedEntity) {
            // clear cache
            if (!result || titleChanged) delete req.session.myGroups;
            var url = paths.groups.index + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
            res.redirect(url);
        });
    });
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function GET_posts(req, res) {
    const LIMIT = req.query.tab ? 25 : 15;
    const allTabs = !req.query.tab;
    const tab = req.query.tab ? req.query.tab : 'all';
    const baseUrl = url.parse(req.originalUrl);
    const model = {
        tab: tab,
        url: baseUrl.pathname
    };
    async.series({
        // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
        group: function (callback) {
            // this is handled by the middleware
            // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
            model.group = res.locals.group;
            callback();
            /*
            req.query.group = req.params.group;
            flowUtils.setGroupModel(req, model, callback);
            */
        },
        // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
        categories: function (callback) {
            db.Topic
                // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                .find({parentId: null, ownerType: constants.OBJECT_TYPES.group, ownerId: model.group._id})
                .sort({title: 1})
                .lean()
                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                .exec(function (err, results) {
                    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                    async.each(results, function (result, callback) {
                        result.friendlyUrl = utils.urlify(result.title);
                        flowUtils.getTopics({parentId: result._id}, {
                            limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
                            req: req,
                            shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN
                        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                        }, function (err, subtopics) {
                            if (subtopics.length > 0) {
                                result.subtopics = subtopics;
                            }
                            // if subtopics are less than SUBCATEGORY_LIST_SIZE, get some arguments
                            if (subtopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
                                var query = {
                                    parentId: null,
                                    ownerId: result._id,
                                    ownerType: constants.OBJECT_TYPES.topic
                                };
                                flowUtils.getArguments(query, {
                                    limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE - subtopics.length,
                                    req: req,
                                    shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN
                                // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                                }, function (err, subarguments) {
                                    // @ts-ignore TS(7006): Parameter 'subargument' implicitly has an 'any' ty... Remove this comment to see the full error message
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
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    }, function (err) {
                        // @ts-ignore TS(2339): Property 'categories' does not exist on type '{ ta... Remove this comment to see the full error message
                        model.categories = results;
                        callback();
                    });
                });
        },
        // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
        rootTopics: function (callback) {
            // display 15 if top topics, all if has topic parameter
            flowUtils.getTopics({
                parentId: null,
                ownerType: constants.OBJECT_TYPES.group,
                // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                ownerId: model.group._id
            // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
            }, {limit: 0, req: req}, function (err, results) {
                // @ts-ignore TS(2339): Property 'rootTopics' does not exist on type '{ ta... Remove this comment to see the full error message
                model.rootTopics = results;
                callback();
            });
        }
    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
    }, function (err, results) {
        flowUtils.setModelContext(req, res, model);
        flowUtils.setClipboardModel(req, model);

        async.parallel({
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            topics: function (callback) {
                if (!allTabs && model.tab !== 'topics') {
                    return callback();
                }
                // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                var query = {private: true, ownerType: constants.OBJECT_TYPES.group, ownerId: model.group._id};
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Topic
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function () {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                });
                                // @ts-ignore TS(2339): Property 'topics' does not exist on type '{ tab: a... Remove this comment to see the full error message
                                model.topics = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{ ta... Remove this comment to see the full error message
                                        model.topicsMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            arguments: function (callback) {
                if (!allTabs && model.tab !== 'arguments') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                    private: true, createUserId: model.group._id
                };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Argument
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function () {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                                    flowUtils.setVerdictModel(result);
                                });
                                // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{ tab... Remove this comment to see the full error message
                                model.arguments = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
                                        model.argumentsMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            questions: function (callback) {
                if (!allTabs && model.tab !== 'questions') {
                    return callback();
                }
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                    private: true, createUserId: model.group._id
                };
                //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Question
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                                });
                                // @ts-ignore TS(2339): Property 'questions' does not exist on type '{ tab... Remove this comment to see the full error message
                                model.questions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
                                        model.questionsMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            answers: function (callback) {
                if (!allTabs && model.tab !== 'answers') {
                    return callback();
                }
                //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                var query = {private: true, createUserId: model.group._id};
                db.Answer
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                                });
                                // @ts-ignore TS(2339): Property 'answers' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                model.answers = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'answersMore' does not exist on type '{ t... Remove this comment to see the full error message
                                        model.answersMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            artifacts: function (callback) {
                if (!allTabs && model.tab !== 'artifacts') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                    private: true, createUserId: model.group._id
                };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Artifact
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    //.lean()
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function () {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                                    result.setThumbnailPath(req.params.username);
                                });
                                // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{ tab... Remove this comment to see the full error message
                                model.artifacts = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'artifactsMore' does not exist on type '{... Remove this comment to see the full error message
                                        model.artifactsMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            issues: function (callback) {
                if (!allTabs && model.tab !== 'issues') {
                    return callback();
                }
                // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                var query = {private: true, createUserId: model.group._id};
                db.Issue
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                                });
                                // @ts-ignore TS(2339): Property 'issues' does not exist on type '{ tab: a... Remove this comment to see the full error message
                                model.issues = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{ ta... Remove this comment to see the full error message
                                        model.issuesMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
            opinions: function (callback) {
                if (!allTabs && model.tab !== 'opinions') {
                    return callback();
                }
                // @ts-ignore TS(2339): Property 'group' does not exist on type '{ tab: an... Remove this comment to see the full error message
                var query = {private: true, createUserId: model.group._id};
                db.Opinion
                    .find(query)
                    .sort({editDate: -1})
                    .limit(LIMIT)
                    .lean()
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                                });
                                // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{ tab:... Remove this comment to see the full error message
                                model.opinions = results;
                                if (results.length > 0) {
                                    if (allTabs && results.length >= LIMIT) {
                                        // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{ ... Remove this comment to see the full error message
                                        model.opinionsMore = true;
                                    }
                                    // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            }
        // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
        }, function (err, results) {
            flowUtils.createEntrySet(model);
            res.render(templates.groups.group.posts, model);
        });
    });
}
