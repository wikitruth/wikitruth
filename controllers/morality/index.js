'use strict';

var utils       = require('../../utils/utils'),
    flowUtils   = require('../../utils/flowUtils'),
    templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    db          = require('../../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                // display 15 if top topics, 100 if has topic parameter
                var query = req.query.topic ? { parentId: req.query.topic } : { groupId: constants.CORE_GROUPS.morality };
                db.Topic.find(query).limit(req.query.topic ? 100 : 15).sort(req.query.topic ? { title: 1 } : {}).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.randomInt(0,999);
                    });
                    model.topics = results;
                    callback();
                });
            },
            categories: function(callback) {
                if(!req.query.topic) {
                    db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.morality}).sort({title: 1}).exec(function (err, results) {
                        results.forEach(function (result) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        });
                        model.categories = results;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.morality.topics.index, model);
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function() {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.morality.related, model);
                });
            });
        });
    });
};
