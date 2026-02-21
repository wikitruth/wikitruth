'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
let templates = require('../models/templates'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'config'.
    config = require('../config/config'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
    flowUtils = require('../utils/flowUtils'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
    db = require('../app').db.models,
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'fs'.
    fs = require('fs'),
    // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
    async = require('async');

let cols = config.mongodb.collections;

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function requestLogin(req, res) {
    // redirect to login
    res.set('X-Auth-Required', 'true');
    req.session.returnUrl = req.originalUrl;
    res.redirect('/login/');
}

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/', async function (req, res) {
        let model = {};
        // @ts-ignore TS(2339): Property 'dirname' does not exist on type '{}'.
        model.dirname = flowUtils.getBackupDir();

        // Validate if db is already up. If yes, check if user is logged in and is admin
        if (req.isAuthenticated()) {
            if (req.user.canPlayRoleOf('admin')) {
                // @ts-ignore TS(2339): Property 'showRestore' does not exist on type '{}'... Remove this comment to see the full error message
                model.showRestore = true;
            }
            // else: User won't be allowed.
            res.render(templates.install, model);
        } else {
            const result = await db.Admin.findOne({});
            if (!result) {
                // No data, allow the user to restore.
                // @ts-ignore TS(2339): Property 'showRestore' does not exist on type '{}'... Remove this comment to see the full error message
                model.showRestore = true;
                res.render(templates.install, model);
            } else {
                requestLogin(req, res);
            }
        }
    });

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.post('/', async function (req, res) {
        let model = {};
        // @ts-ignore TS(2339): Property 'dirname' does not exist on type '{}'.
        model.dirname = flowUtils.getBackupDir();

        // @ts-ignore TS(7006): Parameter 'col' implicitly has an 'any' type.
        let restoreTask = async function (col, callback) {
            let dir = flowUtils.getBackupDir() + '/wikitruth';
            let coldir = dir + '/' + col;
            if (!fs.existsSync(coldir)) {
                return callback();
            }
            let jsons = fs.readdirSync(coldir);
            if (cols.modelMapping[col]) {
                let collection = db[cols.modelMapping[col]];
                if (collection) {
                    await collection.deleteMany({});
                    // @ts-ignore TS(7006): Parameter 'json' implicitly has an 'any' type.
                    async.eachSeries(jsons, async function (json, callback) {
                        let file = coldir + '/' + json;
                        let obj = JSON.parse(fs.readFileSync(file, 'utf8'));
                        try {
                            await collection.create(obj);
                        } catch (err) {
                            console.error(err);
                        }
                        callback();
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    }, function (err) {
                        callback();
                    });
                } else {
                    callback();
                }
            } else {
                callback();
            }
        };

        let next = function () {
            async.series({
                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                backupSystemData: function (callback) {
                    // @ts-ignore TS(7006): Parameter 'col' implicitly has an 'any' type.
                    async.eachSeries(cols.backupList, function (col, callback) {
                        restoreTask(col, callback);
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    }, function (err) {
                        callback();
                    });
                },
                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                backupPublicData: function (callback) {
                    // @ts-ignore TS(7006): Parameter 'col' implicitly has an 'any' type.
                    async.eachSeries(cols.privateBackupList, function (col, callback) {
                        restoreTask(col, callback);
                    // @ts-ignore TS(7006): Parameter 'err' implicitly has an 'any' type.
                    }, function (err) {
                        callback();
                    });
                },
                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                backupPrivateData: function (callback) {
                    callback();
                },
                // @ts-ignore TS(7006): Parameter 'callback' implicitly has an 'any' type.
                resetCache: function (callback) {
                    flowUtils.resetCache(req);
                    callback();
                }
            }, function () {
                // @ts-ignore TS(2339): Property 'done' does not exist on type '{}'.
                model.done = true;
                res.render(templates.install, model);
            });
        };

        if (req.isAuthenticated()) {
            if (req.user.canPlayRoleOf('admin')) {
                // @ts-ignore TS(2339): Property 'showRestore' does not exist on type '{}'... Remove this comment to see the full error message
                model.showRestore = true;
                next();
            } else {
                // User won't be allowed.
                return res.redirect('/');
            }
        } else {
            const result = await db.Admin.findOne({});
            if (!result) {
                // No data, allow the user to restore.
                // @ts-ignore TS(2339): Property 'showRestore' does not exist on type '{}'... Remove this comment to see the full error message
                model.showRestore = true;
                next();
            } else {
                requestLogin(req, res);
            }
        }
    });
};
