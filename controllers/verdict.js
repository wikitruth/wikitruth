'use strict';

var flowUtils   = require('../utils/flowUtils'),
    constants   = require('../models/constants'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    db          = require('../app').db.models;

module.exports = function (router) {

    /* Verdict */

    router.get('/update', function (req, res) {
        var model = {
            verdictStatus: constants.VERDICT_STATUS.pending
        };
        flowUtils.setArgumentModels(req, model, function () {
            var query = model.argument ? { 'topic': model.argument.ownerId } : req.query;
            flowUtils.setTopicModels({query: query}, model, function () {
                //var item = model.argument ? model.argument : model.topic;
                /*var parent = null;
                if(model.argument) {
                } else if(model.topic) {
                }*/
                if(model.argument && model.argument.verdict && model.argument.verdict.status) {
                    model.verdictStatus = model.argument.verdict.status;
                }
                res.render(templates.truth.verdict.update, model);
            });
        });
    });

    router.post('/update', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModels(req, model, function () {
                var verdictStatus = req.body.verdictStatus;
                db.Argument.update({_id: model.argument._id}, {
                    $set: {
                        verdict: {
                            status: verdictStatus,
                            editDate: Date.now() ,
                            editUserId: req.user.id
                        }
                    }
                }, function (err, num) {
                    res.redirect((req.query.argument ? paths.truth.arguments.entry : paths.truth.topics.entry)
                        + '?topic=' + req.query.topic + (req.query.argument ? '&argument=' + req.query.argument : '')
                    );
                });
            });
        });
    });
};
