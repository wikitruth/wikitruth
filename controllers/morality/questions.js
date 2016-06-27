'use strict';

var flowUtils   = require('../../utils/flowUtils'),
    templates   = require('../../models/templates');

module.exports = function (router) {

    /* Questions */

    router.get('/', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                /*if(!req.query.argument && !model.topic) {
                    // Show Top Questions
                    // TODO: Filter top 100 based on number of activities
                }*/
                res.render(templates.morality.questions.index, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.morality.questions.create, model);
            });
        });
    });
};
