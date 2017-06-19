'use strict';

var flowUtils   = require('../utils/flowUtils'),
    utils       = require('../utils/utils'),
    constants   = require('../models/constants'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    db          = require('../app').db.models;

function createReturnUrl(req, model) {
    switch (model.entryType) {
        case constants.OBJECT_TYPES.topic:
            return model.wikiBaseUrl + paths.wiki.topics.entry + '/' + utils.urlify(model.entry.title) + '/' + model.entry._id;
        case constants.OBJECT_TYPES.argument:
            return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(model.entry.title) + '/' + req.query.argument;
        default:
            return model.wikiBaseUrl + paths.wiki[constants.OBJECT_NAMES_MAP[model.ownerType]].entry + '/' + utils.urlify(model.entry.title) + '/' + model.entry._id;
    }
}

module.exports = function (router) {

    /* Verdict */

    router.get('/update', function (req, res) {
        var model = {
            verdictStatus: constants.VERDICT_STATUS.pending
        };
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(model);
            flowUtils.setModelContext(req, model);
            if(model.entry && model.entry.verdict && model.entry.verdict.status) {
                model.verdictStatus = model.entry.verdict.status;
            }
            model.cancelUrl = createReturnUrl(req, model);
            res.render(templates.wiki.verdict.update, model);
        });
    });

    router.post('/update', function (req, res) {
        var model = {};
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(model);
            flowUtils.setModelContext(req, model);
            var updateQuery = {
                $set: {
                    verdict: {
                        status: req.body.verdictStatus,
                        editDate: Date.now() ,
                        editUserId: req.user.id
                    }
                }
            };
            var redirectCallback = function (err, num) {
                res.redirect(createReturnUrl(req, model));
            };
            switch (model.entryType) {
                case constants.OBJECT_TYPES.topic:
                    db.Topic.update({_id: model.entry._id}, updateQuery, redirectCallback);
                    break;
                case constants.OBJECT_TYPES.argument:
                    db.Argument.update({_id: model.entry._id}, updateQuery, redirectCallback);
                    break;
            }
        });
    });
};
