'use strict';

var templates   = require('../../models/templates'),
    config      = require('../../config/config'),
    backup      = require('mongodb-backup'),
    restore      = require('mongodb-restore');

function getBackupDir() {
    if(config.mongodb.backupRoot) {
        if(config.mongodb.backupRoot.startsWith('~')) {
            return __dirname + '/../..' + config.mongodb.backupRoot.substring(1);
        }
        return config.mongodb.backupRoot;
    }
    return __dirname + '/../../config/mongodb';
}

module.exports = function (router) {

    router.get('/db-backup', function (req, res) {
        var model = {};
        //model.dirname = __dirname;
        res.render(templates.admin.mongoBackup, model);
    });

    router.post('/db-backup', function (req, res) {
        var model = {};
        //console.info('action: ', req.body.buttonAction);
        var action = req.body.buttonAction;
        if(action === 'backup') {
            backup({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: getBackupDir(), // write files into this dir
                collectionsX: [ 'topics', 'arguments' ], // save this collection only
                parser: 'json'
            });
        } else if(action === 'restore') {
            restore({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: getBackupDir() + '/wikitruth', // write files into this dir
                dropCollections: [ 'topics', 'arguments' ], // save this collection only
                parser: 'json'
            });
        }
        model.action = action;
        res.render(templates.admin.mongoBackup, model);
    });
};
