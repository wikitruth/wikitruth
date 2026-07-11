'use strict';
import type { FlowUtilsModule, ConstantsModule, UtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import { applyViewModeFilter } from './viewFilter';
import { parseNumericTags, parseOptionalDate } from './entryWriteHelpers';
import { rejectBlockingDuplicate } from './duplicateWriteGuard';
import { recordEntryRevision } from './revisionWriteRecorder';

import * as flowUtilsNs from '../../utils/flowUtils';
import appModForDb from '../../app';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
import * as utils from '../../utils/utils';
import constantsMod from '../../models/constants';
const constants = constantsMod as unknown as ConstantsModule;
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
type TopicScreeningModel = {
  [key: string]: unknown;
  screening?: {
    status?: number;
  };
  topic?: Record<string, unknown>;
  topicLink?: Record<string, unknown>;
  topics?: Record<string, unknown>[];
  categories?: Record<string, unknown>[];
  keyTopics?: Record<string, unknown>[];
  topicLinks?: Record<string, unknown>[];
  linkCount?: number;
  arguments?: Record<string, unknown>[];
  keyArguments?: Record<string, unknown>[];
  verdict?: Record<string, unknown>;
  questions?: Record<string, unknown>[];
  artifacts?: Record<string, unknown>[];
  issues?: Record<string, unknown>[];
  opinions?: Record<string, unknown>[];
  mainTopic?: boolean;
  hasKeyEntries?: boolean;
  entry?: Record<string, unknown>;
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

export = function (router: Router) {
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

  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_topic_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/topics/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/links/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_topic_link_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/topics/links/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/links/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await DELETE_topic_link(req, res);
    } catch (error) {
      console.error('Error in DELETE /api/topics/links/:id:', error);
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

  const childrenCountTopics = (model.topic?.childrenCount as { topics?: unknown } | undefined)?.topics;
  if (childrenCountTopics) {
    flowUtils.setScreeningModelCount(model, childrenCountTopics);
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
  const isPrivate = Boolean(req.body?.private);
  const isAdmin = Boolean(req.user.canPlayRoleOf && req.user.canPlayRoleOf('admin'));
  if (!parentId && !groupId && !isPrivate && !isAdmin) {
    return res.status(403).json({ error: 'A parent topic is required for public topics' });
  }
  const ownerId = parentId || groupId || (isPrivate ? req.user._id : null);
  const ownerType = parentId
    ? constants.OBJECT_TYPES.topic
    : groupId
      ? constants.OBJECT_TYPES.group
      : isPrivate
        ? constants.OBJECT_TYPES.user
        : -1;

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  if (await rejectBlockingDuplicate(res, constants.OBJECT_TYPES.topic, {
    title,
    content: description,
    parentId,
    categoryId,
    ownerId,
    ownerType,
    groupId,
    private: isPrivate || Boolean(groupId),
  })) {
    return;
  }

  const tags = parseNumericTags(tagsValue);

  const now = new Date();
  const topic = await db.Topic.create({
    title: title,
    contextTitle: String(req.body?.contextTitle || '').trim(),
    content: description,
    contentPreview: description.slice(0, 240),
    references: String(req.body?.references || '').trim(),
    referenceDate: parseOptionalDate(req.body?.referenceDate),
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
    private: isPrivate || Boolean(groupId),
    tags: tags,
    icon: String(req.body?.icon || '').trim(),
    ethicalStatus: {
      hasValue: Boolean(req.body?.hasEthicalValue),
    },
  });

  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.topic,
    entry: topic,
    source: 'create',
    summary: 'Topic created',
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

async function PUT_topic_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const topic = await db.Topic.findById(req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const actorUserId = String(req.user._id || req.user.id || '');
  const canEdit = Boolean(
    (req.user.canPlayRoleOf && req.user.canPlayRoleOf('admin')) ||
      String(topic.createUserId || '') === actorUserId
  );
  if (!canEdit) {
    return res.status(403).json({ error: 'Not allowed to edit this topic' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    topic.title = title;
    topic.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const description = String(req.body?.description || req.body?.content || '').trim();
    if (!description || description.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    topic.content = description;
    topic.contentPreview = description.slice(0, 240);
  }

  if (typeof req.body?.private !== 'undefined') {
    topic.private = Boolean(req.body.private);
  }

  if (typeof req.body?.contextTitle !== 'undefined') {
    topic.contextTitle = String(req.body.contextTitle || '').trim();
  }
  if (typeof req.body?.references !== 'undefined') {
    topic.references = String(req.body.references || '').trim();
  }
  if (typeof req.body?.referenceDate !== 'undefined') {
    topic.referenceDate = parseOptionalDate(req.body.referenceDate);
  }
  if (typeof req.body?.tags !== 'undefined') {
    topic.tags = parseNumericTags(req.body.tags);
  }
  if (typeof req.body?.icon !== 'undefined') {
    topic.icon = String(req.body.icon || '').trim();
  }
  if (typeof req.body?.hasEthicalValue !== 'undefined') {
    topic.ethicalStatus = {
      ...(topic.ethicalStatus || {}),
      hasValue: Boolean(req.body.hasEthicalValue),
    };
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.parentId !== 'undefined') {
    const nextParentId = req.body?.topicId || req.body?.parentId || null;
    topic.parentId = nextParentId;
    topic.ownerId = nextParentId || topic.groupId || null;
    topic.ownerType = nextParentId
      ? constants.OBJECT_TYPES.topic
      : topic.groupId
        ? constants.OBJECT_TYPES.group
        : -1;
    topic.categoryId = nextParentId || topic.categoryId || null;
  }

  topic.editDate = new Date();
  topic.editUserId = actorUserId;
  await topic.save();
  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.topic,
    entry: topic,
    source: 'update',
    summary: 'Topic updated',
  });

  return res.json({
    success: true,
    topic: {
      _id: topic._id,
      title: topic.title,
      friendlyUrl: topic.friendlyUrl || utils.urlify(topic.title),
      content: topic.content,
      private: topic.private,
      createDate: topic.createDate,
      editDate: topic.editDate,
      ownerId: topic.ownerId || null,
      parentId: topic.parentId || null,
    },
  });
}

async function GET_topic_entry(req: WikitruthRequest, res: WikitruthResponse) {
  const model: TopicScreeningModel = {};
  const topicLinkId = String(req.query.topicLink || req.query.id || '').trim();
  const rawIdentifier = String(req.params.id || '').trim();
  const decodedIdentifier = decodeURIComponent(rawIdentifier);
  const looksLikeObjectId = /^[a-f0-9]{24}$/i.test(decodedIdentifier);
  let topicIdFromLink = '';

  if (topicLinkId) {
    const topicLink = await db.TopicLink.findOne({ _id: topicLinkId }).lean();
    if (!topicLink) {
      return res.status(404).json({ error: 'Topic link not found' });
    }
    topicIdFromLink = String(topicLink.topicId || '').trim();
    if (!topicIdFromLink) {
      return res.status(404).json({ error: 'Topic link target not found' });
    }
    model.topicLink = topicLink;
  }

  if (topicIdFromLink) {
    req.query.topic = topicIdFromLink;
    delete req.query.friendlyUrl;
  } else if (looksLikeObjectId) {
    req.query.topic = decodedIdentifier;
    delete req.query.friendlyUrl;
  } else {
    delete req.query.topic;
    req.query.friendlyUrl = decodedIdentifier;
  }

  await flowUtils.setTopicModels(req, model);

  // If the incoming identifier was not URL-friendly text, retry with a normalized slug.
  if (!model.topic && !topicIdFromLink && !looksLikeObjectId && decodedIdentifier) {
    const normalizedFriendlyUrl = String(utils.urlify(decodedIdentifier) || '').trim();
    if (normalizedFriendlyUrl && normalizedFriendlyUrl !== decodedIdentifier) {
      req.query.friendlyUrl = normalizedFriendlyUrl;
      await flowUtils.setTopicModels(req, model);
    }
  }

  if (topicLinkId) {
    const linkedTopicIdSnapshot = req.query.topic;
    const linkedTopicSnapshot = model.topic;
    const ownerQuery = { ownerId: topicLinkId, ownerType: constants.OBJECT_TYPES.topicLink };
    await flowUtils.setEntryModels(ownerQuery, req, model);
    req.query.topic = linkedTopicIdSnapshot;
    if (linkedTopicSnapshot) {
      model.topic = linkedTopicSnapshot;
    }
  }

  if (!model.topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  if (!req.query.topic) {
    req.query.topic = model.topic._id as string;
  }

  // Keep parity with legacy topic-entry model flags and labels.
  flowUtils.setModelOwnerEntry(req, res, model);
  const screeningStatus = constants.SCREENING_STATUS.status1.code;

  await Promise.all([
    (async function loadCategories() {
      if (model.mainTopic) {
        const results = await flowUtils.getTopics(
          {
            parentId: model.topic!._id,
            'screening.status': screeningStatus,
          },
          {
            limit: 0,
            shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
            req: req,
          }
        );

        await Promise.all(
          results.map(async function enrichCategory(result: Record<string, unknown>) {
            const subTopics = await flowUtils.getTopics(
              {
                parentId: result._id,
                'screening.status': screeningStatus,
              },
              {
                limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
                shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
                req: req,
              }
            );

            result.subtopics = subTopics;

            if (subTopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
              const subArguments = await flowUtils.getArguments(
                {
                  parentId: null,
                  ownerId: result._id,
                  ownerType: constants.OBJECT_TYPES.topic,
                  'screening.status': screeningStatus,
                },
                {
                  limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE - subTopics.length,
                  req: req,
                  shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
                }
              );

              subArguments.forEach(function (subArgument: Record<string, unknown>) {
                flowUtils.setVerdictModel(subArgument);
              });
              flowUtils.sortArguments(subArguments);
              result.subarguments = subArguments;
            }
          })
        );

        model.categories = results;
      } else if (model.topic?.parentId) {
        await flowUtils.getCategories(model, model.topic.parentId, req);
      }
    })(),
    (async function loadTopics() {
      model.topics = await flowUtils.getTopics(
        {
          parentId: req.query.topic,
          'screening.status': screeningStatus,
        },
        {
          limit: 15,
          req: req,
        }
      );

      model.keyTopics = (model.topics || []).filter(function (result: Record<string, unknown>) {
        return Array.isArray(result.tags) && result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
      });

      if ((model.keyTopics || []).length > 0) {
        model.hasKeyEntries = true;
      }
    })(),
    (async function loadTopicLinks() {
      const links = await db.TopicLink.find({
        $or: [{ topicId: req.query.topic }, { parentId: req.query.topic }],
        'screening.status': screeningStatus,
      }).lean();

      if (!links || links.length === 0) {
        return;
      }

      const relatedTopicIdSet = new Set<string>();
      links.forEach(function (link: Record<string, unknown>) {
        const topicId = String(link.topicId || '');
        const parentId = String(link.parentId || '');
        const currentTopicId = String(req.query.topic || '');
        if (topicId && topicId !== currentTopicId) {
          relatedTopicIdSet.add(topicId);
        }
        if (parentId && parentId !== currentTopicId) {
          relatedTopicIdSet.add(parentId);
        }
      });

      if (relatedTopicIdSet.size === 0) {
        return;
      }

      const results = await db.Topic.find({ _id: { $in: Array.from(relatedTopicIdSet) } })
        .sort({ title: 1 })
        .lean();

      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
      });

      model.topicLinks = results;
      model.linkCount = (results || []).length + 1;
    })(),
    (async function loadArguments() {
      const results = await flowUtils.getArguments(
        {
          parentId: null,
          ownerId: req.query.topic,
          ownerType: constants.OBJECT_TYPES.topic,
          'screening.status': screeningStatus,
        },
        {
          limit: 0,
          req: req,
        }
      );

      results.forEach(function (result: Record<string, unknown>) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      model.arguments = results.slice(0, 15);

      model.keyArguments = results.filter(function (result: Record<string, unknown>) {
        return Array.isArray(result.tags) && result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
      });

      if ((model.keyArguments || []).length > 0) {
        model.hasKeyEntries = true;
      }

      model.verdict = {
        counts: flowUtils.getVerdictCount(results),
      };
    })(),
    (async function loadQuestions() {
      const questionOwnerId = topicLinkId
        ? String((model.topicLink as { topicId?: unknown } | undefined)?.topicId || model.topic!._id)
        : model.topic!._id;
      const results = await db.Question.find({
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: questionOwnerId,
        'screening.status': screeningStatus,
      })
        .sort({ editDate: -1 })
        .limit(15)
        .lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
    })(),
    (async function loadArtifacts() {
      const results = await db.Artifact.find({
        ownerType: constants.OBJECT_TYPES.topic,
        ownerId: model.topic!._id,
        'screening.status': screeningStatus,
      })
        .sort({ editDate: -1 })
        .limit(15)
        .lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      });
      model.artifacts = results;
    })(),
    (async function loadIssues() {
      const issueOwnerType = topicLinkId ? constants.OBJECT_TYPES.topicLink : constants.OBJECT_TYPES.topic;
      const issueOwnerId = topicLinkId ? topicLinkId : model.topic!._id;
      const results = await db.Issue.find({
        ownerType: issueOwnerType,
        ownerId: issueOwnerId,
        'screening.status': screeningStatus,
      })
        .sort({ editDate: -1 })
        .limit(15)
        .lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });
      model.issues = results;
    })(),
    (async function loadOpinions() {
      const opinionOwnerType = topicLinkId ? constants.OBJECT_TYPES.topicLink : constants.OBJECT_TYPES.topic;
      const opinionOwnerId = topicLinkId ? topicLinkId : model.topic!._id;
      const results = await db.Opinion.find({
        parentId: null,
        ownerType: opinionOwnerType,
        ownerId: opinionOwnerId,
        'screening.status': screeningStatus,
      })
        .sort({ editDate: -1 })
        .limit(15)
        .lean();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: Record<string, unknown>) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });
      model.opinions = results;
    })(),
  ]);

  delete model.screening;
  res.json(model);
}

async function PUT_topic_link_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const linkId = String(req.params.id || '').trim();
  if (!linkId) {
    return res.status(400).json({ error: 'Topic link id is required' });
  }

  const topicLink = await db.TopicLink.findById(linkId);
  if (!topicLink) {
    return res.status(404).json({ error: 'Topic link not found' });
  }

  const actorUserId = String(req.user._id || req.user.id || '');
  const canEdit = Boolean(
    (req.user.canPlayRoleOf && req.user.canPlayRoleOf('admin')) ||
      String(topicLink.createUserId || '') === actorUserId
  );
  if (!canEdit) {
    return res.status(403).json({ error: 'Not allowed to edit this topic link' });
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'title')) {
    topicLink.title = String(req.body?.title || '').trim();
  }

  topicLink.editDate = new Date();
  topicLink.editUserId = req.user._id || req.user.id;
  await topicLink.save();

  res.json({
    success: true,
    topicLink: {
      _id: topicLink._id,
      title: topicLink.title || '',
      topicId: topicLink.topicId || null,
      parentId: topicLink.parentId || null,
      editDate: topicLink.editDate,
    },
  });
}

async function DELETE_topic_link(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.canPlayRoleOf || !req.user.canPlayRoleOf('admin')) {
    return res.status(403).json({ error: 'Admin privileges required to delete topic links' });
  }

  const linkId = String(req.params.id || '').trim();
  if (!linkId) {
    return res.status(400).json({ error: 'Topic link id is required' });
  }

  const topicLink = await db.TopicLink.findByIdAndDelete(linkId);
  if (!topicLink) {
    return res.status(404).json({ error: 'Topic link not found' });
  }

  if (topicLink.parentId) {
    await flowUtils.updateChildrenCount(
      topicLink.parentId,
      constants.OBJECT_TYPES.topic,
      constants.OBJECT_TYPES.topic
    );
  } else {
    await flowUtils.updateChildrenCount(
      topicLink.ownerId,
      topicLink.ownerType,
      constants.OBJECT_TYPES.topic
    );
  }

  res.json({
    success: true,
    deleted: true,
    topicLink: {
      _id: topicLink._id,
      parentId: topicLink.parentId || null,
      topicId: topicLink.topicId || null,
    },
  });
}
