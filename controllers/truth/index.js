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

    /*router.get('/', function (req, res) {
        var model = {};
        db.Topic.find({}).limit(100).sort({ title: 1 }).exec(function(err, results) {
            results.forEach(function(result) {
                result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
            });
            model.topics = results;
            res.render('dust/wiki/index', model);
        });
        //res.send('<code><pre>' + JSON.stringify(model, null, 2) + '</pre></code>');
    });*/

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            topic: function(callback){
                flowUtils.setTopicModels(req, model, callback);
            },
            topics: function(callback) {
                var query = req.query.topic ? { parentId: req.query.topic } : { parentId: null};
                db.Topic.find(query).limit(100).sort({ title: 1 }).exec(function(err, results) {
                    results.forEach(function(result) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1,100000));
                    });
                    model.topics = results;
                    callback();
                });
            }
        }, function (err, results) {
            res.render(templates.truth.topics.index, model);
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function() {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.truth.related, model);
            });
        });
    });
};
