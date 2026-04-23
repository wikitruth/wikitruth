'use strict';
import type { FlowUtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import type { ServiceEntry, ServiceQuery } from '../../services/serviceTypes';
import type { WikitruthConstants } from '../../types/constants';
import { applyViewModeFilter } from './viewFilter';

import * as flowUtilsNs from '../../utils/flowUtils';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
import * as utils from '../../utils/utils';
const constants = constantsMod as unknown as WikitruthConstants;
import * as argumentsService from '../../services/argumentsService';
import constantsMod from '../../models/constants';

type ArgumentDocument = {
  _id: unknown;
  title?: string;
  friendlyUrl?: string;
  content?: string;
  references?: string;
  ownerId?: unknown;
  ownerType?: unknown;
  private?: boolean;
  createDate?: Date;
  editDate?: Date;
};

const db = require('../../app').db.models as Record<string, any>;

type ArgumentListResponse = {
  screening?: {
    status?: number;
  };
  arguments?: ServiceEntry[];
};

type ArgumentWriteBody = {
  title?: unknown;
  description?: unknown;
  content?: unknown;
  sources?: unknown;
  references?: unknown;
  topicId?: unknown;
  ownerId?: unknown;
  groupId?: unknown;
  private?: unknown;
};

export = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_arguments(req, res);
    } catch (error) {
      console.error('Error in GET /api/arguments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await POST_argument_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/arguments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_argument_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/arguments/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/entry/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_argument_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/arguments/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_arguments(req: WikitruthRequest, res: WikitruthResponse) {
  const model: ArgumentListResponse = {};
  flowUtils.setScreeningModel(req, model);

  const query: ServiceQuery = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };

  applyViewModeFilter(req, query as Record<string, unknown>, model.screening?.status);

  if (req.query.topic) {
    query.ownerId = req.query.topic;
  }

  const argumentsList = await argumentsService.getArgumentsList(query, {
    limit: 50,
    req: req,
  });

  model.arguments = argumentsList;
  delete model.screening;

  res.json(model);
}

async function GET_argument_entry(req: WikitruthRequest, res: WikitruthResponse) {
  const argumentId = String(req.params.id || '').trim();

  if (!argumentId) {
    return res.status(400).json({ error: 'Argument id is required' });
  }

  const argument = await argumentsService.getArgumentEntry(argumentId, req);

  if (!argument) {
    return res.status(404).json({ error: 'Argument not found' });
  }

  const [questions, issues, opinions] = await Promise.all([
    db.Question.find({
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: argumentId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Issue.find({
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: argumentId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Opinion.find({
      parentId: null,
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: argumentId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
  ]);

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
    argument: argument,
    questions: questions,
    issues: issues,
    opinions: opinions,
  });
}

async function POST_argument_create(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const body = (req.body || {}) as ArgumentWriteBody;
  const title = String(body.title || '').trim();
  const description = String(body.description || body.content || '').trim();
  const references = String(body.sources || body.references || '').trim();
  const ownerId = body.topicId || body.ownerId || req.query.topic || null;
  const groupId = body.groupId || null;
  const ownerType = constants.OBJECT_TYPES.topic;
  const isPrivate = Boolean(body.private);
  const typeId = constants.ARGUMENT_TYPES.factual;
  const verdictStatus = constants.VERDICT_STATUS.pending;

  if (!title || title.length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters' });
  }

  if (!description || description.length < 20) {
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  }

  const now = new Date();
  const argument = await db.Argument.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    references: references,
    friendlyUrl: utils.urlify(title),
    ownerType: ownerType,
    ownerId: ownerId,
    groupId: groupId,
    typeId: typeId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    verdict: {
      status: verdictStatus,
      editDate: now,
      editUserId: req.user._id,
    },
    private: isPrivate,
  });

  res.status(201).json({
    success: true,
    argument: {
      _id: argument._id,
      title: argument.title,
      friendlyUrl: argument.friendlyUrl || utils.urlify(argument.title || ''),
      content: argument.content,
      ownerId: argument.ownerId,
      ownerType: argument.ownerType,
      private: argument.private,
      createDate: argument.createDate,
      editDate: argument.editDate,
    },
  });
}

function mapVerdictLabelToStatus(raw: unknown): number | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) {
    return null;
  }
  switch (value) {
    case 'true':
    case 'mostly-true':
      return constants.VERDICT_STATUS.status_true;
    case 'false':
    case 'mostly-false':
      return constants.VERDICT_STATUS.status_false;
    case 'half-true':
    case 'unknown':
      return constants.VERDICT_STATUS.pending;
    default:
      return null;
  }
}

async function PUT_argument_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const argument = await db.Argument.findById(req.params.id);
  if (!argument) {
    return res.status(404).json({ error: 'Argument not found' });
  }

  const actorUserId = String(req.user._id || req.user.id || '');
  const canEdit = Boolean(
    (req.user.canPlayRoleOf && req.user.canPlayRoleOf('admin')) ||
      String(argument.createUserId || '') === actorUserId
  );

  if (!canEdit) {
    return res.status(403).json({ error: 'Not allowed to edit this argument' });
  }

  const body = (req.body || {}) as ArgumentWriteBody;

  if (typeof body.title !== 'undefined') {
    const title = String(body.title || '').trim();
    if (!title || title.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters' });
    }
    argument.title = title;
    argument.friendlyUrl = utils.urlify(title);
  }

  if (typeof body.description !== 'undefined' || typeof body.content !== 'undefined') {
    const description = String(body.description || body.content || '').trim();
    if (!description || description.length < 20) {
      return res.status(400).json({ error: 'Description must be at least 20 characters' });
    }
    argument.content = description;
    argument.contentPreview = description.slice(0, 240);
  }

  if (typeof body.sources !== 'undefined' || typeof body.references !== 'undefined') {
    argument.references = String(body.sources || body.references || '').trim();
  }

  if (typeof body.topicId !== 'undefined' || typeof body.ownerId !== 'undefined') {
    argument.ownerId = body.topicId || body.ownerId || null;
    argument.ownerType = constants.OBJECT_TYPES.topic;
  }

  if (typeof body.groupId !== 'undefined') {
    argument.groupId = body.groupId || null;
  }

  if (typeof body.private !== 'undefined') {
    argument.private = Boolean(body.private);
  }

  const mappedVerdictStatus = mapVerdictLabelToStatus((req.body || {}).verdict);
  if (mappedVerdictStatus !== null) {
    argument.verdict = {
      ...(argument.verdict || {}),
      status: mappedVerdictStatus,
      editDate: new Date(),
      editUserId: actorUserId,
    };
  }

  argument.editDate = new Date();
  argument.editUserId = actorUserId;
  await argument.save();

  return res.json({
    success: true,
    argument: {
      _id: argument._id,
      title: argument.title,
      friendlyUrl: argument.friendlyUrl || utils.urlify(argument.title || ''),
      content: argument.content,
      references: argument.references,
      ownerId: argument.ownerId || null,
      ownerType: argument.ownerType,
      private: argument.private,
      createDate: argument.createDate,
      editDate: argument.editDate,
      verdict: argument.verdict || null,
    },
  });
}
