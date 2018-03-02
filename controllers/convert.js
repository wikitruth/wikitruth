'use strict';

var flowUtils   = require('../utils/flowUtils'),
    constants   = require('../models/constants'),
    templates   = require('../models/templates'),
    db          = require('../app').db.models;

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(req, model, { hideClipboard: true });
            model.cancelUrl = flowUtils.createReturnUrl(req, model);
            model.hideEntryOptions = true;
            res.render(templates.wiki.convert, model);
        });
    });

    router.post('/', function (req, res) {
        var model = {};
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(req, model);

            var redirectCallback = function (err, num) {
                res.redirect(flowUtils.createReturnUrl(req, model));
            };
            var updateQuery = {
                $set: {
                    verdict: {
                        status: req.body.verdictStatus,
                        editDate: Date.now() ,
                        editUserId: req.user.id
                    }
                }
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
