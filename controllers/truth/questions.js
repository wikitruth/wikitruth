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

    /* Questions */

    router.get('/', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                if(!req.query.argument && !model.topic) {
                    // Show Top Questions
                    // TODO: Filter top 100 based on number of activities
                }
                res.render(templates.truth.questions.index, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.truth.questions.create, model);
            });
        });
    });
};
