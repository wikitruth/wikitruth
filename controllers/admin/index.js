'use strict';

var templates   = require('../../models/templates'),
    config      = require('../../config/config'),
    backup      = require('mongodb-backup'),
    restore     = require('mongodb-restore'),
    db          = require('../../app').db.models,
    mongoose    = require('mongoose'),
    fs          = require('fs'),
    async       = require('async');

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
                //collectionsX: [ 'topics', 'arguments' ], // save this collection only
                parser: 'json'
            });
        } else if(action === 'restore') {
            restore({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: getBackupDir() + '/wikitruth', // write files into this dir
                //dropCollections: [ 'topics', 'arguments' ], // save this collection only
                parser: 'json',
                drop: true
            });
        } else if(action === 'restore2') {
            var colmaps = {
                'accountcategories': 'AccountCategory',
                'accounts': 'Account',
                'admingroups': 'AdminGroup',
                'admins': 'Admin',
                'arguments': 'Argument',
                'categories': 'Category',
                'ideologies': 'Ideology',
                'issues': 'Issue',
                'loginattempts': 'LoginAttempt',
                'opinions': 'Opinion',
                'pages': 'Page',
                'questions': 'Question',
                'sessions': 'Session',
                'status': 'Status',
                'topics': 'Topic',
                'users': 'User',
                'words': 'Word'
            };
            var cols = [
                'users',
                'accountcategories',
                'accounts',
                'admingroups',
                'admins',
                'arguments',
                'ideologies',
                'issues',
                'loginattempts',
                'opinions',
                'pages',
                'questions',
                'status',
                'topics',
                'words'
            ];
            var dir = getBackupDir() + '/wikitruth';
            //var cols = fs.readdirSync(dir);
            console.log(cols);
            for (var i=0; i<cols.length; i++) {
                var col = cols[i];
                var coldir = dir + '/' + col;
                var jsons = fs.readdirSync(coldir);
                console.log('restore:', col);
                console.log(jsons);
                for (var x=0; x<jsons.length; x++) {

                    var json = jsons[x];
                    var file = coldir + '/' + json;
                    var obj = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if(colmaps[col]) {
                        db[colmaps[col]].create(obj, function (err, newObj) {
                            if (err) console.error(err);
                            // saved!
                        })
                    }
                }
            }
        }
        model.action = action;
        res.render(templates.admin.mongoBackup, model);
    });
};
