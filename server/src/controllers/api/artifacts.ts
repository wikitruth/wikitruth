'use strict';
import type { FlowUtilsModule, ConstantsModule, UtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';
import { errorMessage } from '../../types/errors';
import * as flowUtilsNs from '../../utils/flowUtils';
import appModForDb from '../../app';
import constantsMod from '../../models/constants';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as ConstantsModule;
import * as utils from '../../utils/utils';
import * as artifactsService from '../../services/artifactsService';
import {
  storeArtifactFile,
  storeUploadedArtifactFile,
  type ArtifactFilePayload,
} from '../../services/artifactFileService';
import { parseBoolean, parseNumericTags } from './entryWriteHelpers';
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
export = function (router: Router) {
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

      const topic = (artifact.parentTopic || null) as Record<string, unknown> | null;
      res.json({
        topic: topic,
        topicLinks: [],
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

async function POST_artifact_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const source = String(req.body?.source || '').trim();
  const parentId = req.body?.parentId || null;
  const groupId = req.body?.groupId || null;
  const topicOwnerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const ownerId = topicOwnerId || groupId || null;
  const ownerType = topicOwnerId ? constants.OBJECT_TYPES.topic : groupId ? constants.OBJECT_TYPES.group : constants.OBJECT_TYPES.topic;
  const isPrivate = parseBoolean(req.body?.private);

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
    ownerType: ownerType,
    ownerId: ownerId,
    parentId: parentId,
    groupId: groupId,
    categoryId: ownerId,
    typeId: [0, 1, 2, 3, 4].includes(Number(req.body?.typeId)) ? Number(req.body.typeId) : constants.ARGUMENT_TYPES.factual,
    tags: parseNumericTags(req.body?.tags),
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate || Boolean(groupId),
  });

  const uploadedFile = req.files?.inlineFile;
  if (uploadedFile || req.body?.file) {
    try {
      artifact.file = uploadedFile
        ? await storeUploadedArtifactFile(artifact._id, uploadedFile)
        : await storeArtifactFile(artifact._id, req.body.file as ArtifactFilePayload);
      await artifact.save();
    } catch (error) {
      await db.Artifact.deleteOne({ _id: artifact._id });
      return res.status(400).json({ error: errorMessage(error) });
    }
  }

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

async function PUT_artifact_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const artifact = await db.Artifact.findById(req.params.id);
  if (!artifact) {
    return res.status(404).json({ error: 'Artifact not found' });
  }
  if (!canEditEntry(artifact, req.user as unknown as Record<string, unknown> | undefined)) {
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
    artifact.private = parseBoolean(req.body.private);
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.ownerId !== 'undefined') {
    artifact.ownerId = req.body.topicId || req.body.ownerId || null;
    artifact.categoryId = artifact.ownerId;
  }

  if (typeof req.body?.parentId !== 'undefined') {
    artifact.parentId = req.body.parentId || null;
  }
  if (typeof req.body?.typeId !== 'undefined') {
    const typeId = Number(req.body.typeId);
    if (![0, 1, 2, 3, 4].includes(typeId)) {
      return res.status(400).json({ error: 'Invalid artifact type' });
    }
    artifact.typeId = typeId;
  }
  if (typeof req.body?.tags !== 'undefined') {
    artifact.tags = parseNumericTags(req.body.tags);
  }
  const uploadedFile = req.files?.inlineFile;
  if (uploadedFile || req.body?.file) {
    try {
      artifact.file = uploadedFile
        ? await storeUploadedArtifactFile(artifact._id, uploadedFile, artifact.file)
        : await storeArtifactFile(artifact._id, req.body.file as ArtifactFilePayload, artifact.file);
    } catch (error) {
      return res.status(400).json({ error: errorMessage(error) });
    }
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
