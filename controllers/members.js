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

    var prefix = '/:username/diary';

    router.get('/', function (req, res) {
        var model = {};
        findMembers({ 'preferences.privateProfile': { $ne: true } }, function (err, results) {
            model.contributors = results;
            res.render(templates.members.contributors, model);
        });
    });

    router.get('/screeners', function (req, res) {
        var model = {};
        findMembers({ 'roles.screener': true, 'preferences.privateProfile': { $ne: true }}, function (err, results) {
            model.screeners = results;
            res.render(templates.members.screeners, model);
        });
    });

    router.get('/reviewers', function (req, res) {
        var model = {};
        findMembers({ 'roles.reviewer': true, 'preferences.privateProfile': { $ne: true }}, function (err, results) {
            model.reviewers = results;
            res.render(templates.members.reviewers, model);
        });
    });

    router.get('/administrators', function (req, res) {
        var model = {};
        findMembers({ 'roles.admin': {$exists: true}, 'preferences.privateProfile': { $ne: true }}, function (err, results) {
            model.administrators = results;
            res.render(templates.members.administrators, model);
        });
    });

    router.get('/:username', function (req, res) {
        var model = {};
        setMemberModel(model, req, function() {
            var groupFilter = { createUserId: model.member._id, private: false };
            flowUtils.countEntries(model, groupFilter, function () {
                flowUtils.setModelContext(req, res, model);
                model.url = model.profileBaseUrl + '/contributions';
                model.contributions = model.totalCount;
                res.render(templates.members.profile.index, model);
            });
        });
    });

    router.get('/:username/following', function (req, res) {
        var model = {};
        setMemberModel(model, req, function () {
            flowUtils.setModelContext(req, res, model);
            res.render(templates.members.profile.following, model);
        });
    });

    router.get('/:username/settings', function (req, res) {
        var model = {};
        setMemberModel(model, req, function () {
            flowUtils.setModelContext(req, res, model);
            res.render(templates.members.profile.settings, model);
        });
    });

    router.post('/:username/settings', function (req, res) {
        var model = {};
        setMemberModel(model, req, function () {
            var preferences = model.member.preferences || {};
            preferences.privateProfile = !!req.body.privateProfile;
            var fieldsToSet = {
                preferences: preferences
              };
          req.app.db.models.User.findByIdAndUpdate(model.member.id, fieldsToSet, function(err, user) {
            if (err) {
                throw err;
            }
      
            flowUtils.setModelContext(req, res, model);
            res.redirect(model.profileBaseUrl);
          });
        });
    });

    router.get('/:username/contributions', function (req, res) {
        var model = {};
        setMemberModel(model, req, function () {
            var tab = req.query.tab ? req.query.tab : 'all';
            var LIMIT = tab === 'all' ? 15 : 0; //var LIMIT = req.query.tab ? 25 : 15;
            model.tab = tab;
            model.results = tab !== 'all';
            model.url = '/members/' + model.member.username + '/contributions';
            async.parallel({
                topics: function(callback) {
                    if(tab !== 'all' && tab !== 'topics') {
                        return callback();
                    }
                    db.Topic
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            if(err || !results) {
                                callback(err);
                            }
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
                                    });
                                    model.topics = results;
                                    if (results.length > 0) {
                                        if (results.length === 15) {
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
                    if(tab !== 'all' && tab !== 'arguments') {
                        return callback();
                    }
                    db.Argument
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                                        flowUtils.setVerdictModel(result);
                                    });
                                    flowUtils.sortArguments(results);
                                    model.arguments = results;
                                    if (results.length > 0) {
                                        if (results.length === 15) {
                                            model.argumentsMore = true;
                                        }
                                        model.results = true;
                                    }
                                    callback();
                                });
                            });
                        });
                },
                artifacts: function (callback) {
                    if(tab !== 'all' && tab !== 'artifacts') {
                        return callback();
                    }
                    db.Artifact
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                                    });
                                    model.artifacts = results;
                                    if (results.length > 0) {
                                        model.results = true;
                                    }
                                    callback();
                                });
                            });
                        });
                },
                questions: function (callback) {
                    if(tab !== 'all' && tab !== 'questions') {
                        return callback();
                    }
                    db.Question
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                                    });
                                    model.questions = results;
                                    if (results.length > 0) {
                                        model.results = true;
                                    }
                                    callback();
                                });
                            });
                        });
                },
                answers: function (callback) {
                    if(tab !== 'all' && tab !== 'answers') {
                        return callback();
                    }
                    db.Answer
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                                    });
                                    model.answers = results;
                                    if (results.length > 0) {
                                        model.results = true;
                                    }
                                    callback();
                                });
                            });
                        });
                },
                issues: function (callback) {
                    if(tab !== 'all' && tab !== 'issues') {
                        return callback();
                    }
                    db.Issue
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
                                    });
                                    model.issues = results;
                                    if (results.length > 0) {
                                        if (results.length === 15) {
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
                    if(tab !== 'all' && tab !== 'opinions') {
                        return callback();
                    }
                    db.Opinion
                        .find({ createUserId: model.member._id, private: false })
                        .sort({editDate: -1})
                        .limit(LIMIT)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function() {
                                flowUtils.setEditorsUsername(results, function () {
                                    results.forEach(function (result) {
                                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                                    });
                                    model.opinions = results;
                                    if (results.length > 0) {
                                        if (results.length === 15) {
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
                flowUtils.setModelContext(req, res, model);
                res.render(templates.members.profile.contributions, model);
            });
        });
    });

    /* Member Pages */

    router.get('/:username/pages', function (req, res) {
        var model = {};
        flowUtils.setModelContext(req, res, model);
        setMemberModel(model, req, function() {
            async.parallel({
                parent: function (callback) {
                    if (req.query.parent) {
                        db.Page.findOne({_id: req.query.parent}, function (err, result) {
                            model.page = result;
                            flowUtils.appendOwnerFlag(req, result, model);
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                pages: function (callback) {
                    var query = req.query.parent ? {
                        createUserId: model.member._id,
                        parentId: req.query.parent
                    } : {createUserId: model.member._id};
                    db.Page.find(query).sort({title: 1}).exec(function (err, results) {
                        if (req.query.parent) {
                            model.pages = results;
                        } else {
                            // Return pages with hierarchy
                            var nodes = [];
                            // Build parent pages
                            results.forEach(function (page) {
                                if (!page.parentId) {
                                    nodes.push(page);
                                }
                            });
                            results.forEach(function (page) {
                                if (page.parentId) {
                                    var parents = nodes.filter(function (p) {
                                        return p._id.equals(page.parentId);
                                    });
                                    var parent = parents.length > 0 ? parents[0] : null;
                                    if (parent) {
                                        if (!parent.children) {
                                            parent.children = [];
                                        }
                                        parent.children.push(page);
                                    } else {
                                        // parent not found, add as orphan
                                        nodes.push(page);
                                    }
                                } else {
                                    // no parent, if not existing, add as orphan
                                    var orphans = nodes.filter(function (p) {
                                        return p._id.equals(page._id);
                                    });
                                    var orphan = orphans.length > 0 ? orphans[0] : null;
                                    if (!orphan) {
                                        nodes.push(page);
                                    }
                                }
                            });
                            model.pageNodes = nodes;
                        }
                        callback();
                    });
                }
            }, function (err, results) {
                if(!req.query.parent) {
                    model.pagesRoot = true;
                }
                res.render(templates.members.profile.pages.index, model);
            });
        });
    });

    router.get('/:username/pages/create', function (req, res) {
        var model = {};
        flowUtils.setModelContext(req, res, model);
        setMemberModel(model, req, function() {
            if (req.user && req.user.id) {
                async.parallel({
                    parent: function (callback) {
                        if (req.query.parent) {
                            db.Page.findOne({_id: req.query.parent}, function (err, result) {
                                model.parent = result;
                                //flowUtils.appendOwnerFlag(req, result, model);
                                callback();
                            });
                        } else {
                            callback();
                        }
                    },
                    page: function (callback) {
                        if (req.query.id) {
                            db.Page.findOne({createUserId: req.user.id, _id: req.query.id}, function (err, result) {
                                model.page = result;
                                callback();
                            });
                        } else {
                            callback();
                        }
                    }
                }, function (err, results) {
                    res.render(templates.members.profile.pages.create, model);
                });
            } else {
                res.render(templates.members.profile.pages.create, model);
            }
        });
    });

    router.get('/:username/pages(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        var model = {};
        setMemberModel(model, req, function() {
            async.parallel({
                parent: function (callback) {
                    if (req.query.parent) {
                        db.Page.findOne({_id: req.query.parent}, function (err, result) {
                            model.parent = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                page: function (callback) {
                    db.Page.findOne({_id: req.params.id}, function (err, result) {
                        model.page = result;
                        flowUtils.appendOwnerFlag(req, result, model);
                        callback();
                    });
                }
            }, function (err, results) {
                flowUtils.setModelContext(req, res, model);
                res.render(templates.members.profile.pages.page, model);
            });
        });
    });

    router.post('/:username/pages/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };
        db.Page.findOne(query, function(err, result) {
            var dateNow = Date.now();
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.friendlyUrl = utils.urlify(req.body.title);
            entity.editUserId = req.user.id;
            entity.editDate = dateNow;
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = dateNow;
            }
            if(req.query.parent) {
                entity.parentId = req.query.parent;
            } else if(entity.parentId) {
                entity.parentId = null;
            }

            db.Page.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function(err, updatedEntity) {
                if (err) {
                    throw err;
                }
                var model = {};
                flowUtils.setModelContext(req, res, model);
                if(result) {
                    res.redirect(model.profileBaseUrl + paths.members.profile.pages.index + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id + (req.query.parent ? '?parent=' + req.query.parent : ''));
                } else {
                    res.redirect(model.profileBaseUrl + paths.members.profile.pages.index);
                }
            });
        });
    });

    /* Diary Topics */

    router.get(prefix, function (req, res) {
        var LIMIT = req.query.tab ? 25 : 15;
        var allTabs = !req.query.tab;
        var tab = req.query.tab ? req.query.tab : 'all';
        var baseUrl = url.parse(req.originalUrl);
        var model = {
            tab: tab,
            url: baseUrl.pathname
        };
        async.series({
            user: function(callback){
                setMemberModel(model, req, callback);
            },
            categories: function(callback) {
                db.Topic
                    .find({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id })
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
                flowUtils.getTopics({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id }, { limit: 0, req: req }, function (err, results) {
                    model.rootTopics = results;
                    callback();
                });
            }
        }, function (err, results) {
            flowUtils.setModelContext(req, res, model);
            flowUtils.setClipboardModel(req, model);

            async.parallel({
                topics: function(callback) {
                    if(!allTabs && model.tab !== 'topics') {
                        return callback();
                    }
                    var query = { private: true, createUserId: model.member._id };
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
                        private: true, createUserId: model.member._id
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
                        private: true, createUserId: model.member._id
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
                    var query = { private: true, createUserId: model.member._id };
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
                        private: true, createUserId: model.member._id
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
                    var query = { private: true, createUserId: model.member._id };
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
                    var query = { private: true, createUserId: model.member._id };
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
                res.render(templates.members.profile.topics, model);
            });
        });
    });

    flowUtils.setupEntryRouters(router, prefix);
};

function findMembers(memberFilter, callback) {
    db.User
        .find(memberFilter)
        .populate('roles.account', 'name.full')
        .sort({title: 1})
        .lean()
        .exec(function (err, results) {
            results.forEach(function(result) {
                flowUtils.setMemberFullname(result);
            });
            callback(err, results);
        });
}

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