'use strict';

let mongoose = require('mongoose'),
  async = require('async'),
  path = require('path'),
  fs = require('fs'),
  imagemagick = require('imagemagick'),
  mv = require('mv'),
  utils = require('../utils/utils'),
  flowUtils = require('../utils/flowUtils'),
  paths = require('../models/paths'),
  templates = require('../models/templates'),
  constants = require('../models/constants'),
  db = require('../app').db.models;

module.exports = function(router) {
  /* Artifacts */

  router.get('/', async function(req, res) {
    await GET_index(req, res);
  });

  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await GET_entry(req, res);
  });

  router.get('/create', async function(req, res) {
    await GET_create(req, res);
  });

  router.post('/create', async function(req, res) {
    await POST_create(req, res);
  });
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;

async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'artifact');
  let ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  ownerQuery['screening.status'] = constants.SCREENING_STATUS.status1.code;
  await async.parallel({
    issues: async function() {
      await flowUtils.getTopIssues(ownerQuery, model, req);
    },
    opinions: async function() {
      let query = {
        parentId: null,
        ownerId: req.query.artifact,
        ownerType: constants.OBJECT_TYPES.artifact,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.artifacts.entry, model);
}

async function GET_index(req, res) {
  let model = {};
  if (req.query.topic) {
    flowUtils.setScreeningModel(req, model);
    await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
    let query = req.query.artifact
      ? { parentId: model.artifact._id }
      : { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
    query['screening.status'] = model.screening.status;
    const results = await db.Artifact.find(query)
      .sort({ title: 1 });
    //.lean()
    await flowUtils.setEditorsUsername(results);
    results.forEach(result => {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      result.setThumbnailPath(req.params.username);
    });
    model.artifacts = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    flowUtils.setScreeningModelCount(model, model.entry.childrenCount.artifacts);
    res.render(templates.wiki.artifacts.index, model);
  } else {
    // Top Artifacts
    let query = {
      ownerType: constants.OBJECT_TYPES.topic,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    };
    const results = await db.Artifact.find(query)
      .sort({ editDate: -1 })
      .limit(25)
      .lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(function(result) {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
    });
    model.artifacts = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.artifacts.index, model);
  }
}

async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.artifacts.create, model);
}

async function POST_create(req, res) {
  let query = { _id: req.query.artifact || new mongoose.Types.ObjectId() };
  const result = await db.Artifact.findOne(query);
  let inlineFile, updatedEntity;
  let oldFilePath, oldThumbnailPath;
  let dateNow = Date.now();
  let entity = result ? result : {};

  entity.title = req.body.title;
  entity.content = flowUtils.getEditorContent(req.body.content);
  entity.source = flowUtils.getEditorContent(req.body.source);

  // evaluated properties
  entity.contentPreview = flowUtils.createContentPreview(entity.content);
  entity.friendlyUrl = utils.urlify(entity.title);

  entity.editUserId = req.user.id;
  entity.editDate = dateNow;
  if (!result) {
    entity.createUserId = req.user.id;
    entity.createDate = dateNow;
    flowUtils.initScreeningStatus(req, entity);
  }
  if (!entity.ownerId) {
    entity.ownerId = req.query.topic;
    entity.ownerType = constants.OBJECT_TYPES.topic;
  }

  if (req.files.inlineFile.name && req.files.inlineFile.size > 0) {
    if (result) {
      oldFilePath = entity.getFilePath(req.params.username);
      oldThumbnailPath = entity.getThumbnailPath(req.params.username);
    }

    inlineFile = req.files.inlineFile;
    entity.file = {
      name: inlineFile.name,
      size: inlineFile.size,
      type: inlineFile.type,
      lastModifiedDate: inlineFile.lastModifiedDate,
    };
  }

  await async.series({
    syncCategoryId: async () => {
      await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.artifact });
    },
    update: async () => {
      updatedEntity = await db.Artifact.findOneAndUpdate(query, entity, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    },
    moveFile: async () => {
      if (inlineFile) {
        // Create directory if not exists
        let artifactFolderAbs = path.join(
          __dirname,
          '/../public',
          updatedEntity.getFolder(req.params.username)
        );
        if (!fs.existsSync(artifactFolderAbs)) {
          fs.mkdirSync(artifactFolderAbs);
        }

        let filePath = updatedEntity.getFilePath(req.params.username);
        let thumbnailPath = updatedEntity.getThumbnailPath(req.params.username);

        // Delete old file if exists and different filename
        if (result) {
          if (oldFilePath && oldFilePath !== filePath) {
            let oldFilePathAbs = path.join(__dirname, '/../public', oldFilePath);
            let oldThumbnailPathAbs = path.join(__dirname, '/../public', oldThumbnailPath);
            if (fs.existsSync(oldFilePathAbs)) {
              fs.unlinkSync(oldFilePathAbs);
            }
            if (oldThumbnailPath && fs.existsSync(oldThumbnailPathAbs)) {
              fs.unlinkSync(oldThumbnailPathAbs);
            }
          }
        }

        let newPathAbs = path.join(__dirname, '/../public', filePath);
        // INFO: replaced fs.rename() due to error "EXDEV: cross-device link not permitted"
        await mv(inlineFile.path, newPathAbs);
        if (updatedEntity.isImage()) {
          // Identify image properties
          const features = await imagemagick.identify(newPathAbs);
          // save image attributes
          if (!updatedEntity.extras) updatedEntity.extras = {};
          updatedEntity.extras.details = {
            format: features.format,
            width: features.width,
            height: features.height,
          };

          // create a thumbnail that fits within 500x500
          let thumbnailWidth = features.width > 500 ? 500 : features.width;
          let thumbnailPathAbs = path.join(__dirname, '/../public', thumbnailPath);
          await imagemagick.resize({
            srcPath: newPathAbs,
            dstPath: thumbnailPathAbs,
            width: thumbnailWidth,
          });
        }
      }
    },
    updateExtras: async () => {
      if (inlineFile && updatedEntity.isImage()) {
        // update new image details in entity's extras
        updatedEntity = await db.Artifact.findOneAndUpdate(query, updatedEntity, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        });
      }
    },
    updateChildrenCount: async () => {
      if (!result) {
        // if new entry, update parent children count
        await flowUtils.updateChildrenCount(
          entity.ownerId,
          entity.ownerType,
          constants.OBJECT_TYPES.artifact
        );
      }
    },
  });
  let model = {};
  flowUtils.setModelContext(req, res, model);
  let url =
    model.wikiBaseUrl +
    paths.wiki.artifacts.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
}
