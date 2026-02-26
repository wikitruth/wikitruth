'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import type { ServiceEntry, ServiceQuery } from '../../services/serviceTypes';
import type { WikitruthConstants } from '../../types/constants';

const flowUtils = require('../../utils/flowUtils') as {
  setScreeningModel: (req: WikitruthRequest, model: ArgumentListResponse) => void;
};
const utils = require('../../utils/utils') as {
  urlify: (value: string) => string;
};
const constants = require('../../models/constants') as WikitruthConstants;
const argumentsService = require('../../services/argumentsService') as {
  getArgumentsList: (
    query: ServiceQuery,
    options: {
      limit?: number;
      req?: WikitruthRequest;
    }
  ) => Promise<ServiceEntry[]>;
  getArgumentEntry: (argumentId: string, req: WikitruthRequest) => Promise<ServiceEntry | null>;
};

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

const db = require('../../app').db.models as {
  Argument: {
    create: (fields: Record<string, unknown>) => Promise<ArgumentDocument>;
  };
};

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

module.exports = function (router: Router) {
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
};

async function GET_arguments(req: WikitruthRequest, res: WikitruthResponse) {
  const model: ArgumentListResponse = {};
  flowUtils.setScreeningModel(req, model);

  const query: ServiceQuery = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };

  if (typeof model.screening?.status !== 'undefined') {
    query['screening.status'] = model.screening.status;
  }

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

  res.json({ argument: argument });
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
