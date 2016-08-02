'use strict';

var utils       = require('../utils/utils'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models,
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        async.parallel({
            truth: function(callback) {
                db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.truth }).limit(3).exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.truth = results;
                        callback();
                    });
                });
            },
            worldviews: function(callback) {
                db.Ideology.find({ parentId: null }).limit(3).sort({ title: 1 }).exec(function(err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Ideology.find( { parentId: result._id } ).limit(2).exec(function(err, subworldviews) {
                            result.subworldviews = subworldviews;
                            callback();
                        });
                    }, function(err) {
                        model.worldviews = results;
                        callback();
                    });
                });
            },
            morality: function(callback) {
                db.Topic.find({parentId: null, groupId: constants.CORE_GROUPS.morality}).limit(3).exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.morality = results;
                        callback();
                    });
                });
            }
        }, function (err, results) {
            res.render(templates.index, model);
        });
    });
};
