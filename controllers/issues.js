'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

function GET_entry(req, res) {
    var model = {};
    if(!req.query.issue) {
        if(req.params.id) {
            req.query.issue = req.params.id;
        } else {
            req.query.issue = req.params.friendlyUrl;
        }
    }
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
        ownerQuery.parentId = null;
        async.parallel({
            opinions: function (callback) {
                flowUtils.getTopOpinions(ownerQuery, model, callback);
            }
        }, function (err, results) {
            model.issueType = constants.ISSUE_TYPES['type' + model.issue.issueType].text;
            model.isEntryOwner = model.isIssueOwner;
            flowUtils.setModelOwnerEntry(model);
            flowUtils.setModelContext(req, model);
            res.render(templates.wiki.issues.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {};
    var query = flowUtils.createOwnerQueryFromQuery(req);
    if(query.ownerId) {
        flowUtils.setScreeningModel(req, model);
        flowUtils.setEntryModels(query, req, model, function (err) {
            query = flowUtils.createOwnerQueryFromModel(model);
            query['screening.status'] = model.screening.status;
            db.Issue
                .find(query)
                .sort({title: 1})
                .lean()
                .exec(function (err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        flowUtils.appendEntryExtra(result);
                    });
                    model.issues = results;
                    flowUtils.setModelOwnerEntry(model);
                    flowUtils.setModelContext(req, model);

                    // screening and children count
                    model.childrenCount = model.entry.childrenCount.issues;
                    if(model.childrenCount.pending === 0 && model.childrenCount.rejected === 0) {
                        model.screening.hidden = true;
                    }
                    res.render(templates.wiki.issues.index, model);
                });
            });
        });
    } else {
        // Top Issues
        db.Issue
            .find({ ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code })
            .limit(100)
            .lean()
            .exec(function(err, results) {
            flowUtils.setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    flowUtils.appendEntryExtra(result);
                });
                model.issues = results;
                flowUtils.setModelContext(req, model);
                res.render(templates.wiki.issues.index, model);
            });
        });
    }
}

function GET_create(req, res) {
    var model = {};
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
        model.ISSUE_TYPES = constants.ISSUE_TYPES;
        flowUtils.setModelContext(req, model);
        res.render(templates.wiki.issues.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.issue || new mongoose.Types.ObjectId() };
    db.Issue.findOne(query, function(err, result) {
        var dateNow = Date.now();
        var entity = result ? result : {};
        entity.title = req.body.title;
        entity.content = req.body.content;
        entity.contentPreview = flowUtils.createContentPreview(req.body.content);
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.issueType = req.body.issueType;
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if(!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
            flowUtils.initScreeningStatus(req, entity);
        }
        entity.private = req.params.username ? true : false;
        if(!entity.ownerId) {
            delete req.query.opinion;
            delete req.query.issue;
            var q = flowUtils.createOwnerQueryFromQuery(req);
            entity.ownerId = q.ownerId;
            entity.ownerType = q.ownerType;
        }
        db.Issue.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
            var updateRedirect = function () {
                var model = {};
                flowUtils.setModelContext(req, model);
                var url = model.wikiBaseUrl + paths.wiki.issues.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                res.redirect(url);
            };
            if(!result) { // if new entry, update parent children count
                flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.issue, function () {
                    updateRedirect();
                });
            } else {
                updateRedirect();
            }
        });
    });
}

module.exports = function (router) {

    /* Issues */

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