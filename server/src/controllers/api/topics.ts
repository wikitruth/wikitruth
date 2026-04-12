'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { applyViewModeFilter } from './viewFilter';

const flowUtils = require('../../utils/flowUtils') as any;
const utils = require('../../utils/utils') as any;
const constants = require('../../models/constants') as any;
const db = require('../../app').db.models as any;

type TopicScreeningModel = {
  screening?: {
    status?: number;
  };
  topic?: any;
  topics?: any[];
  categories?: any[];
  arguments?: any[];
  questions?: any[];
  artifacts?: any[];
  issues?: any[];
  opinions?: any[];
};

function parseLimit(req: WikitruthRequest): number {
  const raw = Number(req.query.limit);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 50;
  }

  return Math.min(Math.floor(raw), 100);
}

function parseCursor(req: WikitruthRequest): Date | null {
  const raw = String(req.query.cursor || '').trim();
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

module.exports = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_topics(req, res);
    } catch (error) {
      console.error('Error in GET /api/topics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_topic_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/topics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_topic_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/topics/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_topics(req: WikitruthRequest, res: WikitruthResponse) {
  const model: TopicScreeningModel = {};
  const limit = parseLimit(req);
  const cursor = parseCursor(req);
  flowUtils.setScreeningModel(req, model);

  if (!req.query.topic && req.params.id) {
    req.query.topic = req.params.id;
  }

  await flowUtils.setTopicModels(req, model);

  const screeningStatus = constants.SCREENING_STATUS.status1.code;
  const topicsQuery: Record<string, unknown> = {
    parentId: req.query.topic,
  };
  applyViewModeFilter(req, topicsQuery, screeningStatus);
  if (cursor) {
    topicsQuery.editDate = { $lt: cursor };
  }

  model.topics = await flowUtils.getTopics(topicsQuery, {
    limit: limit,
    req: req,
  });

  if (model.topic?.childrenCount?.topics) {
    flowUtils.setScreeningModelCount(model, model.topic.childrenCount.topics);
  }

  delete model.screening;
  const list = Array.isArray(model.topics) ? model.topics : [];
  const lastTopic = list.length > 0 ? list[list.length - 1] : null;
  const nextCursor = lastTopic?.editDate ? new Date(lastTopic.editDate as string | number | Date).toISOString() : null;

  res.json({
    ...model,
    pagination: {
      limit: limit,
      cursor: cursor ? cursor.toISOString() : null,
      nextCursor: nextCursor,
    },
  });
}

async function POST_topic_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const tagsValue = String(req.body?.tags || '').trim();
  const parentId = req.body?.parentId || req.body?.topicId || null;
  const groupId = req.body?.groupId || null;
  const categoryId = req.body?.categoryId || req.body?.topicId || req.body?.category || parentId || null;
  const ownerId = parentId || groupId || null;
  const ownerType = parentId
    ? constants.OBJECT_TYPES.topic
    : groupId
      ? constants.OBJECT_TYPES.group
      : -1;
  const isPrivate = Boolean(req.body?.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  const tags = tagsValue
    .split(',')
    .map((tag: string) => tag.trim())
    .filter(Boolean);

  const now = new Date();
  const topic = await db.Topic.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    friendlyUrl: utils.urlify(title),
    parentId: parentId,
    groupId: groupId,
    categoryId: categoryId,
    ownerId: ownerId,
    ownerType: ownerType,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate,
    extras: {
      tags: tags,
    },
  });

  res.status(201).json({
    success: true,
    topic: {
      _id: topic._id,
      title: topic.title,
      friendlyUrl: topic.friendlyUrl || utils.urlify(topic.title),
      content: topic.content,
      private: topic.private,
      createDate: topic.createDate,
      editDate: topic.editDate,
    },
  });
}

async function GET_topic_entry(req: WikitruthRequest, res: WikitruthResponse) {
  const model: TopicScreeningModel = {};
  req.query.topic = req.params.id;

  await flowUtils.setTopicModels(req, model);

  if (!model.topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  if (!req.query.topic) {
    req.query.topic = model.topic._id;
  }

  const screeningStatus = model.screening?.status;

  await Promise.all([
    (async function loadCategories() {
      if (!model.topic?.parentId) {
        return;
      }
      const query: Record<string, unknown> = {
        parentId: model.topic.parentId,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      model.categories = await flowUtils.getCategories(query, {
        limit: 0,
        req: req,
      });
    })(),
    (async function loadTopics() {
      const query: Record<string, unknown> = {
        parentId: model.topic._id,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      model.topics = await flowUtils.getTopics(query, {
        limit: 5,
        req: req,
      });
    })(),
    (async function loadArguments() {
      const query: Record<string, unknown> = {
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic._id,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      const results = await db.Argument.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });
      model.arguments = results;
    })(),
    (async function loadQuestions() {
      const query: Record<string, unknown> = {
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic._id,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      const results = await db.Question.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
    })(),
    (async function loadArtifacts() {
      const query: Record<string, unknown> = {
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic._id,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      const results = await db.Artifact.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      });
      model.artifacts = results;
    })(),
    (async function loadIssues() {
      const query: Record<string, unknown> = {
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic._id,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      const results = await db.Issue.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });
      model.issues = results;
    })(),
    (async function loadOpinions() {
      const query: Record<string, unknown> = {
        parentId: null,
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic._id,
      };
      if (typeof screeningStatus !== 'undefined') {
        query['screening.status'] = screeningStatus;
      }
      const results = await db.Opinion.find(query).sort({ editDate: -1 }).limit(5).lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: any) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });
      model.opinions = results;
    })(),
  ]);

  delete model.screening;
  res.json(model);
}
