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
    if(!req.query.answer) {
        if(req.params.id) {
            req.query.answer = req.params.id;
        } else {
            req.query.answer = req.params.friendlyUrl;
        }
    }
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
        async.parallel({
            issues: function (callback) {
                flowUtils.getTopIssues(ownerQuery, model, callback);
            },
            opinions: function (callback) {
                var query = { parentId: null, ownerId: req.query.answer, ownerType: constants.OBJECT_TYPES.answer, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopOpinions(query, model, callback);
            }
        }, function (err, results) {
            model.isEntryOwner = model.isAnswerOwner;
            flowUtils.setModelOwnerEntry(model);
            flowUtils.setModelContext(req, model);
            res.render(templates.wiki.answers.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {};
    var query = flowUtils.createOwnerQueryFromQuery(req);
    if(query.ownerId) {
        flowUtils.setScreeningModel(req, model);
        flowUtils.setEntryModels(query, req, model, function (err) {
            db.Answer
                .find({ questionId: model.question._id, 'screening.status': model.screening.status })
                .sort({ title: 1 })
                .lean()
                .exec(function (err, results) {
                    flowUtils.setEditorsUsername(results, function () {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.answers = results;
                        flowUtils.setModelOwnerEntry(model);
                        flowUtils.setModelContext(req, model);

                        // screening and children count
                        model.childrenCount = model.entry.childrenCount.answers;
                        if(model.childrenCount.pending === 0 && model.childrenCount.rejected === 0) {
                            model.screening.hidden = true;
                        }
                        res.render(templates.wiki.answers.index, model);
                    });
                });
        });
    } else {
        // Top Answers
        query = { ownerType: constants.OBJECT_TYPES.topic, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code };
        //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        db.Answer
            .find(query)
            .sort({editDate: -1})
            .limit(25)
            .lean()
            .exec(function (err, results) {
                flowUtils.setEditorsUsername(results, function () {
                    results.forEach(function (result) {
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtra(result);
                    });
                    model.answers = results;
                    flowUtils.setModelContext(req, model);
                    res.render(templates.wiki.answers.index, model);
                });
            });
    }
}

function GET_create(req, res) {
    var model = {};
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function () {
        flowUtils.setModelContext(req, model);
        res.render(templates.wiki.answers.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.answer || new mongoose.Types.ObjectId() };
    db.Answer.findOne(query, function(err, result) {
        var entity = result ? result : {};
        var dateNow = Date.now();
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
            entity.questionId = req.query.question;
            flowUtils.initScreeningStatus(req, entity);
        }
        entity.private = req.params.username ? true : false;
        db.Answer.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
            var updateRedirect = function () {
                var model = {};
                flowUtils.setModelContext(req, model);
                var url = model.wikiBaseUrl + paths.wiki.answers.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                res.redirect(url);
                /*res.redirect((result ? paths.wiki.answers.entry : paths.wiki.answers.index) +
                 '?topic=' + req.query.topic +
                 (req.query.argument ? '&argument=' + req.query.argument : '') +
                 (result ? '&answer=' + req.query.answer : '')
                 );*/
            };
            if(!result) { // if new entry, update parent children count
                flowUtils.updateChildrenCount(updatedEntity.questionId, constants.OBJECT_TYPES.question, constants.OBJECT_TYPES.answer, function () {
                    updateRedirect();
                });
            } else {
                updateRedirect();
            }
        });
    });
}

module.exports = function (router) {

    /* Answers */

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