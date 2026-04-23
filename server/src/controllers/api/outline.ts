'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const constants = require('../../models/constants') as {
  OBJECT_TYPES: {
    topic: number;
    argument: number;
  };
  SCREENING_STATUS: {
    status0: { code: number };
    status1: { code: number };
  };
};
const db = require('../../app').db.models as Record<string, any>;
import * as flowUtilsNs from '../../utils/flowUtils';
const flowUtils = flowUtilsNs as unknown as {
  updateChildrenCount: (entryId: unknown, entryType: unknown, specificEntryType?: unknown) => Promise<void>;
};

type OutlineTreeNode = {
  _id: string;
  objectName: 'topic';
  title: string;
  friendlyUrl?: string;
  children: OutlineTreeNode[];
};

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeLimit(raw: unknown, fallback = 20, max = 100): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

async function buildTopicTree(topicId: string, depth: number): Promise<OutlineTreeNode | null> {
  const topic = await db.Topic.findById(topicId).lean();
  if (!topic) {
    return null;
  }

  const node: OutlineTreeNode = {
    _id: String(topic._id),
    objectName: 'topic',
    title: String(topic.title || ''),
    friendlyUrl: topic.friendlyUrl || '',
    children: [],
  };

  if (depth <= 0) {
    return node;
  }

  const children = await db.Topic.find({
    parentId: topic._id,
    private: false,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  })
    .sort({ editDate: -1 })
    .limit(30)
    .lean();

  for (const child of children) {
    const childNode = await buildTopicTree(String(child._id), depth - 1);
    if (childNode) {
      node.children.push(childNode);
    }
  }

  return node;
}

type OutlineEntry = {
  _id: unknown;
  ownerId?: unknown;
  ownerType?: unknown;
  [key: string]: unknown;
};

async function resolveParent(parentId: string): Promise<{
  kind: 'topic' | 'argument';
  entry: OutlineEntry;
} | null> {
  const topic = await db.Topic.findById(parentId);
  if (topic) {
    return { kind: 'topic', entry: topic };
  }
  const argument = await db.Argument.findById(parentId);
  if (argument) {
    return { kind: 'argument', entry: argument };
  }
  return null;
}

async function resolveTarget(targetId: string): Promise<{
  kind: 'topic' | 'argument';
  entry: OutlineEntry;
} | null> {
  const topic = await db.Topic.findById(targetId);
  if (topic) {
    return { kind: 'topic', entry: topic };
  }
  const argument = await db.Argument.findById(targetId);
  if (argument) {
    return { kind: 'argument', entry: argument };
  }
  return null;
}

module.exports = function (router: Router) {
  router.get('/tree', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const rootId = String(req.query.rootId || '').trim();
    const depth = sanitizeLimit(req.query.depth, 2, 4);

    if (rootId) {
      const tree = await buildTopicTree(rootId, depth);
      if (!tree) {
        res.status(404).json({ success: false, message: 'Root topic not found' });
        return;
      }
      res.json({ success: true, tree });
      return;
    }

    const roots = await db.Topic.find({
      parentId: null,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    })
      .sort({ editDate: -1 })
      .limit(20)
      .lean();

    const trees: OutlineTreeNode[] = [];
    for (const root of roots) {
      const tree = await buildTopicTree(String(root._id), depth);
      if (tree) {
        trees.push(tree);
      }
    }

    res.json({ success: true, trees });
  });

  router.get('/search', async function (req: WikitruthRequest, res: WikitruthResponse) {
    const term = String(req.query.q || '').trim();
    const limit = sanitizeLimit(req.query.limit, 20, 100);
    const includeTopics = String(req.query.types || '').toLowerCase() !== 'argument';
    const includeArguments = String(req.query.types || '').toLowerCase() !== 'topic';

    if (!term || term.length < 2) {
      res.json({ success: true, results: [] });
      return;
    }

    const regex = new RegExp(escapeRegex(term), 'i');
    const [topics, argumentsList] = await Promise.all([
      includeTopics
        ? db.Topic.find({
            title: regex,
            private: false,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          })
            .sort({ editDate: -1 })
            .limit(limit)
            .lean()
        : Promise.resolve([]),
      includeArguments
        ? db.Argument.find({
            title: regex,
            private: false,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          })
            .sort({ editDate: -1 })
            .limit(limit)
            .lean()
        : Promise.resolve([]),
    ]);

    const results = [
      ...topics.map((topic: { _id: unknown; title?: unknown; friendlyUrl?: unknown }) => ({
        _id: String(topic._id),
        title: String(topic.title || ''),
        friendlyUrl: topic.friendlyUrl || '',
        objectName: 'topic',
      })),
      ...argumentsList.map((argument: { _id: unknown; title?: unknown; friendlyUrl?: unknown }) => ({
        _id: String(argument._id),
        title: String(argument.title || ''),
        friendlyUrl: argument.friendlyUrl || '',
        objectName: 'argument',
      })),
    ].slice(0, limit);

    res.json({ success: true, results });
  });

  router.post('/link', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parentId = String(req.body?.parentId || '').trim();
    const targetId = String(req.body?.targetId || '').trim();
    if (!parentId || !targetId) {
      res.status(400).json({ success: false, message: 'parentId and targetId are required' });
      return;
    }
    if (parentId === targetId) {
      res.status(400).json({ success: false, message: 'Cannot link an entry to itself' });
      return;
    }

    const parent = await resolveParent(parentId);
    if (!parent) {
      res.status(404).json({ success: false, message: 'Parent entry not found' });
      return;
    }

    const target = await resolveTarget(targetId);
    if (!target) {
      res.status(404).json({ success: false, message: 'Target entry not found' });
      return;
    }

    const editUserId = req.user.id || req.user._id;
    const now = new Date();

    if (target.kind === 'topic') {
      if (parent.kind !== 'topic') {
        res.status(400).json({ success: false, message: 'Topic links require a topic parent' });
        return;
      }

      const query = {
        topicId: target.entry._id,
        parentId: parent.entry._id,
      };
      const existingLink = await db.TopicLink.findOne(query).lean();
      if (existingLink) {
        res.status(200).json({
          success: true,
          created: false,
          conflict: 'already_linked',
          message: 'Link already exists',
          link: {
            _id: String(existingLink?._id || ''),
            objectName: 'topicLink',
            parentId,
            targetId,
          },
        });
        return;
      }
      const payload = {
        topicId: target.entry._id,
        parentId: parent.entry._id,
        ownerId: parent.entry.ownerId || parent.entry._id,
        ownerType: parent.entry.ownerType || constants.OBJECT_TYPES.topic,
        editUserId,
        editDate: now,
        createUserId: editUserId,
        createDate: now,
      };

      const link = await db.TopicLink.findOneAndUpdate(query, payload, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }).lean();

      await flowUtils.updateChildrenCount(parent.entry._id, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic);

      res.status(201).json({
        success: true,
        created: true,
        link: {
          _id: String(link?._id || ''),
          objectName: 'topicLink',
          parentId,
          targetId,
        },
      });
      return;
    }

    const isTopicParent = parent.kind === 'topic';
    const argumentQuery = isTopicParent
      ? {
          argumentId: target.entry._id,
          parentId: null,
          ownerId: parent.entry._id,
        }
      : {
          argumentId: target.entry._id,
          parentId: parent.entry._id,
        };
    const existingArgumentLink = await db.ArgumentLink.findOne(argumentQuery).lean();
    if (existingArgumentLink) {
      res.status(200).json({
        success: true,
        created: false,
        conflict: 'already_linked',
        message: 'Link already exists',
        link: {
          _id: String(existingArgumentLink?._id || ''),
          objectName: 'argumentLink',
          parentId,
          targetId,
        },
      });
      return;
    }
    const argumentPayload = {
      argumentId: target.entry._id,
      parentId: isTopicParent ? null : parent.entry._id,
      ownerId: isTopicParent ? parent.entry._id : parent.entry.ownerId,
      ownerType: isTopicParent ? constants.OBJECT_TYPES.topic : parent.entry.ownerType,
      threadId: isTopicParent ? null : parent.entry.threadId || parent.entry._id,
      editUserId,
      editDate: now,
      createUserId: editUserId,
      createDate: now,
    };

    const argumentLink = await db.ArgumentLink.findOneAndUpdate(argumentQuery, argumentPayload, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();

    await flowUtils.updateChildrenCount(
      isTopicParent ? parent.entry._id : parent.entry._id,
      isTopicParent ? constants.OBJECT_TYPES.topic : constants.OBJECT_TYPES.argument,
      constants.OBJECT_TYPES.argument,
    );

    res.status(201).json({
      success: true,
      created: true,
      link: {
        _id: String(argumentLink?._id || ''),
        objectName: 'argumentLink',
        parentId,
        targetId,
      },
    });
  });
};
