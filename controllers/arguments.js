'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

module.exports = function (router) {

    /* Arguments */

    router.get('/', function (req, res) {
        GET_index(req, res);
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        GET_entry(req, res);
    });

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
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;
module.exports.GET_link_entry = GET_link_entry;
module.exports.GET_link_edit = GET_link_edit;
module.exports.POST_link_edit = POST_link_edit;

function GET_entry(req, res) {
    var model = {};
    flowUtils.ensureEntryIdParam(req, 'argument');
    var ownerQuery = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument };
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        if(!flowUtils.isEntryOnIntendedUrl(req, res, model.argument)) {
            return res.redirect('/');
        }
        async.parallel({
            arguments: function(callback) {
                // Top Arguments
                var query = {
                    parentId: req.query.argument,
                    'screening.status': constants.SCREENING_STATUS.status1.code
                };
                flowUtils.getArguments(query, { limit: 0, req: req }, function (err, results) {
                    results.forEach(function (result) {
                        flowUtils.setVerdictModel(result);
                    });
                    flowUtils.sortArguments(results);
                    var support = results.filter(function (arg) {
                        return !arg.against;
                    });
                    var contra = results.filter(function (arg) {
                        return arg.against;
                    });
                    model.arguments = results;
                    if(support.length > 0) {
                        model.proArgumentCount = support.length;
                        model.proArguments = support.slice(0, 15);
                    }
                    if(contra.length > 0) {
                        model.conArgumentCount = contra.length;
                        model.conArguments = contra.slice(0, 15);
                    }
                    callback(null, results);
                });
            },
            links: function (callback) {
                var query = { argumentId: req.query.argument, 'screening.status': constants.SCREENING_STATUS.status1.code };
                db.ArgumentLink.find(query, function(err, links) {
                    if(links.length > 0) {
                        model.linkCount = links.length + 1;
                        var ids = links
                            .filter(function (link) {
                                return link.ownerType === constants.OBJECT_TYPES.topic;
                            })
                            .map(function (link) {
                                return link.ownerId;
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
                                    });
                                }
                                callback();
                            });
                    } else {
                        callback();
                    }
                });
            },
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, 'screening.status': constants.SCREENING_STATUS.status1.code };
                db.Question.find(query).limit(15).sort({ title: 1 }).lean().exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                        });
                        model.questions = results;
                        if(results.length >= 15) {
                            model.questionsMore = true;
                        }
                        callback();
                    });
                });
            },
            issues: function (callback) {
                // Top Issues
                var query = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopIssues(query, model, req, callback);
            },
            opinions: function (callback) {
                // Top Opinions
                var query = { parentId: null, ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            flowUtils.setModelOwnerEntry(req, res, model);
            res.render(templates.wiki.arguments.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {}, query = {};
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
        if(model.topic) {
            flowUtils.setScreeningModel(req, model);
            if(model.argument && !flowUtils.isEntryOnIntendedUrl(req, res, model.argument) || model.topic && !flowUtils.isEntryOnIntendedUrl(req, res, model.topic)) {
                return res.redirect('/');
            }
            query = { 'screening.status': model.screening.status };
            if(req.query.argument) {
                query.parentId = model.argument._id;
            } else {
                query.parentId = null;
                query.ownerId = model.topic._id;
                query.ownerType = constants.OBJECT_TYPES.topic;
            }
            flowUtils.getArguments(query, { limit: 0, req: req }, function (err, results) {
                var support = results.filter(function (arg) {
                    return !arg.against;
                });
                var contra = results.filter(function (arg) {
                    return arg.against;
                });
                model.arguments = results;
                if(support.length > 0) {
                    model.proArguments = support;
                }
                if(contra.length > 0) {
                    model.conArguments = contra;
                }
                results.forEach(function (result) {
                    flowUtils.setVerdictModel(result);
                });
                flowUtils.sortArguments(results);
                flowUtils.setModelOwnerEntry(req, res, model);

                // screening and children count
                flowUtils.setScreeningModelCount(model, model.entry.childrenCount['arguments']);
                res.render(templates.wiki.arguments.index, model);
            });
        } else {
            // Top Arguments
            query = {
                ownerType: constants.OBJECT_TYPES.topic,
                private: false,
                'screening.status': constants.SCREENING_STATUS.status1.code
            };
            //db.Argument.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
            db.Argument
                .find(query)
                .sort({editDate: -1})
                .limit(25)
                .lean()
                .exec(function (err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            result.topic = {
                                _id: result.ownerId
                            };
                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
                            flowUtils.setVerdictModel(result);
                        });
                        //flowUtils.sortArguments(results);
                        model.arguments = results;
                        model.proArguments = results;
                        flowUtils.setModelContext(req, res, model);
                        res.render(templates.wiki.arguments.index, model);
                    });
                });
        }
    });
}

function GET_create(req, res) {
    var model = {
        argumentTypes: constants.ARGUMENT_TYPES
    };
    if(req.query.id) {
        req.query.argument = req.query.id;
    }
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function () {
        if(req.query.id) {
            delete req.query.argument;
        } else {
            delete model.argument;
        }
        async.series({
            argument: function (callback) {
                if(req.query.id) {
                    db.Argument.findOne({_id: req.query.id}, function (err, result) {
                        flowUtils.appendEntryExtras(result);
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
                        flowUtils.appendEntryExtras(result);
                        model.parentArgument = result;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            if(model.argument && !flowUtils.isEntryOwner(req, model.argument) || !model.argument && req.query.id){
                return res.redirect('/');
            }
            model.ARGUMENT_TAGS = constants.ARGUMENT_TAGS;
            flowUtils.setModelContext(req, res, model);
            res.render(templates.wiki.arguments.create, model);
        });
    });
}

function POST_create(req, res) {
    var parent = null, entry = null, entity = null, updatedEntity = null;
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
                if(result && !flowUtils.isEntryOwner(req, result)){
                    return callback({ error: 'Not allowed to update, not the owner.' });
                }
                var tags = req.body.argumentTags;
                var dateNow = Date.now();
                if(tags && !(tags instanceof Array)) {
                    tags = [tags];
                }
                entry = result;
                entity = result ? result : {};
                entity.content = flowUtils.getEditorContent(req.body.content);
                entity.contentPreview = flowUtils.createContentPreview(entity.content);
                entity.title = req.body.title;
                entity.references = flowUtils.getEditorContent(req.body.references);
                entity.friendlyUrl = utils.urlify(req.body.title);
                entity.referenceDate = req.body.referenceDate ? new Date(req.body.referenceDate) : null;
                entity.editUserId = req.user.id;
                entity.editDate = dateNow;
                entity.typeId = req.body.typeId;
                entity.against = !req.body.supportsParent;
                entity.tags = tags ? tags : [];
                if(!entity.ethicalStatus) {
                    entity.ethicalStatus = {};
                }
                entity.ethicalStatus.hasValue = req.body.hasEthicalValue ? true : false;
                if(parent) { // Parent is always an Argument
                    // A child argument.
                    entity.parentId = parent._id;
                    entity.ownerId = parent.ownerId; // TODO: redundant??? Since you can derive this from the parent? But filtering will be easier this way.
                    entity.ownerType = parent.ownerType; // TODO: redundant???
                    entity.threadId = parent.threadId ? parent.threadId : parent._id;
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
                    entity.createDate = dateNow;
                    flowUtils.initScreeningStatus(req, entity);
                }
                /*} else if(req.user.isAdmin()) {
                 entity.createUserId = req.body.author;
                 }*/
                flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.argument }, function () {
                    db.Argument.findOneAndUpdate(query, entity, {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }, function (err, doc) {
                        updatedEntity = doc;
                        callback();
                    });
                });
            });
        }
    }, function (err, results) {
        if(err) {
            console.error(err);
            return res.redirect('/');
        }
        var updateRedirect = function () {
            var model = {};
            flowUtils.setModelContext(req, res, model);
            var url = model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
            res.redirect(url);
        };
        if(!entry) { // if new entry, update parent count
            if(entity.parentId) {
                flowUtils.updateChildrenCount(entity.parentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, function () {
                    updateRedirect();
                });
            } else {
                flowUtils.updateChildrenCount(entity.ownerId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument, function () {
                    updateRedirect();
                });
            }
        } else {
            updateRedirect();
        }
    });
}

function GET_link_entry(req, res) {
    var model = {};
    var ownerQuery = { ownerId: req.params.id, ownerType: constants.OBJECT_TYPES.argumentLink };
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        if (!flowUtils.isEntryOnIntendedUrl(req, res, model.argumentLink)) {
            return res.redirect('/');
        }

        async.parallel({
            questions: function (callback) {
                // Top Questions
                var query = { ownerId: model.argumentLink.argumentId, ownerType: constants.OBJECT_TYPES.argument, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopQuestions(query, model, req, callback);
            },
            issues: function (callback) {
                // Top Issues
                var query = {
                    ownerId: ownerQuery.ownerId,
                    ownerType: ownerQuery.ownerType,
                    'screening.status': constants.SCREENING_STATUS.status1.code
                };
                flowUtils.getTopIssues(query, model, req, callback);
            },
            opinions: function (callback) {
                // Top Opinions
                var query = {
                    parentId: null,
                    ownerId: ownerQuery.ownerId,
                    ownerType: ownerQuery.ownerType,
                    'screening.status': constants.SCREENING_STATUS.status1.code
                };
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            flowUtils.setModelOwnerEntry(req, res, model);
            res.render(templates.wiki.arguments.link.entry, model);
        });
    });
}

function GET_link_edit(req, res) {
    var model = {};
    var ownerQuery = { ownerId: req.query.id, ownerType: constants.OBJECT_TYPES.argumentLink };
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        if(model.argumentLink && !flowUtils.isEntryOwner(req, model.argumentLink)) {
            return res.redirect(flowUtils.buildReturnUrl(req));
        }
        model.cancelUrl = flowUtils.buildReturnUrl(req);
        flowUtils.setModelOwnerEntry(req, res, model);
        res.render(templates.wiki.arguments.link.edit, model);
    });
}

function POST_link_edit(req, res) {
    var action = req.body.action;
    if(action === 'delete') {
        if(!req.user.isAdmin()) {
            // VALIDATION: only admin can delete a link
            return res.redirect(flowUtils.buildReturnUrl(req));
        }
        db.ArgumentLink.findByIdAndRemove(req.query.id, function(err, link) {
            if(link.parentId) {
                flowUtils.updateChildrenCount(link.parentId, constants.OBJECT_TYPES.argument, constants.OBJECT_TYPES.argument, function () {
                    res.redirect(flowUtils.buildParentUrl(req, link));
                });
            } else {
                flowUtils.updateChildrenCount(link.ownerId, link.ownerType, constants.OBJECT_TYPES.argument, function () {
                    res.redirect(flowUtils.buildParentUrl(req, link));
                });
            }
        });
    } else if(action === 'submit') {
        var query = { _id: req.query.id };
        db.ArgumentLink.findOne(query, function (err, result) {
            if(result && !flowUtils.isEntryOwner(req, result)) {
                // VALIDATION: non-owners cannot update other's entry
                return res.redirect(flowUtils.buildReturnUrl(req));
            }
            var entity = result ? result : {};
            entity.title = req.body.title;
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            entity.against = !req.body.supportsParent;
            if(!result) {
                flowUtils.initScreeningStatus(req, entity);
            }
            db.ArgumentLink.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
                res.redirect(flowUtils.buildReturnUrl(req));
            });
        });
    }
}