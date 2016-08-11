'use strict';

var templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    config      = require('../../config/config'),
    flowUtils   = require('../../utils/flowUtils'),
    backup      = require('mongodb-backup'),
    restore     = require('mongodb-restore'),
    db          = require('../../app').db.models,
    mongoose    = require('mongoose'),
    fs          = require('fs'),
    async       = require('async');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        model.dirname = flowUtils.getBackupDir();
        res.render(templates.install, model);
    });

    router.post('/', function (req, res) {
        var model = {};
        model.dirname = flowUtils.getBackupDir();
        var dir = flowUtils.getBackupDir() + '/wikitruth';
        console.log(constants.DB.cols);

        async.eachSeries(constants.DB.cols, function (col, callback) {
            var coldir = dir + '/' + col;
            var jsons = fs.readdirSync(coldir);
            console.log('restore:', col);
            console.log(jsons);
            if (constants.DB.colmaps[col]) {
                var collection = db[constants.DB.colmaps[col]];
                if (collection) {
                    collection.remove({}, function (err) {
                        async.eachSeries(jsons, function (json, callback) {
                            var file = coldir + '/' + json;
                            var obj = JSON.parse(fs.readFileSync(file, 'utf8'));
                            collection.create(obj, function (err, newObj) {
                                if (err) console.error(err);
                                callback();
                            })
                        }, function (err) {
                            callback();
                        });
                    });
                } else {
                    callback();
                }
            } else {
                callback();
            }
        }, function (err) {
            model.done = true;
            res.render(templates.install, model);
        });
    });
};
