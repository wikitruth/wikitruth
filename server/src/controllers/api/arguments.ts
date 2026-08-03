'use strict';
import type { FlowUtilsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import type { ServiceEntry, ServiceQuery } from '../../services/serviceTypes';
import type { WikitruthConstants } from '../../types/constants';
import { applyViewModeFilter } from './viewFilter';
import { createArgument, updateArgument } from './argumentWrites';

import * as flowUtilsNs from '../../utils/flowUtils';
import appModForDb from '../../app';
import constantsMod from '../../models/constants';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as WikitruthConstants;
import * as argumentsService from '../../services/argumentsService';
import {
  applyLegacyEntryContext,
  loadArgumentTopicLinks,
  resolveLegacyEntryContext,
} from './entryContext';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
type ArgumentListResponse = {
  screening?: {
    status?: number;
  };
  arguments?: ServiceEntry[];
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
      await createArgument(req, res);
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
      await updateArgument(req, res);
    } catch (error) {
      console.error('Error in PUT /api/arguments/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/links/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await PUT_argument_link_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/arguments/links/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/links/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await DELETE_argument_link(req, res);
    } catch (error) {
      console.error('Error in DELETE /api/arguments/links/:id:', error);
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
  const argumentIdFromPath = String(req.params.id || '').trim();
  const argumentLinkId = String(req.query.argumentLink || req.query.id || '').trim();
  let resolvedArgumentId = argumentIdFromPath;

  if (!resolvedArgumentId && !argumentLinkId) {
    return res.status(400).json({ error: 'Argument id is required' });
  }

  let contextOwnerType: number = constants.OBJECT_TYPES.argument;
  let contextOwnerId = resolvedArgumentId;

  if (argumentLinkId) {
    const argumentLink = await db.ArgumentLink.findById(argumentLinkId).lean();
    if (!argumentLink) {
      return res.status(404).json({ error: 'Argument link not found' });
    }
    resolvedArgumentId = String(argumentLink.argumentId || '').trim();
    if (!resolvedArgumentId) {
      return res.status(404).json({ error: 'Argument link target not found' });
    }
    contextOwnerType = constants.OBJECT_TYPES.argumentLink;
    contextOwnerId = argumentLinkId;
  }

  const argument = await argumentsService.getArgumentEntry(resolvedArgumentId, req);

  if (!argument) {
    return res.status(404).json({ error: 'Argument not found' });
  }

  const context = await resolveLegacyEntryContext(req, contextOwnerType, contextOwnerId);
  applyLegacyEntryContext(argument, context);

  const contextArgumentLink = (context.argumentLink || null) as { argumentId?: unknown } | null;
  const questionOwnerId = argumentLinkId
    ? String(contextArgumentLink?.argumentId || resolvedArgumentId)
    : resolvedArgumentId;
  const issueOwnerType = argumentLinkId ? constants.OBJECT_TYPES.argumentLink : constants.OBJECT_TYPES.argument;
  const issueOwnerId = argumentLinkId || resolvedArgumentId;

  const [childArguments, questions, issues, opinions] = await Promise.all([
    db.Argument.find({
      ownerId: argument.ownerId,
      parentId: resolvedArgumentId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Question.find({
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: questionOwnerId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Issue.find({
      ownerType: issueOwnerType,
      ownerId: issueOwnerId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
    db.Opinion.find({
      parentId: null,
      ownerType: issueOwnerType,
      ownerId: issueOwnerId,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    }).sort({ editDate: -1 }).limit(5).lean(),
  ]);

  await flowUtils.setEditorsUsername(childArguments);
  childArguments.forEach(function (result: Record<string, unknown>) {
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

  const contextTopicLinks = context.topicLink?.topic ? [context.topicLink.topic] : [];
  const argumentTopicLinks = await loadArgumentTopicLinks(resolvedArgumentId, req);
  const topicLinks = [...contextTopicLinks, ...argumentTopicLinks];
  const dedupedTopicLinks = topicLinks.filter(function (topic, index, all) {
    const topicId = String(topic?._id || '');
    if (!topicId) {
      return false;
    }
    return all.findIndex((candidate) => String(candidate?._id || '') === topicId) === index;
  });

  res.json({
    entry: (context as Record<string, unknown>).entry || context.argumentLink || argument,
    argumentLink: context.argumentLink || null,
    topic: context.topic || argument.parentTopic || null,
    parentTopic: context.parentTopic || null,
    grandParentTopic: context.grandParentTopic || null,
    topicLinks: dedupedTopicLinks,
    argument: argument,
    arguments: childArguments,
    questions: questions,
    issues: issues,
    opinions: opinions,
  });
}


async function PUT_argument_link_update(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const linkId = String(req.params.id || '').trim();
  if (!linkId) {
    return res.status(400).json({ error: 'Argument link id is required' });
  }

  const argumentLink = await db.ArgumentLink.findById(linkId);
  if (!argumentLink) {
    return res.status(404).json({ error: 'Argument link not found' });
  }

  const actorUserId = String(req.user._id || req.user.id || '');
  const canEdit = Boolean(
    (req.user.canPlayRoleOf && req.user.canPlayRoleOf('admin')) ||
      String(argumentLink.createUserId || '') === actorUserId
  );
  if (!canEdit) {
    return res.status(403).json({ error: 'Not allowed to edit this argument link' });
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'title')) {
    argumentLink.title = String(req.body?.title || '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'supportsParent')) {
    const supportsParent = Boolean(req.body?.supportsParent);
    argumentLink.against = !supportsParent;
  }

  argumentLink.editDate = new Date();
  argumentLink.editUserId = req.user._id || req.user.id;
  await argumentLink.save();

  res.json({
    success: true,
    argumentLink: {
      _id: argumentLink._id,
      title: argumentLink.title || '',
      argumentId: argumentLink.argumentId || null,
      parentId: argumentLink.parentId || null,
      against: Boolean(argumentLink.against),
      editDate: argumentLink.editDate,
    },
  });
}

async function DELETE_argument_link(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.canPlayRoleOf || !req.user.canPlayRoleOf('admin')) {
    return res.status(403).json({ error: 'Admin privileges required to delete argument links' });
  }

  const linkId = String(req.params.id || '').trim();
  if (!linkId) {
    return res.status(400).json({ error: 'Argument link id is required' });
  }

  const argumentLink = await db.ArgumentLink.findByIdAndDelete(linkId);
  if (!argumentLink) {
    return res.status(404).json({ error: 'Argument link not found' });
  }

  if (argumentLink.parentId) {
    await flowUtils.updateChildrenCount(
      argumentLink.parentId,
      constants.OBJECT_TYPES.argument,
      constants.OBJECT_TYPES.argument
    );
  } else {
    await flowUtils.updateChildrenCount(
      argumentLink.ownerId,
      argumentLink.ownerType,
      constants.OBJECT_TYPES.argument
    );
  }

  res.json({
    success: true,
    deleted: true,
    argumentLink: {
      _id: argumentLink._id,
      parentId: argumentLink.parentId || null,
      argumentId: argumentLink.argumentId || null,
      ownerId: argumentLink.ownerId || null,
      ownerType: argumentLink.ownerType,
    },
  });
}
