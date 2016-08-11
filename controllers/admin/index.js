'use strict';

var templates   = require('../../models/templates'),
    constants   = require('../../models/constants'),
    config      = require('../../config/config'),
    flowUtils   = require('../../utils/flowUtils'),
    backup      = require('mongodb-backup'),
    db          = require('../../app').db.models,
    fs          = require('fs'),
    async       = require('async');

module.exports = function (router) {

    router.get('/db-backup', function (req, res) {
        var model = {};
        model.dirname = flowUtils.getBackupDir();
        res.render(templates.admin.mongoBackup, model);
    });

    router.post('/db-backup', function (req, res) {
        var model = {};
        //console.info('action: ', req.body.buttonAction);
        var action = req.body.buttonAction;
        model.action = action;
        model.dirname = flowUtils.getBackupDir();
        if(action === 'backup') {
            backup({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: flowUtils.getBackupDir(), // write files into this dir
                collections: constants.DB.cols, // save this collection only
                parser: 'json'
            });
            res.render(templates.admin.mongoBackup, model);
        } else if(action === 'restore') {
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
                                    if (err) {
                                        console.error(err);
                                    }
                                    callback();
                                });
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
                res.render(templates.admin.mongoBackup, model);
            });
            /*restore({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: getBackupDir() + '/wikitruth', // write files into this dir
                //dropCollections: [ 'topics', 'arguments' ], // save this collection only
                parser: 'json',
                drop: true
            });*/
        }
    });
};
