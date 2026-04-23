'use strict';
import type { FlowUtilsModule, ConstantsModule, UtilsModule } from '../../types/legacyModules';
import type { ArtifactsServiceContract } from '../../services/serviceTypes';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';
import { errorMessage } from '../../types/errors';
const flowUtils = require('../../utils/flowUtils') as FlowUtilsModule;
const constants = require('../../models/constants') as ConstantsModule;
const utils = require('../../utils/utils') as UtilsModule;
const artifactsService = require('../../services/artifactsService') as ArtifactsServiceContract;
const db = require('../../app').db.models;

module.exports = function (router: Router) {
  // GET /api/artifacts - List artifacts
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const model: Record<string, unknown> = {};
      flowUtils.setScreeningModel(req, model);
      
      const query: Record<string, unknown> = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': (model.screening as { status?: unknown } | undefined)?.status,
      };
      
      if (req.query.topic) {
        query.ownerId = req.query.topic;
      }
      
      const results = await artifactsService.getArtifactsList(query, { limit: 50 });
      model.artifacts = results;
      
      delete model.screening;
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  // GET /api/artifacts/entry/:id - Get single artifact
  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const artifactId = String(req.params.id || '').trim();
      if (!artifactId) {
        return res.status(400).json({ error: 'Artifact id is required' });
      }

      const artifact = await artifactsService.getArtifactEntry(artifactId, req);
      
      if (!artifact) {
        return res.status(404).json({ error: 'Artifact not found' });
      }

      const [artifacts, argumentsList, questions, issues, opinions] = await Promise.all([
        db.Artifact.find({
          parentId: artifactId,
          private: false,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }).sort({ editDate: -1 }).limit(5).lean(),
        db.Argument.find({
          ownerType: constants.OBJECT_TYPES.artifact,
          ownerId: artifactId,
          private: false,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }).sort({ editDate: -1 }).limit(5).lean(),
        db.Question.find({
          ownerType: constants.OBJECT_TYPES.artifact,
          ownerId: artifactId,
          private: false,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }).sort({ editDate: -1 }).limit(5).lean(),
        db.Issue.find({
          ownerType: constants.OBJECT_TYPES.artifact,
          ownerId: artifactId,
          private: false,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }).sort({ editDate: -1 }).limit(5).lean(),
        db.Opinion.find({
          parentId: null,
          ownerType: constants.OBJECT_TYPES.artifact,
          ownerId: artifactId,
          private: false,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }).sort({ editDate: -1 }).limit(5).lean(),
      ]);

      await flowUtils.setEditorsUsername(artifacts);
      artifacts.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      });

      await flowUtils.setEditorsUsername(argumentsList);
      argumentsList.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });

      await flowUtils.setEditorsUsername(questions);
      questions.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });

      await flowUtils.setEditorsUsername(issues);
      issues.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });

      await flowUtils.setEditorsUsername(opinions);
      opinions.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });

      res.json({
        artifact: artifact,
        artifacts: artifacts,
        arguments: argumentsList,
        questions: questions,
        issues: issues,
        opinions: opinions,
      });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  // POST /api/artifacts - Create artifact
  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_artifact_create(req, res);
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  // PUT /api/artifacts/entry/:id - Update artifact
  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_artifact_update(req, res);
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });
};

function canEditEntry(entry: Record<string, unknown> | null | undefined, user: Record<string, unknown> | null | undefined): boolean {
  if (!entry || !user) {
    return false;
  }
  const canPlayRoleOf = user.canPlayRoleOf as ((role: string) => boolean) | undefined;
  if (typeof canPlayRoleOf === 'function' && canPlayRoleOf('admin')) {
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
