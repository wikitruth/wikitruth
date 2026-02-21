// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let mongoose = require('mongoose'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  async = require('async'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'path'.
  path = require('path'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'fs'.
  fs = require('fs'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  imagemagick = require('imagemagick'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  mv = require('mv'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  utils = require('../utils/utils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  paths = require('../models/paths'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {
  /* Artifacts */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function(req, res) {
    await GET_index(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/create', async function(req, res) {
    await GET_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/create', async function(req, res) {
    await POST_create(req, res);
  });
};

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_entry = GET_entry;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_index = GET_index;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_create = GET_create;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.POST_create = POST_create;

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_index(req, res) {
  let model = {};
  if (req.query.topic) {
    flowUtils.setScreeningModel(req, model);
    await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
    let query = req.query.artifact
      // @ts-ignore TS(2339): Property 'artifact' does not exist on type '{}'.
      ? { parentId: model.artifact._id }
      // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
      : { ownerId: model.topic._id, ownerType: constants.OBJECT_TYPES.topic };
    // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    query['screening.status'] = model.screening.status;
    const results = await db.Artifact.find(query)
      .sort({ title: 1 });
    //.lean()
    await flowUtils.setEditorsUsername(results);
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(result => {
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      result.setThumbnailPath(req.params.username);
    });
    // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
    model.artifacts = results;
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
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
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function(result) {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
    });
    // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
    model.artifacts = results;
    flowUtils.setModelContext(req, res, model);
    res.render(templates.wiki.artifacts.index, model);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_create(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.artifacts.create, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function POST_create(req, res) {
  let query = { _id: req.query.artifact || new mongoose.Types.ObjectId() };
  const result = await db.Artifact.findOne(query);
  // @ts-ignore TS(7034): Variable 'inlineFile' implicitly has type 'any' in... Remove this comment to see the full error message
  let inlineFile, updatedEntity;
  // @ts-ignore TS(7034): Variable 'oldFilePath' implicitly has type 'any' i... Remove this comment to see the full error message
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
      // @ts-ignore TS(7005): Variable 'inlineFile' implicitly has an 'any' type... Remove this comment to see the full error message
      if (inlineFile) {
        // Create directory if not exists
        let artifactFolderAbs = path.join(
          // @ts-ignore TS(2304): Cannot find name '__dirname'.
          __dirname,
          '/../public',
          // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
          updatedEntity.getFolder(req.params.username)
        );
        if (!fs.existsSync(artifactFolderAbs)) {
          fs.mkdirSync(artifactFolderAbs);
        }

        // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
        let filePath = updatedEntity.getFilePath(req.params.username);
        // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
        let thumbnailPath = updatedEntity.getThumbnailPath(req.params.username);

        // Delete old file if exists and different filename
        if (result) {
          // @ts-ignore TS(7005): Variable 'oldFilePath' implicitly has an 'any' typ... Remove this comment to see the full error message
          if (oldFilePath && oldFilePath !== filePath) {
            // @ts-ignore TS(2304): Cannot find name '__dirname'.
            let oldFilePathAbs = path.join(__dirname, '/../public', oldFilePath);
            // @ts-ignore TS(2304): Cannot find name '__dirname'.
            let oldThumbnailPathAbs = path.join(__dirname, '/../public', oldThumbnailPath);
            if (fs.existsSync(oldFilePathAbs)) {
              fs.unlinkSync(oldFilePathAbs);
            }
            // @ts-ignore TS(7005): Variable 'oldThumbnailPath' implicitly has an 'any... Remove this comment to see the full error message
            if (oldThumbnailPath && fs.existsSync(oldThumbnailPathAbs)) {
              fs.unlinkSync(oldThumbnailPathAbs);
            }
          }
        }

        // @ts-ignore TS(2304): Cannot find name '__dirname'.
        let newPathAbs = path.join(__dirname, '/../public', filePath);
        // INFO: replaced fs.rename() due to error "EXDEV: cross-device link not permitted"
        // @ts-ignore TS(7005): Variable 'inlineFile' implicitly has an 'any' type... Remove this comment to see the full error message
        await mv(inlineFile.path, newPathAbs);
        // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
        if (updatedEntity.isImage()) {
          // Identify image properties
          const features = await imagemagick.identify(newPathAbs);
          // save image attributes
          // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
          if (!updatedEntity.extras) updatedEntity.extras = {};
          // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
          updatedEntity.extras.details = {
            format: features.format,
            width: features.width,
            height: features.height,
          };

          // create a thumbnail that fits within 500x500
          let thumbnailWidth = features.width > 500 ? 500 : features.width;
          // @ts-ignore TS(2304): Cannot find name '__dirname'.
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
      // @ts-ignore TS(7005): Variable 'inlineFile' implicitly has an 'any' type... Remove this comment to see the full error message
      if (inlineFile && updatedEntity.isImage()) {
        // update new image details in entity's extras
        // @ts-ignore TS(7005): Variable 'updatedEntity' implicitly has an 'any' t... Remove this comment to see the full error message
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
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
    model.wikiBaseUrl +
    paths.wiki.artifacts.entry +
    '/' +
    // @ts-ignore TS(2532): Object is possibly 'undefined'.
    updatedEntity.friendlyUrl +
    '/' +
    // @ts-ignore TS(2532): Object is possibly 'undefined'.
    updatedEntity._id;
  res.redirect(url);
}
