'use strict';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import type { WikitruthConstants } from '../../types/constants';
import appModForDb from '../../app';
import constantsMod from '../../models/constants';
import * as utils from '../../utils/utils';
import { parseNumericTags, parseOptionalDate } from './entryWriteHelpers';
import { rejectBlockingDuplicate } from './duplicateWriteGuard';

const constants = constantsMod as unknown as WikitruthConstants;
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

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
  parentId?: unknown;
  supportsParent?: unknown;
  referenceDate?: unknown;
  typeId?: unknown;
  tags?: unknown;
  hasEthicalValue?: unknown;
};

export async function createArgument(req: WikitruthRequest, res: WikitruthResponse) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const body = (req.body || {}) as ArgumentWriteBody;
  const title = String(body.title || '').trim();
  const description = String(body.description || body.content || '').trim();
  const references = String(body.sources || body.references || '').trim();
  const parentId = body.parentId || null;
  const groupId = body.groupId || null;
  const parentArgument = parentId ? await db.Argument.findById(parentId).lean() : null;
  if (parentId && !parentArgument) {
    return res.status(400).json({ error: 'Parent fact not found' });
  }
  const topicOwnerId = body.topicId || body.ownerId || req.query.topic || null;
  const ownerId = parentArgument?.ownerId || topicOwnerId || groupId || null;
  const ownerType = parentArgument?.ownerType
    || (topicOwnerId ? constants.OBJECT_TYPES.topic : groupId ? constants.OBJECT_TYPES.group : constants.OBJECT_TYPES.topic);
  const isPrivate = Boolean(body.private);
  const requestedTypeId = Number(body.typeId);
  const validTypes = [0, 1, 2, 3, 4];
  const typeId = validTypes.includes(requestedTypeId) ? requestedTypeId : constants.ARGUMENT_TYPES.factual;
  const verdictStatus = constants.VERDICT_STATUS.pending;

  if (!title || title.length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters' });
  }

  if (!description || description.length < 20) {
    return res.status(400).json({ error: 'Description must be at least 20 characters' });
  }

  if (await rejectBlockingDuplicate(res, constants.OBJECT_TYPES.argument, {
    title,
    content: description,
    ownerType,
    ownerId,
    parentId,
    groupId,
    private: isPrivate || Boolean(groupId),
  })) {
    return;
  }

  const now = new Date();
  const argument = await db.Argument.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    references: references,
    referenceDate: parseOptionalDate(body.referenceDate),
    friendlyUrl: utils.urlify(title),
    ownerType: ownerType,
    ownerId: ownerId,
    groupId: groupId,
    parentId: parentId,
    threadId: parentArgument ? (parentArgument.threadId || parentArgument._id) : null,
    against: parentArgument ? !Boolean(body.supportsParent) : false,
    typeId: typeId,
    tags: parseNumericTags(body.tags),
    ethicalStatus: {
      hasValue: Boolean(body.hasEthicalValue),
    },
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
    private: isPrivate || Boolean(groupId),
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

export async function updateArgument(req: WikitruthRequest, res: WikitruthResponse) {
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

  if (typeof body.referenceDate !== 'undefined') {
    argument.referenceDate = parseOptionalDate(body.referenceDate);
  }
  if (typeof body.typeId !== 'undefined') {
    const nextTypeId = Number(body.typeId);
    if (![0, 1, 2, 3, 4].includes(nextTypeId)) {
      return res.status(400).json({ error: 'Invalid fact type' });
    }
    argument.typeId = nextTypeId;
  }
  if (typeof body.tags !== 'undefined') {
    argument.tags = parseNumericTags(body.tags);
  }
  if (typeof body.hasEthicalValue !== 'undefined') {
    argument.ethicalStatus = {
      ...(argument.ethicalStatus || {}),
      hasValue: Boolean(body.hasEthicalValue),
    };
  }
  if (typeof body.parentId !== 'undefined') {
    const nextParentId = body.parentId || null;
    const parent = nextParentId ? await db.Argument.findById(nextParentId).lean() : null;
    if (nextParentId && !parent) {
      return res.status(400).json({ error: 'Parent fact not found' });
    }
    argument.parentId = nextParentId;
    argument.threadId = parent ? (parent.threadId || parent._id) : null;
    argument.against = parent ? !Boolean(body.supportsParent) : false;
    if (parent) {
      argument.ownerId = parent.ownerId;
      argument.ownerType = parent.ownerType;
    }
  } else if (typeof body.supportsParent !== 'undefined' && argument.parentId) {
    argument.against = !Boolean(body.supportsParent);
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
