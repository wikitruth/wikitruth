'use strict';

var utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    paths       = require('../../models/paths'),
    templates   = require('../../models/templates'),
    mongoose    = require('mongoose'),
    modelTypes  = require('../../models/constants').MODEL_TYPES,
    db          = require('../../app').db.models,
    async       = require('async');

module.exports = function (router) {

    /* Outline */

    router.get('/link', function (req, res) {
        var model = {};
        flowUtils.setArgumentModel(req, model, function () {
            var query = model.argument ? { 'topic': model.argument.ownerId } : req.query;
            flowUtils.setTopicModels({query: query}, model, function () {
                //var item = model.argument ? model.argument : model.topic;
                var parent = null;
                if(model.argument) {

                } else if(model.topic) {

                }

                res.render(templates.truth.outline.linkTo, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.truth.outline.create, model);
            });
        });
    });
};
