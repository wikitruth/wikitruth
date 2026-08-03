'use strict';
import type { FlowUtilsModule, ConstantsModule, UtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';
import * as flowUtilsNs from '../../utils/flowUtils';
import appModForDb from '../../app';
import constantsMod from '../../models/constants';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as ConstantsModule;
import * as utils from '../../utils/utils';
import * as issuesService from '../../services/issuesService';
import { applyViewModeFilter, withViewModeFilter } from './viewFilter';
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
import { logEntryEvent } from '../../services/entryEventsService';
import { rejectBlockingDuplicate } from './duplicateWriteGuard';
import { recordEntryRevision } from './revisionWriteRecorder';
import { notifySubscribers } from '../../services/notificationsService';
import { applyLegacyEntryContext, resolveLegacyEntryContext } from './entryContext';

export = function (router: Router) {
  // Get issues list
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_issues(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get issue entry
  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_issue_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create issue entry
  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_issue_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/issues:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update issue entry
  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_issue_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/issues/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_issues(req: WikitruthRequest, res: WikitruthResponse) {
  const model: Record<string, unknown> = {};
  flowUtils.setScreeningModel(req, model);
  
  const query: Record<string, unknown> = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };
  applyViewModeFilter(req, query, (model.screening as { status?: unknown } | undefined)?.status);
  
  if (req.query.topic) {
    query.ownerId = req.query.topic;
  }
  
  const results = await issuesService.getIssuesList(query, { limit: 50 });
  
  model.issues = results;
  
  // Remove screening model from response (it's server-side only)
  delete model.screening;
  
  res.json(model);
}

async function GET_issue_entry(req: WikitruthRequest, res: WikitruthResponse) {
  const issueId = String(req.params.id || '').trim();
  if (!issueId) {
    return res.status(400).json({ error: 'Issue id is required' });
  }

  const issue = await issuesService.getIssueEntry(issueId, req);
  
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const context = await resolveLegacyEntryContext(req, constants.OBJECT_TYPES.issue, issueId);
  applyLegacyEntryContext(issue, context);

  const opinions = await db.Opinion.find(withViewModeFilter(req, {
    parentId: null,
    ownerType: constants.OBJECT_TYPES.issue,
    ownerId: issueId,
    private: false,
  })).sort({ editDate: -1 }).limit(5).lean();

  await flowUtils.setEditorsUsername(opinions);
  opinions.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });
  
  const topicLinks = context.topicLink?.topic ? [context.topicLink.topic] : [];

  res.json({
    topic: context.topic || issue.parentTopic || null,
    parentTopic: context.parentTopic || null,
    grandParentTopic: context.grandParentTopic || null,
    topicLinks: topicLinks,
    issue: issue,
    opinions: opinions,
  });
}

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

async function POST_issue_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const ownerTypes: Record<string, number> = {
    topic: constants.OBJECT_TYPES.topic,
    argument: constants.OBJECT_TYPES.argument,
    question: constants.OBJECT_TYPES.question,
    answer: constants.OBJECT_TYPES.answer,
    artifact: constants.OBJECT_TYPES.artifact,
    issue: constants.OBJECT_TYPES.issue,
    opinion: constants.OBJECT_TYPES.opinion,
  };
  const requestedOwnerType = String(req.body?.ownerType || '').trim().toLowerCase();
  const queryOwner = Object.keys(ownerTypes).find((key) => req.query?.[key]);
  const ownerName = ownerTypes[requestedOwnerType] ? requestedOwnerType : queryOwner || 'topic';
  const ownerType = ownerTypes[ownerName] || constants.OBJECT_TYPES.topic;
  const ownerId = req.body?.ownerId || req.body?.topicId || (queryOwner ? req.query?.[queryOwner] : req.query?.topic) || null;
  const issueType = Number(req.body?.issueType || constants.ISSUE_TYPES.type100.code);
  const isPrivate = Boolean(req.body?.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  if (await rejectBlockingDuplicate(res, constants.OBJECT_TYPES.issue, {
    title,
    content: description,
    ownerType,
    ownerId,
    private: isPrivate,
    groupId: null,
  })) {
    return;
  }

  const now = new Date();
  const issue = await db.Issue.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    friendlyUrl: utils.urlify(title),
    issueType: issueType,
    ownerType,
    ownerId: ownerId,
    categoryId: req.body?.categoryId || (ownerType === constants.OBJECT_TYPES.topic ? ownerId : null),
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate,
  });

  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.issue,
    entry: issue,
    source: 'create',
    summary: 'Issue created',
  });

  await logEntryEvent({
    eventType: 'issue.created',
    objectType: ownerId ? ownerType : constants.OBJECT_TYPES.issue,
    objectName: ownerId ? ownerName : 'issue',
    objectId: String(ownerId || issue._id),
    actorUserId: String(req.user._id),
    actorUsername: String(req.user.username || ''),
    message: `Issue reported (type ${issueType})`,
    payload: {
      issueId: String(issue._id),
      issueType,
      title,
    },
  });

  if (ownerId) {
    await notifySubscribers({
      target: {
        objectType: ownerType,
        objectName: ownerName,
        objectId: String(ownerId),
      },
      type: 'issue',
      trigger: 'issue',
      title: 'New issue reported',
      body: title,
      link: `/issues/entry/${encodeURIComponent(String(issue.friendlyUrl || issue._id))}/${encodeURIComponent(String(issue._id))}`,
      excludeUserIds: [String(req.user._id)],
      payload: {
        issueId: String(issue._id),
        issueType,
      },
    });
  }

  res.status(201).json({
    success: true,
    issue: {
      _id: issue._id,
      title: issue.title,
      friendlyUrl: issue.friendlyUrl || utils.urlify(issue.title),
      content: issue.content,
      issueType: issue.issueType,
      ownerId: issue.ownerId,
      private: issue.private,
      createDate: issue.createDate,
      editDate: issue.editDate,
    },
  });
}

async function PUT_issue_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const issue = await db.Issue.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  if (!canEditEntry(issue, req.user as unknown as Record<string, unknown> | undefined)) {
    return res.status(403).json({ error: 'Not allowed to edit this issue' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    issue.title = title;
    issue.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const content = String(req.body?.description || req.body?.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    issue.content = content;
    issue.contentPreview = content.slice(0, 240);
  }

  if (typeof req.body?.private !== 'undefined') {
    issue.private = Boolean(req.body.private);
  }

  if (typeof req.body?.issueType !== 'undefined') {
    issue.issueType = Number(req.body.issueType || constants.ISSUE_TYPES.type100.code);
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.ownerId !== 'undefined') {
    issue.ownerId = req.body.topicId || req.body.ownerId || null;
    issue.categoryId = issue.ownerId;
  }
  if (typeof req.body?.ownerType !== 'undefined') {
    const ownerTypes: Record<string, number> = {
      topic: constants.OBJECT_TYPES.topic,
      argument: constants.OBJECT_TYPES.argument,
      question: constants.OBJECT_TYPES.question,
      answer: constants.OBJECT_TYPES.answer,
      artifact: constants.OBJECT_TYPES.artifact,
      issue: constants.OBJECT_TYPES.issue,
      opinion: constants.OBJECT_TYPES.opinion,
    };
    issue.ownerType = ownerTypes[String(req.body.ownerType || '').trim().toLowerCase()] || issue.ownerType;
  }

  issue.editDate = new Date();
  issue.editUserId = req.user._id;
  await issue.save();
  await recordEntryRevision({
    req,
    objectType: constants.OBJECT_TYPES.issue,
    entry: issue,
    source: 'update',
    summary: 'Issue updated',
  });

  res.json({
    success: true,
    issue: {
      _id: issue._id,
      title: issue.title,
      friendlyUrl: issue.friendlyUrl || utils.urlify(issue.title),
      content: issue.content,
      issueType: issue.issueType,
      ownerId: issue.ownerId,
      private: issue.private,
      createDate: issue.createDate,
      editDate: issue.editDate,
    },
  });
}
