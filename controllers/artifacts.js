'use strict';

var mongoose    = require('mongoose'),
    async       = require('async'),
    path        = require('path'),
    fs          = require('fs'),
    imagemagick = require('imagemagick'),
    mv          = require('mv'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

function GET_entry(req, res) {
    var model = {};
    flowUtils.ensureEntryIdParam(req, 'artifact');
    var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
    flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
        ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
        async.parallel({
            issues: function (callback) {
                // Top Issues
                flowUtils.getTopIssues(ownerQuery, model, req, callback);
            },
            opinions: function (callback) {
                var query = { parentId: null, ownerId: req.query.artifact, ownerType: constants.OBJECT_TYPES.artifact, 'screening.status': constants.SCREENING_STATUS.status1.code };
                flowUtils.getTopOpinions(query, model, req, callback);
            }
        }, function (err, results) {
            flowUtils.setModelOwnerEntry(req, model);
            res.render(templates.wiki.artifacts.entry, model);
        });
    });
}

function GET_index(req, res) {
    var model = {};
    if(req.query.topic) {
        flowUtils.setScreeningModel(req, model);
        flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
            var query = req.query.artifact ?
                { parentId: model.artifact._id } :
                { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
            query['screening.status'] = model.screening.status;
            db.Artifact
                .find(query)
                .sort({ title: 1 })
                //.lean()
                .exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                            result.setThumbnailPath(req.params.username);
                        });
                        model.artifacts = results;
                        flowUtils.setModelOwnerEntry(req, model);

                        // screening and children count
                        flowUtils.setScreeningModelCount(model, model.entry.childrenCount.artifacts);
                        res.render(templates.wiki.artifacts.index, model);
                    });
            });
        });
    } else {
        // Top Artifacts
        var query = { ownerType: constants.OBJECT_TYPES.topic, private: false, 'screening.status': constants.SCREENING_STATUS.status1.code };
        db.Artifact
            .find(query)
            .sort({editDate: -1})
            .limit(25)
            .lean()
            .exec(function (err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        result.topic = {
                            _id: result.ownerId
                        };
                        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
                    });
                    model.artifacts = results;
                    flowUtils.setModelContext(req, model);
                    res.render(templates.wiki.artifacts.index, model);
                });
            });
    }
}

function GET_create(req, res) {
    var model = {};
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function () {
        flowUtils.setModelContext(req, model);
        res.render(templates.wiki.artifacts.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.artifact || new mongoose.Types.ObjectId() };
    db.Artifact.findOne(query, function (err, result) {
        var inlineFile, updatedEntity;
        var oldFilePath, oldThumbnailPath;

        var dateNow = Date.now();
        var entity = result ? result : {};
        entity.title = req.body.title;
        entity.content = req.body.content;
        entity.contentPreview = flowUtils.createContentPreview(req.body.content);
        entity.source = req.body.source;
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if (!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
            flowUtils.initScreeningStatus(req, entity);
        }
        entity.private = req.params.username ? true : false;
        if (!entity.ownerId) {
            entity.ownerId = req.query.topic;
            entity.ownerType = constants.OBJECT_TYPES.topic;
        }

        if (req.files.inlineFile.name && req.files.inlineFile.size > 0) {
            if(result) {
                oldFilePath = entity.getFilePath(req.params.username);
                oldThumbnailPath = entity.getThumbnailPath(req.params.username);
            }

            inlineFile = req.files.inlineFile;
            entity.file = {
                name: inlineFile.name,
                size: inlineFile.size,
                type: inlineFile.type,
                lastModifiedDate: inlineFile.lastModifiedDate
            };
        }

        async.series({
            syncCategoryId: function (callback) {
                flowUtils.syncCategoryId(entity, {entryType: constants.OBJECT_TYPES.artifact}, callback);
            },
            update: function (callback) {
                db.Artifact.findOneAndUpdate(query, entity, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }, function (err, updated) {
                    updatedEntity = updated;
                    callback();
                });
            },
            moveFile: function (callback) {
                if(inlineFile) {
                    // Create directory if not exists
                    var artifactFolderAbs = path.join(__dirname, '/../public', updatedEntity.getFolder(req.params.username));
                    if (!fs.existsSync(artifactFolderAbs)){
                        fs.mkdirSync(artifactFolderAbs);
                    }

                    var filePath = updatedEntity.getFilePath(req.params.username);
                    var thumbnailPath = updatedEntity.getThumbnailPath(req.params.username);

                    // Delete old file if exists and different filename
                    if(result) {
                        if (oldFilePath && oldFilePath != filePath) {
                            var oldFilePathAbs = path.join(__dirname, '/../public', oldFilePath);
                            var oldThumbnailPathAbs = path.join(__dirname, '/../public', oldThumbnailPath);
                            if(fs.existsSync(oldFilePathAbs)) {
                                fs.unlinkSync(oldFilePathAbs);
                            }
                            if (oldThumbnailPath && fs.existsSync(oldThumbnailPathAbs)) {
                                fs.unlinkSync(oldThumbnailPathAbs);
                            }
                        }
                    }

                    var newPathAbs = path.join(__dirname, '/../public', filePath);
                    // replaced fs.rename() due to error "EXDEV: cross-device link not permitted"
                    mv(inlineFile.path, newPathAbs, function (err) {
                        if (err) {
                            console.log('An error has occurred moving the file: ' + inlineFile.path + '\n' + err);
                            return callback();
                        }

                        if(updatedEntity.isImage()) {
                            // Identify image properties
                            imagemagick.identify(newPathAbs, function(err, features){
                                if (err) {
                                    console.log('An error has occurred identifying the file: ' + inlineFile.path + '\n' + err);
                                    return callback();
                                }

                                // save image attributes
                                if(!updatedEntity.extras) updatedEntity.extras = {};
                                updatedEntity.extras.details = {
                                    format: features.format,
                                    width: features.width,
                                    height: features.height
                                };

                                // create a thumbnail that fits within 500x500
                                var thumbnailWidth = features.width > 500 ? 500 : features.width;
                                var thumbnailPathAbs = path.join(__dirname, '/../public', thumbnailPath);
                                imagemagick.resize({
                                    srcPath: newPathAbs,
                                    dstPath: thumbnailPathAbs,
                                    width: thumbnailWidth
                                }, function (err, stdout, stderr) {
                                    if (err) {
                                        console.log('An error has occurred resizing the file: ' + newPathAbs + '\n' + err);
                                    }
                                    callback();
                                });
                            });
                        } else {
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            },
            updateExtras: function (callback) {
                if(inlineFile && updatedEntity.isImage()) {
                    db.Artifact.findOneAndUpdate(query, updatedEntity, {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }, function (err, updated) {
                        updatedEntity = updated;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function () {
            var updateRedirect = function () {
                var model = {};
                flowUtils.setModelContext(req, model);
                var url = model.wikiBaseUrl + paths.wiki.artifacts.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                res.redirect(url);
                //res.end({});
            };
            if (!result) { // if new entry, update parent children count
                flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.artifact, function () {
                    updateRedirect();
                });
            } else {
                updateRedirect();
            }
        });
    });
}

module.exports = function (router) {

    /* Artifacts */

    router.get('/', function (req, res) {
        GET_index(req, res);
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        GET_entry(req, res);
    });

    router.get('/create', function (req, res) {
        GET_create(req, res);
    });

    router.post('/create', function (req, res) {
        POST_create(req, res);
    });
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;