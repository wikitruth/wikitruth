// @ts-nocheck
'use strict';

let backup = require('mongodb-backup-fixed'),
  fs = require('fs'),
  path = require('path'),
  async = require('async'),
  // Git             = require("nodegit"),
  templates = require('../models/templates'),
  config = require('../config/config'),
  //constants       = require('../models/constants'),
  flowUtils = require('../utils/flowUtils'),
  db = require('../app').db.models;

let collectionsConfig = config.mongodb.collections,
  privateDirName = 'users';

/**
 * make dir
 *
 * @function makeDir
 * @param {String} path - path of dir
 */
function makeDir(path) {
  try {
    const stats = fs.statSync(path);
    if (stats && stats.isDirectory() === false) {
      //logger('unlink file at ' + path);
      fs.unlinkSync(path);
      //logger('make dir at ' + path);
      return fs.mkdirSync(path);
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      //logger('make dir at ' + path);
      return fs.mkdirSync(path);
    }
  }
  return path;
}

function performGitBackup(backupDir, pathspec, gitConfig) {
  let pathToRepo = path.resolve(backupDir);
  let repo, index, oid;
  let result = {
    nothingToPush: false,
  };
  if (!gitConfig.branch) {
    gitConfig.branch = 'master';
  }
  if (!gitConfig.remote) {
    gitConfig.remote = 'origin';
  }

  // Git.Repository.open(pathToRepo)
  //     .then(function (repoResult) {
  //         // Inside of this function we have an open repo
  //         repo = repoResult;
  //     })
  //     .then(function() {
  //         return repo.refreshIndex();
  //     })
  //     .then(function(indexResult) {
  //         index = indexResult;
  //     })
  //     .then(function() {
  //         return Git.Diff.indexToWorkdir(repo, null, { flags: Git.Diff.OPTION.SHOW_UNTRACKED_CONTENT | Git.Diff.OPTION.RECURSE_UNTRACKED_DIRS, pathspec: pathspec })
  //             .then(function (diff) {
  //                 return diff.patches()
  //                     .then(function(patches) {
  //                         //console.log('diff.patches(): ' + patches.length);
  //                         if(patches.length > 0) {
  //                             // this file is in the root of the directory and doesn't need a full path
  //                             //return index.addByPath(fileName);
  //                             return index.addAll(pathspec);
  //                         } else {
  //                             result.nothingToPush = true;
  //                             // Abort the operation
  //                             throw new Error("Nothing new to commit and push.");
  //                         }
  //                         /*patches.forEach((patch) => {
  //                             patch.hunks().then((hunks) => {
  //                                 console.log('diff.hunks(): ' + hunks.length);
  //                                 hunks.forEach((hunk) => {
  //                                     hunk.lines().then((lines) => {
  //                                         console.log("diff", patch.oldFile().path(), patch.newFile().path());
  //                                         console.log(hunk.header().trim());
  //                                         lines.forEach((line) => {
  //                                             console.log(String.fromCharCode(line.origin()) + line.content().trim());
  //                                         });
  //                                     });
  //                                 });
  //                             });
  //                         });*/
  //                     });
  //             });
  //     })
  //     .then(function() {
  //         // this will write both files to the index
  //         return index.write();
  //     })
  //     .then(function() {
  //         return index.writeTree();
  //     })
  //     .then(function(oidResult) {
  //         oid = oidResult;
  //         return Git.Reference.nameToId(repo, "HEAD");
  //     })
  //     .then(function(head) {
  //         return repo.getCommit(head);
  //     })
  //     .then(function(parent) {
  //         let author = Git.Signature.now(gitConfig.signature.name, gitConfig.signature.email);
  //         let committer = author;
  //         return repo.createCommit("HEAD", author, committer, "db changes backup " + (new Date()).toISOString(), oid, [parent]);
  //     })
  //     .then(function(commitId) {
  //         console.log("New Commit: ", commitId);
  //         return Git.Remote.lookup(repo, gitConfig.remote);
  //     })
  //     .then(function(remote) {
  //         // Use remote
  //         //let firstPass = true;
  //         return remote.push(
  //             ["refs/heads/" + gitConfig.branch + ":refs/heads/" + gitConfig.branch], {
  //                 callbacks: {
  //                     credentials: function(url, userName) {
  //                         /*if (firstPass) {
  //                             firstPass = false;
  //                             if (url.indexOf("https") === -1) {
  //                                 return Git.Cred.sshKeyFromAgent('XYZ');
  //                             } else {
  //                                 return Git.Cred.userpassPlaintextNew('XYZ', "XYZ");
  //                             }
  //                         } else {
  //                             return Git.Cred.defaultNew();
  //                         }
  //                         return Git.Cred.sshKeyFromAgent(userName);*/
  //                         console.log('Git is asking for username/password:', url, userName);
  //                     }
  //                 }
  //             }
  //         );
  //     })
  //     .catch(function (err) {
  //         // failure is handled here
  //         console.log('Promise catch: ' + err);
  //         result.err = err;
  //     })
  //     .done(function() {
  //         console.log('Git push done!');
  //         callback(null, result);
  //     });
}

module.exports = function(router) {

  router.get('/db-backup', function(req, res) {
    let model = {};
    model.dirname = flowUtils.getBackupDir();
    model.privateDirName = flowUtils.getBackupDir(true);
    if (config.mongodb.gitBackup) {
      model.gitBackup = true;
    }
    res.render(templates.admin.mongoBackup, model);
  });

  router.post('/db-backup', async function(req, res) {
    let action = req.body.buttonAction;
    let backupDir = flowUtils.getBackupDir();
    let privateBackupDir = flowUtils.getBackupDir(true);
    privateBackupDir += '/' + privateDirName;

    let model = {};
    model.action = action;
    model.dirname = backupDir;
    model.privateDirName = privateBackupDir;
    if (config.mongodb.gitBackup) {
      model.gitBackup = true;
    }

    if (action === 'backup') {
      await async.series({
        createPublicDir: function() {
          makeDir(backupDir);
        },
        createPrivateDir: function() {
          makeDir(privateBackupDir);
        },
        backupSystemData: function() {
          backup({
            uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
            root: backupDir, // write files into this dir
            collections: collectionsConfig.backupList, // save this collection only
            parser: 'json',
          });
        },
        backupPublicData: function() {
          backup({
            uri: config.mongodb.uri,
            root: backupDir,
            collections: collectionsConfig.privateBackupList,
            parser: 'json',
            query: { private: false },
          });
        },
        backupPrivateData: async function() {
          let users = await db.User
            .find({})
            .sort({ username: 1 })
            .lean();
          await async.eachSeries(users, function(user) {
            console.log('backing up for user ' + user.username);
            backup({
              uri: config.mongodb.uri,
              root: privateBackupDir + '/' + user.username,
              collections: collectionsConfig.privateBackupList,
              parser: 'json',
              query: { private: true, createUserId: user._id },
            });
          });
        },
      });
      res.render(templates.admin.mongoBackup, model);

    } else if (action === 'fix') {
      /*
      async.series({
          updateOwner: function () {
              db.ArgumentLink.find({ ownerId: null }).exec(function(err, results) {
                  async.eachSeries(results, function (result) {
                      result.ownerId = result.parentId;
                      result.ownerType = constants.OBJECT_TYPES.argument;
                      db.ArgumentLink.update({ _id: result._id }, result, {});
                  });
              });
          }
      }, function (err, results) {
          async.parallel({
              updateCategory: function () {
                  db.Topic.find({ parentId: null }).exec((err, results) => {
                      async.eachSeries(results, function (result) {
                          flowUtils.syncCategoryId(result, { entryType: constants.OBJECT_TYPES.topic }, function () {
                              db.Topic.update({_id: result._id}, result, {}, function () {
                                  flowUtils.syncChildren(result, { entryType: constants.OBJECT_TYPES.topic });
                              });
                          });
                      });
                  });
              }
          }, function (err, results) {
              res.render(templates.admin.mongoBackup, model);
          });
      });
      */

      // this will set the default values in every doc
      await async.parallel({
        topics: async function() {
          let results = await db.Topic.find({});
          await async.eachSeries(results, async function(result) {
            await db.Topic.updateOne({ _id: result._id }, result, {});
          });
        },
        topicLinks: async function() {
          let results = await db.TopicLink.find({});
          await async.eachSeries(results, async function(result) {
            await db.TopicLink.updateOne({ _id: result._id }, result, {});
          });
        },
        arguments: async function() {
          let results = await db.Argument.find({});
          await async.eachSeries(results, async function(result) {
            await db.Argument.updateOne({ _id: result._id }, result, {});
          });
        },
        argumentLinks: async function() {
          let results = await db.ArgumentLink.find({});
          await async.eachSeries(results, async function(result) {
            await db.ArgumentLink.updateOne({ _id: result._id }, result, {});
          });
        },
        questions: async function() {
          let results = await db.Question.find({});
          await async.eachSeries(results, async function(result) {
            await db.Question.updateOne({ _id: result._id }, result, {});
          });
        },
        answers: async function() {
          let results = await db.Answer.find({});
          await async.eachSeries(results, async function(result) {
            await db.Answer.updateOne({ _id: result._id }, result, {});
          });
        },
        issues: async function() {
          const results = await db.Issue.find({});
          await async.eachSeries(results, async function(result) {
            await db.Issue.updateOne({ _id: result._id }, result, {});
          });
        },
        opinions: async function() {
          const results = await db.Opinion.find({});
          await async.eachSeries(results, async function(result) {
            await db.Opinion.updateOne({ _id: result._id }, result, {});
          });
        },
        artifacts: async function() {
          const results = await db.Artifact.find({});
          await async.eachSeries(results, async function(result) {
            await db.Artifact.updateOne({ _id: result._id }, result, {});
          });
        },
        users: async function() {
          const results = await db.User.find({});
          await async.eachSeries(results, async function(result) {
            await db.User.updateOne({ _id: result._id }, result, {});
          });
        },
      });
      res.render(templates.admin.mongoBackup, model);
    } else if (action === 'restore') {
      const dir = backupDir + '/' + config.mongodb.dbname;
      await async.series({
        restorePublicData: async function() {
          await async.eachSeries(collectionsConfig.backupList.concat(collectionsConfig.privateBackupList), async function(collectionName) {
            // each collection
            const collectionDir = dir + '/' + collectionName;
            if (fs.existsSync(collectionDir)) {
              const jsons = fs.readdirSync(collectionDir);
              const modelName = collectionsConfig.modelMapping[collectionName];
              if (modelName) {
                const collection = db[modelName];
                if (collection) {
                  await collection.deleteMany({});
                  await async.eachSeries(jsons, async function(json) {
                    // each entry
                    const file = collectionDir + '/' + json;
                    const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
                    await collection.create(obj);
                  });
                }
              }
            }
          });
        },
        restorePrivateData: async function() {
          const users = await db.User
            .find({})
            .sort({ username: 1 })
            .lean();
          await async.eachSeries(users, async function(user) {
            // each user
            const privateUserBackupDir = privateBackupDir + '/' + user.username + '/' + config.mongodb.dbname;
            await async.eachSeries(collectionsConfig.privateBackupList, async function(collectionName) {
              // each collection
              const collectionDir = privateUserBackupDir + '/' + collectionName;
              if (fs.existsSync(collectionDir)) {
                const jsons = fs.readdirSync(collectionDir);
                const modelName = collectionsConfig.modelMapping[collectionName];
                if (modelName && jsons.length > 0) {
                  const collection = db[modelName];
                  if (collection) {
                    await collection.deleteMany({
                      private: true,
                      createUserId: user._id,
                    });
                    await async.eachSeries(jsons, async function(json) {
                      // each entry
                      const file = collectionDir + '/' + json;
                      //console.log('file: ' + file);
                      const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
                      await collection.create(obj);
                    });
                  }
                }
              }
            });
          });
        },
      });
      res.render(templates.admin.mongoBackup, model);
      /*restore({
          uri: config.mongodb.uri, // mongodb://<dbuser>:<dbpassword>@<dbdomain>.mongolab.com:<dbport>/<dbdatabase>
          root: getBackupDir() + '/wikitruth', // write files into this dir
          //dropCollections: [ 'topics', 'arguments' ], // save this collection only
          parser: 'json',
          drop: true
      });*/
    } else if (action === 'push') {
      // FIXME: results are not returned on time
      let result = await performGitBackup(backupDir, config.mongodb.dbname, config.mongodb.gitBackup);
      model.gitBackup = result;
      if (config.mongodb.privateGitBackup) {
        result = await performGitBackup(privateBackupDir, privateDirName, config.mongodb.privateGitBackup);
        model.privateGitBackup = result;
      }
      res.render(templates.admin.mongoBackup, model);
    } else if (action === 'recache') {
      flowUtils.resetCache(req);
      res.render(templates.admin.mongoBackup, model);
    }
  });
};
