'use strict';

var flowUtils   = require('../../utils/flowUtils'),
    templates   = require('../../models/templates');

module.exports = function (router) {

    /* Verdict */

    router.get('/update', function (req, res) {
        var model = {};
        flowUtils.setArgumentModels(req, model, function () {
            var query = model.argument ? { 'topic': model.argument.ownerId } : req.query;
            flowUtils.setTopicModels({query: query}, model, function () {
                //var item = model.argument ? model.argument : model.topic;
                /*var parent = null;
                if(model.argument) {

                } else if(model.topic) {

                }*/

                res.render(templates.truth.verdict.update, model);
            });
        });
    });

    router.post('/update', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModels(req, model, function () {
                res.render(templates.truth.outline.create, model);
            });
        });
    });
};
