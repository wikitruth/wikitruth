'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const artifactsService = require('../../services/artifactsService');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // GET /api/artifacts - List artifacts
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      const model = {};
      flowUtils.setScreeningModel(req, model);
      
      const query = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      };
      
      if (req.query.topic) {
        // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
        query.ownerId = req.query.topic;
      }
      
      const results = await artifactsService.getArtifactsList(query, { limit: 50 });
      // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
      model.artifacts = results;
      
      // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
      delete model.screening;
      res.json(model);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/artifacts/entry/:id - Get single artifact
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      const artifact = await artifactsService.getArtifactEntry(req.params.id, req);
      
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }
      
      res.json({ artifact });
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/artifacts - Create artifact
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      await POST_artifact_create(req, res);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /api/artifacts/entry/:id - Update artifact
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/entry/:id', async function (req, res) {
    try {
      await PUT_artifact_update(req, res);
    } catch (error) {
      // @ts-ignore TS(2571): Object is of type 'unknown'.
      res.status(500).json({ error: error.message });
    }
  });
};

function canEditEntry(entry: any, user: any): boolean {
  if (!entry || !user) {
    return false;
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return true;
  }
  return String(entry.createUserId || '') === String(user._id || user.id || '');
}

async function POST_artifact_create(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const source = String(req.body?.source || '').trim();
  const ownerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const isPrivate = Boolean(req.body?.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  const now = new Date();
  const artifact = await db.Artifact.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    source: source,
    friendlyUrl: utils.urlify(title),
    ownerType: constants.OBJECT_TYPES.topic,
    ownerId: ownerId,
    categoryId: ownerId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate,
  });

  res.status(201).json({
    success: true,
    artifact: {
      _id: artifact._id,
      title: artifact.title,
      friendlyUrl: artifact.friendlyUrl || utils.urlify(artifact.title),
      content: artifact.content,
      source: artifact.source,
      ownerId: artifact.ownerId,
      private: artifact.private,
      createDate: artifact.createDate,
      editDate: artifact.editDate,
    },
  });
}

async function PUT_artifact_update(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const artifact = await db.Artifact.findById(req.params.id);
  if (!artifact) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  if (!canEditEntry(artifact, req.user)) {
    return res.status(403).json({ error: 'Not allowed to edit this artifact' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    artifact.title = title;
    artifact.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const content = String(req.body?.description || req.body?.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    artifact.content = content;
    artifact.contentPreview = content.slice(0, 240);
  }

  if (typeof req.body?.source !== 'undefined') {
    artifact.source = String(req.body.source || '').trim();
  }

  if (typeof req.body?.private !== 'undefined') {
    artifact.private = Boolean(req.body.private);
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.ownerId !== 'undefined') {
    artifact.ownerId = req.body.topicId || req.body.ownerId || null;
    artifact.categoryId = artifact.ownerId;
  }

  artifact.editDate = new Date();
  artifact.editUserId = req.user._id;
  await artifact.save();

  res.json({
    success: true,
    artifact: {
      _id: artifact._id,
      title: artifact.title,
      friendlyUrl: artifact.friendlyUrl || utils.urlify(artifact.title),
      content: artifact.content,
      source: artifact.source,
      ownerId: artifact.ownerId,
      private: artifact.private,
      createDate: artifact.createDate,
      editDate: artifact.editDate,
    },
  });
}
