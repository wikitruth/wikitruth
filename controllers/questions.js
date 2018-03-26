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

    /* Questions */

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
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;

function GET_entry(req, res) {
    var model = {};
    flowUtils.ensureEntryIdParam(req, 'question');
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
        async.parallel({
            answers: function (callback) {
                // Top Issues
                db.Answer
                    .find({ questionId: model.question._id, 'screening.status': constants.SCREENING_STATUS.status1.code })
                    .limit(15)
                    .lean()
                    .sort({ title: 1 })
                    .exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
                        });
                        model.answers = results;
                        callback();
                    });
                });
            },
            issues: function (callback) {
                // Top Issues
                flowUtils.getTopIssues(ownerQuery, model, req, callback);
            },
            opinions: function (callback) {
                var query = { parentId: null, ownerId: req.query.question, ownerType: constants.OBJECT_TYPES.question, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            flowUtils.setModelOwnerEntry(req, model);
            res.render(templates.wiki.questions.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {}, query = {};
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        if(model.topic) {
            flowUtils.setScreeningModel(req, model);
            query = req.query.argument ?
            { ownerId: model.argument._id, ownerType: constants.OBJECT_TYPES.argument } :
            { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
            query['screening.status'] = model.screening.status;
            db.Question.find(query).sort({ title: 1 }).lean().exec(function(err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                    });
                    model.questions = results;
                    flowUtils.setModelOwnerEntry(req, model);

                    // screening and children count
                    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.questions);
                    res.render(templates.wiki.questions.index, model);
                });
            });
        } else {
            // Top Questions
            query = { ownerType: constants.OBJECT_TYPES.topic, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code };
            //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
            db.Question
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
                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
                        });
                        model.questions = results;
                        flowUtils.setModelContext(req, model);
                        res.render(templates.wiki.questions.index, model);
                    });
                });
        }
    });
}

function GET_create(req, res) {
    var model = {};
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function () {
        flowUtils.setModelContext(req, model);
        res.render(templates.wiki.questions.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.question || new mongoose.Types.ObjectId() };
    db.Question.findOne(query, function(err, result) {
        var dateNow = Date.now();
        var entity = result ? result : {};
        entity.title = req.body.title;
        entity.content = flowUtils.getEditorContent(req.body.content);
        entity.contentPreview = flowUtils.createContentPreview(entity.content);
        entity.references = flowUtils.getEditorContent(req.body.references);
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if(!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
            flowUtils.initScreeningStatus(req, entity);
        }
        if(!entity.ownerId) {
            if(req.query.argument) {
                entity.ownerId = req.query.argument;
                entity.ownerType = constants.OBJECT_TYPES.argument;
            } else if(req.query.topic) { // parent is a topic
                entity.ownerId = req.query.topic;
                entity.ownerType = constants.OBJECT_TYPES.topic;
            }
        }
        flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.question }, function () {
            db.Question.findOneAndUpdate(query, entity, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }, function (err, updatedEntity) {
                var updateRedirect = function () {
                    var model = {};
                    flowUtils.setModelContext(req, model);
                    var url = model.wikiBaseUrl + paths.wiki.questions.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                    res.redirect(url);
                };
                if (!result) { // if new entry, update parent children count
                    flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.question, function () {
                        updateRedirect();
                    });
                } else {
                    updateRedirect();
                }
            });
        });
    });
}