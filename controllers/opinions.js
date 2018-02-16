'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

function shiftModels(req, model) {
    if(!req.query.id){
        // shift models one step down
        if(model.parentOpinion) {
            model.grandParentOpinion = model.parentOpinion;
        }
        if(model.opinion) {
            model.parentOpinion = model.opinion;
            delete model.opinion;
        }
    }
}

function GET_entry(req, res) {
    var model = {};
    flowUtils.ensureEntryIdParam(req, 'opinion');
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        var query = {
            parentId: model.opinion._id,
            'screening.status': constants.SCREENING_STATUS.status1.code
        };
        async.parallel({
            issues: function (callback) {
                // Top Issues
                ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
                flowUtils.getTopIssues(ownerQuery, model, req, callback);
            },
            opinions: function (callback) {
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            flowUtils.setModelOwnerEntry(req, model);
            res.render(templates.wiki.opinions.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {};
    var query = flowUtils.createOwnerQueryFromQuery(req);
    if(query.ownerId) {
        flowUtils.setScreeningModel(req, model);
        flowUtils.setEntryModels(query, req, model, function (err) {
            //query = flowUtils.createOwnerQueryFromModel(model);
            query['screening.status'] = model.screening.status;
            db.Opinion
                .find(query)
                .sort({title: 1})
                .lean()
                .exec(function (err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                    });
                    model.opinions = results;
                    flowUtils.setModelOwnerEntry(req, model);

                    // screening and children count
                    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.opinions);
                    res.render(templates.wiki.opinions.index, model);
                });
            });
        });
    } else {
        // Top Opinions
        db.Opinion
            .find({ ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code })
            .limit(100)
            .lean()
            .exec(function(err, results) {
            flowUtils.setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
                });
                model.opinions = results;
                flowUtils.setModelContext(req, model);
                res.render(templates.wiki.opinions.index, model);
            });
        });
    }
}

function GET_create(req, res) {
    var model = {};
    if(req.query.id) { req.query.opinion = req.query.id; }
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
        shiftModels(req, model);
        if(model.opinion && !flowUtils.isEntryOwner(req, model.opinion)){
            return res.redirect('/');
        }
        flowUtils.setModelOwnerEntry(req, model);
        res.render(templates.wiki.opinions.create, model);
    });
}

function POST_create(req, res) {
    var model = {};
    if(req.query.id) { req.query.opinion = req.query.id; }
    flowUtils.setOpinionModel(req, model, function (err) {
        shiftModels(req, model);

        var dateNow = Date.now();
        var entity = model.opinion ? model.opinion : {};
        entity.title = req.body.title;
        entity.content = req.body.content;
        entity.contentPreview = flowUtils.createContentPreview(req.body.content);
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if(!model.opinion) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
            flowUtils.initScreeningStatus(req, entity);
        }
        entity.private = req.params.username ? true : false;
        if(model.parentOpinion) {
            // A child opinion
            var parent = model.parentOpinion;
            entity.parentId = parent._id;
            entity.ownerId = parent.ownerId;
            entity.ownerType = parent.ownerType;
        } else if(!entity.ownerId) {
            // A new root opinion.
            delete req.query.opinion;
            var q = flowUtils.createOwnerQueryFromQuery(req);
            entity.parentId = null;
            entity.ownerId = q.ownerId;
            entity.ownerType = q.ownerType;
        }
        flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.opinion }, function () {
            var query = {_id: req.query.id || new mongoose.Types.ObjectId()};
            db.Opinion.findOneAndUpdate(query, entity, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }, function (err, updatedEntity) {
                var updateRedirect = function () {
                    var model = {};
                    flowUtils.setModelContext(req, model);
                    var url = model.wikiBaseUrl + paths.wiki.opinions.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                    res.redirect(url);
                };
                if (!model.opinion) { // if new entry, update parent count
                    if (entity.parentId) { // parent is always an opinion object
                        flowUtils.updateChildrenCount(entity.parentId, constants.OBJECT_TYPES.opinion, constants.OBJECT_TYPES.opinion, function () {
                            updateRedirect();
                        });
                    } else { // parent can be anything
                        flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.opinion, function () {
                            updateRedirect();
                        });
                    }
                } else {
                    updateRedirect();
                }
            });
        });
    });
}

module.exports = function (router) {

    /* Opinions */

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