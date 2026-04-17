'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const constants = require('../../models/constants') as {
  OBJECT_TYPES: Record<string, number>;
};
const flowUtils = require('../../utils/flowUtils') as {
  getDbModelByObjectType: (type: number) => {
    findById: (id: string) => Promise<unknown>;
  } | null;
};
const db = require('../../app').db.models as {
  Reaction: {
    find: (query: Record<string, unknown>) => {
      select: (projection: Record<string, 1>) => {
        lean: () => Promise<Array<{
          channel?: unknown;
          value?: unknown;
          userId?: unknown;
        }>>;
      };
    };
    findOne: (query: Record<string, unknown>) => Promise<{
      value?: unknown;
      editDate?: Date;
      save: () => Promise<unknown>;
      deleteOne: () => Promise<unknown>;
    } | null>;
    create: (fields: Record<string, unknown>) => Promise<unknown>;
    deleteOne: (query: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
  };
};

type SupportedObjectName = 'topic' | 'argument' | 'question' | 'answer' | 'issue' | 'opinion' | 'artifact';
type ReactionChannel = 'exposure' | 'vote' | 'value';
type ExposureReaction = 'expose' | 'bury';
type VoteReaction = 'upvote' | 'downvote';
type ValueReaction = 'good' | 'bad';
type ReactionValue = ExposureReaction | VoteReaction | ValueReaction;
type MutationAction = 'set' | 'updated' | 'cleared' | 'noop';

type ReactionCounts = {
  exposure: {
    expose: number;
    bury: number;
  };
  vote: {
    upvote: number;
    downvote: number;
  };
  value: {
    good: number;
    bad: number;
  };
};

type ReactionState = {
  exposure: ExposureReaction | null;
  vote: VoteReaction | null;
  value: ValueReaction | null;
};

type ParsedTarget = {
  id: string;
  objectName: SupportedObjectName;
  objectType: number;
};

function getRequiredObjectType(name: keyof typeof constants.OBJECT_TYPES): number {
  const value = constants.OBJECT_TYPES[name];
  if (typeof value !== 'number') {
    throw new Error(`Missing object type mapping for ${name}`);
  }
  return value;
}

const OBJECT_NAME_TO_TYPE: Record<SupportedObjectName, number> = {
  topic: getRequiredObjectType('topic'),
  argument: getRequiredObjectType('argument'),
  question: getRequiredObjectType('question'),
  answer: getRequiredObjectType('answer'),
  issue: getRequiredObjectType('issue'),
  opinion: getRequiredObjectType('opinion'),
  artifact: getRequiredObjectType('artifact'),
};

const SUPPORTED_OBJECT_NAMES = new Set<SupportedObjectName>(Object.keys(OBJECT_NAME_TO_TYPE) as SupportedObjectName[]);

const REACTION_VALUES: Record<ReactionChannel, ReadonlyArray<string>> = {
  exposure: ['expose', 'bury'],
  vote: ['upvote', 'downvote'],
  value: ['good', 'bad'],
};

function asNonEmptyString(value: unknown): string {
  return String(value || '').trim();
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return null;
}

function parseObjectName(value: unknown): SupportedObjectName | null {
  const rawName = asNonEmptyString(value).toLowerCase();
  if (!rawName) {
    return null;
  }

  if (!SUPPORTED_OBJECT_NAMES.has(rawName as SupportedObjectName)) {
    return null;
  }

  return rawName as SupportedObjectName;
}

function parseTarget(req: WikitruthRequest): ParsedTarget | null {
  const id = asNonEmptyString(req.query.id || req.query.entryId || req.body?.id || req.body?.entryId);
  if (!id) {
    return null;
  }

  const objectType = parsePositiveInt(req.query.objectType || req.body?.objectType);
  const objectName = parseObjectName(req.query.objectName || req.body?.objectName);

  if (objectName && !objectType) {
    return {
      id,
      objectName,
      objectType: OBJECT_NAME_TO_TYPE[objectName],
    };
  }

  if (objectType && !objectName) {
    const resolvedObjectName = (Object.entries(OBJECT_NAME_TO_TYPE).find(([, type]) => type === objectType)?.[0] || '') as SupportedObjectName | '';
    if (!resolvedObjectName) {
      return null;
    }

    return {
      id,
      objectName: resolvedObjectName,
      objectType,
    };
  }

  if (!objectType || !objectName) {
    return null;
  }

  if (OBJECT_NAME_TO_TYPE[objectName] !== objectType) {
    return null;
  }

  return {
    id,
    objectName,
    objectType,
  };
}

function parseChannel(value: unknown): ReactionChannel | null {
  const channel = asNonEmptyString(value).toLowerCase();
  if (channel === 'exposure' || channel === 'vote' || channel === 'value') {
    return channel;
  }
  return null;
}

function parseReactionValue(value: unknown): ReactionValue | null {
  const reactionValue = asNonEmptyString(value).toLowerCase();
  if (!reactionValue) {
    return null;
  }
  if (
    reactionValue === 'expose' ||
    reactionValue === 'bury' ||
    reactionValue === 'upvote' ||
    reactionValue === 'downvote' ||
    reactionValue === 'good' ||
    reactionValue === 'bad'
  ) {
    return reactionValue;
  }
  return null;
}

function createEmptyCounts(): ReactionCounts {
  return {
    exposure: {
      expose: 0,
      bury: 0,
    },
    vote: {
      upvote: 0,
      downvote: 0,
    },
    value: {
      good: 0,
      bad: 0,
    },
  };
}

function createEmptyState(): ReactionState {
  return {
    exposure: null,
    vote: null,
    value: null,
  };
}

async function ensureEntryExists(target: ParsedTarget): Promise<boolean> {
  const dbModel = flowUtils.getDbModelByObjectType(target.objectType);
  if (!dbModel) {
    return false;
  }

  const entry = await dbModel.findById(target.id);
  return Boolean(entry);
}

function incrementCount(counts: ReactionCounts, channel: ReactionChannel, value: ReactionValue): void {
  if (channel === 'exposure' && (value === 'expose' || value === 'bury')) {
    counts.exposure[value] += 1;
    return;
  }
  if (channel === 'vote' && (value === 'upvote' || value === 'downvote')) {
    counts.vote[value] += 1;
    return;
  }
  if (channel === 'value' && (value === 'good' || value === 'bad')) {
    counts.value[value] += 1;
  }
}

function toTotals(counts: ReactionCounts): { exposure: number; vote: number; value: number } {
  return {
    exposure: counts.exposure.expose - counts.exposure.bury,
    vote: counts.vote.upvote - counts.vote.downvote,
    value: counts.value.good - counts.value.bad,
  };
}

async function buildSummary(target: ParsedTarget, userId?: string): Promise<{
  counts: ReactionCounts;
  myReactions: ReactionState;
  totals: { exposure: number; vote: number; value: number };
}> {
  const rows = await db.Reaction.find({
    entryId: target.id,
    objectType: target.objectType,
  })
    .select({
      channel: 1,
      value: 1,
      userId: 1,
    })
    .lean();

  const counts = createEmptyCounts();
  const myReactions = createEmptyState();
  const currentUserId = asNonEmptyString(userId);

  rows.forEach((row) => {
    const channel = parseChannel(row.channel);
    const value = parseReactionValue(row.value);
    if (!channel || !value) {
      return;
    }

    incrementCount(counts, channel, value);

    if (!currentUserId) {
      return;
    }

    if (asNonEmptyString(row.userId) !== currentUserId) {
      return;
    }

    if (channel === 'exposure' && (value === 'expose' || value === 'bury')) {
      myReactions.exposure = value;
      return;
    }
    if (channel === 'vote' && (value === 'upvote' || value === 'downvote')) {
      myReactions.vote = value;
      return;
    }
    if (channel === 'value' && (value === 'good' || value === 'bad')) {
      myReactions.value = value;
    }
  });

  return {
    counts,
    myReactions,
    totals: toTotals(counts),
  };
}

module.exports = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const target = parseTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'id and object target are required' });
      return;
    }

    const hasEntry = await ensureEntryExists(target);
    if (!hasEntry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    const userId = asNonEmptyString(req.user?._id || req.user?.id);
    const summary = await buildSummary(target, userId);

    res.json({
      success: true,
      target,
      ...summary,
    });
  });

  router.put('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const target = parseTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'id and object target are required' });
      return;
    }

    const channel = parseChannel(req.body?.channel);
    const value = parseReactionValue(req.body?.value);
    if (!channel || !value) {
      res.status(400).json({ success: false, message: 'A valid reaction channel/value is required' });
      return;
    }

    if (!REACTION_VALUES[channel].includes(value)) {
      res.status(400).json({ success: false, message: `Invalid value for ${channel} reaction` });
      return;
    }

    const hasEntry = await ensureEntryExists(target);
    if (!hasEntry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    const userId = asNonEmptyString(req.user._id || req.user.id);
    let action: MutationAction = 'set';
    const existing = await db.Reaction.findOne({
      entryId: target.id,
      objectType: target.objectType,
      userId,
      channel,
    });

    if (existing) {
      const existingValue = parseReactionValue(existing.value);
      if (existingValue === value) {
        await existing.deleteOne();
        action = 'cleared';
      } else {
        existing.value = value;
        existing.editDate = new Date();
        await existing.save();
        action = 'updated';
      }
    } else {
      await db.Reaction.create({
        objectType: target.objectType,
        objectName: target.objectName,
        entryId: target.id,
        userId,
        channel,
        value,
        createDate: new Date(),
        editDate: new Date(),
      });
      action = 'set';
    }

    const summary = await buildSummary(target, userId);
    res.json({
      success: true,
      action,
      target,
      ...summary,
    });
  });

  router.delete('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const target = parseTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'id and object target are required' });
      return;
    }

    const channel = parseChannel(req.query.channel || req.body?.channel);
    if (!channel) {
      res.status(400).json({ success: false, message: 'A valid reaction channel is required' });
      return;
    }

    const userId = asNonEmptyString(req.user._id || req.user.id);
    const deletionResult = await db.Reaction.deleteOne({
      entryId: target.id,
      objectType: target.objectType,
      userId,
      channel,
    });

    const action: MutationAction = deletionResult.deletedCount ? 'cleared' : 'noop';
    const summary = await buildSummary(target, userId);
    res.json({
      success: true,
      action,
      target,
      ...summary,
    });
  });
};
