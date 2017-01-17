'use strict';

var backup      = require('mongodb-backup'),
    fs          = require('fs'),
    path        = require("path"),
    async       = require('async'),
    Git         = require("nodegit"),
    templates   = require('../models/templates'),
    config      = require('../config/config'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models;

var cols = config.mongodb.collections;

module.exports = function (router) {

    router.get('/db-backup', function (req, res) {
        var model = {};
        model.dirname = flowUtils.getBackupDir();
        if(config.mongodb.gitBackup) {
            model.gitBackup = true;
        }
        res.render(templates.admin.mongoBackup, model);
    });

    router.post('/db-backup', function (req, res) {
        var model = {};
        //console.info('action: ', req.body.buttonAction);
        var action = req.body.buttonAction;
        model.action = action;
        model.dirname = flowUtils.getBackupDir();
        if(config.mongodb.gitBackup) {
            model.gitBackup = true;
        }

        if(action === 'backup') {
            backup({
                uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
                root: flowUtils.getBackupDir(), // write files into this dir
                collections: cols.backupList, // save this collection only
                parser: 'json',
                query: { private: false }
            });
            res.render(templates.admin.mongoBackup, model);
        } else if(action === 'fix') {
            // this will set the default values in every doc
            async.parallel({
                topics: function (callback) {
                    db.Topic.find({}).exec(function(err, results) {
                        async.eachSeries(results, function (result, callback) {
                            db.Topic.update({ _id: result._id }, result, {}, function () {
                                callback();
                            });
                            //flowUtils.updateChildrenCount(result._id, constants.OBJECT_TYPES.topic, null, callback);
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
                            //flowUtils.updateChildrenCount(result._id, constants.OBJECT_TYPES.argument, null, callback);
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
                            //flowUtils.updateChildrenCount(result._id, constants.OBJECT_TYPES.question, null, callback);
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
                }
            }, function (err, results) {
                res.render(templates.admin.mongoBackup, model);
            });
        } else if(action === 'restore') {
            var dir = flowUtils.getBackupDir() + '/wikitruth';
            console.log(cols.backupList);

            async.eachSeries(cols.backupList, function (col, callback) {
                var coldir = dir + '/' + col;
                var jsons = fs.readdirSync(coldir);
                console.log('restore:', col);
                console.log(jsons);
                if (cols.modelMapping[col]) {
                    var collection = db[cols.modelMapping[col]];
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
        } else if(action === 'push') {
            var pathToRepo = path.resolve(flowUtils.getBackupDir());
            var gitConfig = config.mongodb.gitBackup;
            var repo;
            var index;
            var oid;

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
                    // this file is in the root of the directory and doesn't need a full path
                    //return index.addByPath(fileName);
                    return index.addAll('wikitruth');
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
                    return Git.Remote.lookup(repo, 'origin');
                })
                .then(function(remote) {
                    // Use remote
                    //var firstPass = true;
                    return remote.push(
                        ["refs/heads/master:refs/heads/master"], {
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
                                    return Git.Cred.sshKeyFromAgent(userName);
                                    */
                                    console.log('Git is asking for username/password:', url, userName);
                                }
                            }
                        }
                    );
                })
                .done(function() {
                    console.log('Git push done!');
                });
                /*.catch(function (reasonForFailure) {
                    // failure is handled here
                    console.error("Git error: ", reasonForFailure);
                });*/

            res.render(templates.admin.mongoBackup, model);
        }
    });
};
