'use strict';

var backup          = require('mongodb-backup'),
    fs              = require('fs'),
    path            = require("path"),
    async           = require('async'),
    //Git             = require("nodegit"),
    templates       = require('../models/templates'),
    config          = require('../config/config'),
    //constants       = require('../models/constants'),
    flowUtils       = require('../utils/flowUtils'),
    db              = require('../app').db.models;

var collectionsConfig = config.mongodb.collections,
    privateDirName = 'users';

/**
 * make dir
 *
 * @function makeDir
 * @param {String} path - path of dir
 * @param {Function} next - callback
 */
function makeDir(path, next) {
    return fs.stat(path, function(err, stats) {
        if (err && err.code === 'ENOENT') {
            //logger('make dir at ' + path);
            return fs.mkdir(path, function(err) {
                return next(err, path);
            });
        } else if (stats && stats.isDirectory() === false) {
            //logger('unlink file at ' + path);
            return fs.unlink(path, function() {
                //logger('make dir at ' + path);
                return fs.mkdir(path, function(err) {
                    return next(err, path);
                });
            });
        }
        return next(null, path);
    });
}

function performGitBackup(backupDir, pathspec, gitConfig, callback) {
    var pathToRepo = path.resolve(backupDir);
    var repo, index, oid;
    var result = {
        nothingToPush: false
    };
    if(!gitConfig.branch) {
        gitConfig.branch = 'master';
    }
    if(!gitConfig.remote) {
        gitConfig.remote = 'origin';
    }

    Git.Repository.open(pathToRepo)
        .then(function (repoResult) {
            // Inside of this function we have an open repo
            repo = repoResult;
        })
        .then(function() {
            return repo.refreshIndex();
        })
        .then(function(indexResult) {
            index = indexResult;
        })
        .then(function() {
            return Git.Diff.indexToWorkdir(repo, null, { flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS, pathspec: pathspec })
                .then(function (diff) {
                    return diff.patches()
                        .then(function(patches) {
                            //console.log('diff.patches(): ' + patches.length);
                            if(patches.length > 0) {
                                // this file is in the root of the directory and doesn't need a full path
                                //return index.addByPath(fileName);
                                return index.addAll(pathspec);
                            } else {
                                result.nothingToPush = true;
                                // Abort the operation
                                throw new Error("Nothing new to commit and push.");
                            }
                            /*patches.forEach((patch) => {
                                patch.hunks().then((hunks) => {
                                    console.log('diff.hunks(): ' + hunks.length);
                                    hunks.forEach((hunk) => {
                                        hunk.lines().then((lines) => {
                                            console.log("diff", patch.oldFile().path(), patch.newFile().path());
                                            console.log(hunk.header().trim());
                                            lines.forEach((line) => {
                                                console.log(String.fromCharCode(line.origin()) + line.content().trim());
                                            });
                                        });
                                    });
                                });
                            });*/
                        });
                });
        })
        .then(function() {
            // this will write both files to the index
            return index.write();
        })
        .then(function() {
            return index.writeTree();
        })
        .then(function(oidResult) {
            oid = oidResult;
            return Git.Reference.nameToId(repo, "HEAD");
        })
        .then(function(head) {
            return repo.getCommit(head);
        })
        .then(function(parent) {
            var author = Git.Signature.now(gitConfig.signature.name, gitConfig.signature.email);
            var committer = author;
            return repo.createCommit("HEAD", author, committer, "db changes backup " + (new Date()).toISOString(), oid, [parent]);
        })
        .then(function(commitId) {
            console.log("New Commit: ", commitId);
            return Git.Remote.lookup(repo, gitConfig.remote);
        })
        .then(function(remote) {
            // Use remote
            //var firstPass = true;
            return remote.push(
                ["refs/heads/" + gitConfig.branch + ":refs/heads/" + gitConfig.branch], {
                    callbacks: {
                        credentials: function(url, userName) {
                            /*if (firstPass) {
                                firstPass = false;
                                if (url.indexOf("https") === -1) {
                                    return Git.Cred.sshKeyFromAgent('XYZ');
                                } else {
                                    return Git.Cred.userpassPlaintextNew('XYZ', "XYZ");
                                }
                            } else {
                                return Git.Cred.defaultNew();
                            }
                            return Git.Cred.sshKeyFromAgent(userName);*/
                            console.log('Git is asking for username/password:', url, userName);
                        }
                    }
                }
            );
        })
        .catch(function (err) {
            // failure is handled here
            console.log('Promise catch: ' + err);
            result.err = err;
        })
        .done(function() {
            console.log('Git push done!');
            callback(null, result);
        });
}

module.exports = function (router) {

    router.get('/db-backup', function (req, res) {
        var model = {};
        model.dirname = flowUtils.getBackupDir();
        model.privateDirName = flowUtils.getBackupDir(true);
        if(config.mongodb.gitBackup) {
            model.gitBackup = true;
        }
        res.render(templates.admin.mongoBackup, model);
    });

    router.post('/db-backup', function (req, res) {
        var action = req.body.buttonAction;
        var backupDir = flowUtils.getBackupDir();
        var privateBackupDir = flowUtils.getBackupDir(true);
        privateBackupDir += '/' + privateDirName;

        var model = {};
        model.action = action;
        model.dirname = backupDir;
        model.privateDirName = privateBackupDir;
        if(config.mongodb.gitBackup) {
            model.gitBackup = true;
        }

        if(action === 'backup') {
            async.series({
                createPublicDir: function (callback) {
                    makeDir(backupDir, function () { callback(); });
                },
                createPrivateDir: function (callback) {
                    makeDir(privateBackupDir, function () { callback(); });
                },
                backupSystemData: function (callback) {
                    backup({
                        uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                        root: backupDir, // write files into this dir
                        collections: collectionsConfig.backupList, // save this collection only
                        parser: 'json'
                    });
                    callback();
                },
                backupPublicData: function (callback) {
                    backup({
                        uri: config.mongodb.uri,
                        root: backupDir,
                        collections: collectionsConfig.privateBackupList,
                        parser: 'json',
                        query: { private: false }
                    });
                    callback();
                },
                backupPrivateData: function (callback) {
                    db.User
                        .find({})
                        .sort({username: 1})
                        .lean()
                        .exec(function (err, users) {
                            async.eachSeries(users, function (user, callback) {
                                console.log('backing up for user ' + user.username);
                                backup({
                                    uri: config.mongodb.uri,
                                    root: privateBackupDir + '/' + user.username,
                                    collections: collectionsConfig.privateBackupList,
                                    parser: 'json',
                                    query: { private: true, createUserId: user._id }
                                });
                                callback();
                            }, function (err) {
                                callback();
                            });
                    });
                }
            }, function (){
                res.render(templates.admin.mongoBackup, model);
            });

        } else if(action === 'fix') {
            /*
            async.series({
                updateOwner: function (callback) {
                    db.ArgumentLink.find({ ownerId: null }).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            result.ownerId = result.parentId;
                            result.ownerType = constants.OBJECT_TYPES.argument;
                            db.ArgumentLink.update({ _id: result._id }, result, {}, callback);
                        }, function (err) {
                            callback();
                        });
                    });
                }
            }, function (err, results) {
                async.parallel({
                    updateCategory: function (callback) {
                        db.Topic.find({ parentId: null }).exec((err, results) => {
                            async.eachSeries(results, function (result, callback) {
                                flowUtils.syncCategoryId(result, { entryType: constants.OBJECT_TYPES.topic }, function () {
                                    db.Topic.update({_id: result._id}, result, {}, function () {
                                        flowUtils.syncChildren(result, { entryType: constants.OBJECT_TYPES.topic }, callback);
                                    });
                                });
                            }, function (err) {
                                callback();
                            });
                        });
                    }
                }, function (err, results) {
                    res.render(templates.admin.mongoBackup, model);
                });
            });
            */

            // this will set the default values in every doc
            async.parallel({
                topics: function (callback) {
                    db.Topic.find({}).exec((err, results) => {
                        async.eachSeries(results, function (result, callback) {
                            db.Topic.update({_id: result._id}, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                topicLinks: function (callback) {
                    db.TopicLink.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.TopicLink.update({ _id: result._id }, result, {}, callback);
                        }, function (err) {
                            callback();
                        });
                    });
                },
                arguments: function (callback) {
                    db.Argument.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Argument.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                argumentLinks: function (callback) {
                    db.ArgumentLink.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.ArgumentLink.update({ _id: result._id }, result, {}, callback);
                        }, function (err) {
                            callback();
                        });
                    });
                },
                questions: function (callback) {
                    db.Question.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Question.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                answers: function (callback) {
                    db.Answer.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Answer.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                issues: function (callback) {
                    db.Issue.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Issue.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                opinions: function (callback) {
                    db.Opinion.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Opinion.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                artifacts: function (callback) {
                    db.Artifact.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Artifact.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                        }, function (err) {
                            callback();
                        });
                    });
                },
                users: function (callback) {
                    db.User.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.User.update({ _id: result._id }, result, {}, callback);
                        }, function (err) {
                            callback();
                        });
                    });
                }
            }, function (err, results) {
                res.render(templates.admin.mongoBackup, model);
            });
        } else if(action === 'restore') {
            var dir = backupDir + '/' + config.mongodb.dbname;
            async.series({
                restorePublicData: function (callback) {
                    async.eachSeries( collectionsConfig.backupList.concat(collectionsConfig.privateBackupList), function (collectionName, callback) {
                        // each collection
                        var collectionDir = dir + '/' + collectionName;
                        if (fs.existsSync(collectionDir)){
                            var jsons = fs.readdirSync(collectionDir);
                            var modelName = collectionsConfig.modelMapping[collectionName];
                            if (modelName) {
                                var collection = db[modelName];
                                if (collection) {
                                    collection.remove({}, function (err) { // truncate collection before restore
                                        async.eachSeries(jsons, function (json, callback) {
                                            // each entry
                                            var file = collectionDir + '/' + json;
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
                        } else {
                            callback();
                        }
                    }, function (err) {
                        callback();
                    });
                },
                restorePrivateData: function (callback) {
                    db.User
                        .find({})
                        .sort({username: 1})
                        .lean()
                        .exec(function (err, users) {
                            async.eachSeries(users, function (user, callback) {
                                // each user
                                var privateUserBackupDir = privateBackupDir + '/' + user.username + '/' + config.mongodb.dbname;
                                async.eachSeries( collectionsConfig.privateBackupList, function (collectionName, callback) {
                                    // each collection
                                    var collectionDir = privateUserBackupDir + '/' + collectionName;
                                    if(fs.existsSync(collectionDir)) {
                                        var jsons = fs.readdirSync(collectionDir);
                                        var modelName = collectionsConfig.modelMapping[collectionName];
                                        if (modelName && jsons.length > 0) {
                                            var collection = db[modelName];
                                            if (collection) {
                                                collection.remove({private: true, createUserId: user._id }, function (err) { // truncate collection before restore
                                                    async.eachSeries(jsons, function (json, callback) {
                                                        // each entry
                                                        var file = collectionDir + '/' + json;
                                                        //console.log('file: ' + file);
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
                                    } else {
                                        callback();
                                    }
                                }, function (err) {
                                    callback();
                                });
                            }, function (err) {
                                callback();
                            });
                    });
                }
            }, function (){
                res.render(templates.admin.mongoBackup, model);
            });
            /*restore({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: getBackupDir() + '/wikitruth', // write files into this dir
                //dropCollections: [ 'topics', 'arguments' ], // save this collection only
                parser: 'json',
                drop: true
            });*/
        } else if(action === 'push') {
            // FIXME: results are not returned on time
            var render = function () {
                res.render(templates.admin.mongoBackup, model);
            };
            performGitBackup(backupDir, config.mongodb.dbname, config.mongodb.gitBackup, function (err, result) {
                model.gitBackup = result;
                if(config.mongodb.privateGitBackup) {
                    performGitBackup(privateBackupDir, privateDirName, config.mongodb.privateGitBackup, function (err, result) {
                        model.privateGitBackup = result;
                        render();
                    });
                } else {
                    render();
                }
            });
        } else if (action === 'recache') {
            flowUtils.resetCache(req);
            res.render(templates.admin.mongoBackup, model);
        }
    });
};
