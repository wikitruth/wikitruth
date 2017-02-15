'use strict';

var flowUtils   = require('../utils/flowUtils'),
    utils       = require('../utils/utils'),
    constants   = require('../models/constants'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths');

function createReturnUrl(req, model) {
    return paths.wiki[constants.OBJECT_NAMES_MAP[model.ownerType]].entry + '/' + utils.urlify(model.entry.title) + '/' + model.entry._id;
}

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(model);
            model.ownerType = ownerQuery.ownerType;
            model.cancelUrl = createReturnUrl(req, model);
            res.render(templates.wiki.screening, model);
        });
    });

    router.post('/', function (req, res) {
        var model = {};
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            flowUtils.setModelOwnerEntry(model);
            model.ownerType = ownerQuery.ownerType;
            var screeningStatus = req.body.screeningStatus;
            var dbModel = flowUtils.getDbModelByObjectType(ownerQuery.ownerType);
            if(dbModel) {
                dbModel.update({_id: model.entry._id}, {
                    $set: {
                        'screening.status': screeningStatus
                    }
                }, function (err, num) {
                    res.redirect(createReturnUrl(req, model));
                });
            } else {
                return res.status(500).send({ error: 'Invalid db model.' });
            }
        });
    });
};
