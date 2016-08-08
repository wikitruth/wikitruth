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
                var query = req.query.topic ? { parentId: req.query.topic } : { groupId: constants.CORE_GROUPS.truth };
                db.Topic.find(query).limit(req.query.topic ? 100 : 15).sort(req.query.topic ? { title: 1 } : {}).exec(function(err, results) {
                    results.forEach(function(result) {
                        flowUtils.appendEntryExtra(result);
                    });
                    model.topics = results;
                    callback();
                });
            },
            categories: function(callback) {
                if(!req.query.topic) {
                    db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.truth }).sort({title: 1}).exec(function (err, results) {
                        async.each(results, function(result, callback) {
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                            db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                                result.subtopics = subtopics;
                                callback();
                            });
                        }, function(err) {
                            model.categories = results;
                            callback();
                        });
                    });
                } else {
                    callback();
                }
            }
        }, function (err, results) {
            res.render(templates.truth.topics.index, model);
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function() {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.truth.related, model);
                });
            });
        });
    });
};
