'use strict';

var flowUtils   = require('../utils/flowUtils'),
    constants   = require('../models/constants'),
    templates   = require('../models/templates'),
    db          = require('../app').db.models;

module.exports = function (router) {

    router.get('/update', function (req, res) {
        var model = {
            verdictStatus: constants.VERDICT_STATUS.pending
        };
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(req, res, model, { hideClipboard: true });
            if(model.entry && model.entry.verdict && model.entry.verdict.status) {
                model.verdictStatus = model.entry.verdict.status;
            }
            model.cancelUrl = flowUtils.buildEntryReturnUrl(req, model);
            model.hideEntryOptions = true;
            res.render(templates.wiki.verdict.update, model);
        });
    });

    router.post('/update', function (req, res) {
        var model = {};
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(req, res, model);
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
                res.redirect(flowUtils.buildEntryReturnUrl(req, model));
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
