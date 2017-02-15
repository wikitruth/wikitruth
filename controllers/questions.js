'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    htmlToText  = require('html-to-text'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

function GET_entry(req, res) {
    var model = {};
    if(!req.query.question) {
        if(req.params.id) {
            req.query.question = req.params.id;
        } else {
            req.query.question = req.params.friendlyUrl;
        }
    }
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
                            flowUtils.appendEntryExtra(result);
                        });
                        model.answers = results;
                        callback();
                    });
                });
            },
            issues: function (callback) {
                // Top Issues
                db.Issue
                    .find(ownerQuery)
                    .limit(15)
                    .lean()
                    .sort({ title: 1 })
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
                db.Opinion
                    .find(ownerQuery)
                    .limit(15)
                    .lean()
                    .sort({ title: 1 })
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
            flowUtils.setModelOwnerEntry(model);
            flowUtils.setModelContext(req, model);
            res.render(templates.wiki.questions.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {};
    if(req.query.topic) {
        flowUtils.setScreeningModel(req, model);
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModels(req, model, function () {
                var query = req.query.argument ?
                    { ownerId: model.argument._id, ownerType: constants.OBJECT_TYPES.argument } :
                    { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
                query['screening.status'] = model.screening.status;
                db.Question.find(query).sort({ title: 1 }).lean().exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.questions = results;
                        flowUtils.setModelOwnerEntry(model);
                        flowUtils.setModelContext(req, model);

                        // screening and children count
                        model.childrenCount = model.entry.childrenCount.questions;
                        if(model.childrenCount.pending === 0 && model.childrenCount.rejected === 0) {
                            model.screening.hidden = true;
                        }
                        res.render(templates.wiki.questions.index, model);
                    });
                });
            });
        });
    } else {
        // Top Questions
        var query = { ownerType: constants.OBJECT_TYPES.topic, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code };
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
                        flowUtils.appendEntryExtra(result);
                    });
                    model.questions = results;
                    flowUtils.setModelContext(req, model);
                    res.render(templates.wiki.questions.index, model);
                });
            });
    }
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
        entity.content = req.body.content;
        entity.contentPreview = utils.getShortText(htmlToText.fromString(req.body.content, { wordwrap: false }), constants.SETTINGS.contentPreviewLength);
        entity.references = req.body.references;
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if(!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
            flowUtils.initScreeningStatus(req, entity);
        }
        entity.private = req.params.username ? true : false;
        if(!entity.ownerId) {
            if(req.query.argument) {
                entity.ownerId = req.query.argument;
                entity.ownerType = constants.OBJECT_TYPES.argument;
            } else if(req.query.topic) { // parent is a topic
                entity.ownerId = req.query.topic;
                entity.ownerType = constants.OBJECT_TYPES.topic;
            }
        }
        db.Question.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
            var updateRedirect = function () {
                var model = {};
                flowUtils.setModelContext(req, model);
                var url = model.wikiBaseUrl + paths.wiki.questions.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                res.redirect(url);
            };
            if(!result) { // if new entry, update parent children count
                flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.question, function () {
                    updateRedirect();
                });
            } else {
                updateRedirect();
            }
        });
    });
}

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