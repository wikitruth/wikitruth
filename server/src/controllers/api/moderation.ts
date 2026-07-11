'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  bodyOf,
  queryOf,
  type ModerationListQueryContract,
  type ModerationStatusBodyContract,
} from '../../types/controllerContracts';

import * as flowUtils from '../../utils/flowUtils';
import { logEntryEvent } from '../../services/entryEventsService';
import { notifySubscribers } from '../../services/notificationsService';
import constants from '../../models/constants';
import {
  db,
  ensureScreenerOrAdmin,
  ensureModerator,
  ensureAdmin,
  parseModerationTarget,
  getDbModelByObjectType,
  getScreeningStatuses,
  getVerdictStatuses,
  toNumber,
  toPositiveInt,
  escapeRegex,
  toModerationEntry,
  areIdsEqual,
  parseOwnershipMigrationRequest,
  isSupportedScreeningStatus,
  isSupportedVerdictStatus,
  resolveConversionTargetType,
  buildEntryPath,
  buildVoteSummary,
} from './moderationShared';
import { registerModerationSignalsRoutes } from './moderationSignalsRoutes';
import { registerModerationDuplicateRoutes } from './moderationDuplicateRoutes';
import { registerModerationRevisionRoutes } from './moderationRevisionRoutes';

export = function (router: Router) {
  registerModerationDuplicateRoutes(router);
  registerModerationRevisionRoutes(router);
  router.get('/entry', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureModerator(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target query is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id).lean();
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry, target),
      screeningStatuses: getScreeningStatuses(),
      verdictStatuses: getVerdictStatuses(),
    });
  });

  router.put('/screening', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureScreenerOrAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const body = bodyOf<ModerationStatusBodyContract>(req);
    const status = toNumber(body.status ?? body.screeningStatus);
    if (status === null || !isSupportedScreeningStatus(status)) {
      res.status(400).json({ success: false, message: 'A valid screening status is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    entry.screening = entry.screening || {};
    entry.screening.status = status;
    entry.editDate = new Date();
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    await entry.save();

    const parent = flowUtils.getParent(entry, target.objectType);
    if (parent?.entryId && parent?.entryType) {
      await flowUtils.updateChildrenCount(parent.entryId, parent.entryType, target.objectType);
    }

    await logEntryEvent({
      eventType: 'moderation.screening.updated',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Screening status updated to ${status}`,
      payload: { status },
    });

    await notifySubscribers({
      target: {
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
      },
      type: 'screening',
      trigger: 'screening',
      title: 'Screening status updated',
      body: `${target.objectName} was moved to screening status ${status}.`,
      link: `/${target.objectName}s/entry/${encodeURIComponent(String(entry.friendlyUrl || target.id))}/${encodeURIComponent(target.id)}`,
      excludeUserIds: [String(req.user?.id || req.user?._id || '')],
      payload: { status },
    });

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
    });
  });

  router.put('/verdict', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    if (![constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument].includes(target.objectType)) {
      res.status(400).json({ success: false, message: 'Convert is only supported for topics and arguments' });
      return;
    }

    const body = bodyOf<ModerationStatusBodyContract>(req);
    const status = toNumber(body.status ?? body.verdictStatus);
    const reasoning = String(body.reasoning || body.verdictReasoning || '').trim();
    if (status === null || !isSupportedVerdictStatus(status)) {
      res.status(400).json({ success: false, message: 'A valid verdict status is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    entry.verdict = {
      ...(entry.verdict || {}),
      status,
      editDate: Date.now(),
      editUserId: req.user?.id || req.user?._id || entry.editUserId,
      ...(reasoning ? { reasoning } : {}),
    };
    if (reasoning && typeof entry.verdictReasoning !== 'undefined') {
      entry.verdictReasoning = reasoning;
    }
    entry.editDate = new Date();
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    await entry.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.verdict.updated',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Verdict updated to ${status}`,
      payload: { status, reasoning },
    });

    await notifySubscribers({
      target: {
        objectType: target.objectType,
        objectName: target.objectName,
        objectId: target.id,
      },
      type: 'verdict',
      trigger: 'verdict',
      title: 'Verdict updated',
      body: `${target.objectName} verdict changed to ${constants.VERDICT_STATUS.getLabel(status) || status}.`,
      link: `/${target.objectName}s/entry/${encodeURIComponent(String(entry.friendlyUrl || target.id))}/${encodeURIComponent(target.id)}`,
      excludeUserIds: [String(req.user?.id || req.user?._id || '')],
      payload: { status, reasoning },
    });

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
    });
  });

  router.post('/convert-type', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const sourceTarget = parseModerationTarget(req);
    if (!sourceTarget) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    if (![constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument].includes(sourceTarget.objectType)) {
      res.status(400).json({ success: false, message: 'Only topics and arguments can be converted' });
      return;
    }

    const body = bodyOf<ModerationStatusBodyContract>(req);
    const destinationTarget = resolveConversionTargetType(body.targetType);
    if (!destinationTarget) {
      res.status(400).json({ success: false, message: 'A valid targetType is required (topic or argument)' });
      return;
    }
    if (destinationTarget.objectType === sourceTarget.objectType) {
      res.status(400).json({ success: false, message: 'Source and destination types are the same' });
      return;
    }

    const archiveSource = body.archiveSource !== false;
    const reason = String(body.reason || '').trim();

    const sourceModel = getDbModelByObjectType(sourceTarget.objectType);
    const destinationModel = getDbModelByObjectType(destinationTarget.objectType);
    if (!sourceModel || !destinationModel) {
      res.status(400).json({ success: false, message: 'Unsupported conversion target type' });
      return;
    }

    const sourceEntry = await sourceModel.findById(sourceTarget.id);
    if (!sourceEntry) {
      res.status(404).json({ success: false, message: 'Source entry not found' });
      return;
    }

    const now = new Date();
    const actorUserId = String(req.user?.id || req.user?._id || '');
    const actorUsername = String(req.user?.username || '');
    const source = sourceEntry.toObject ? sourceEntry.toObject() : sourceEntry;
    const sourceExtras = source?.extras && typeof source.extras === 'object' ? source.extras : {};

    const destinationPayload: Record<string, unknown> = {
      title: source?.title || '',
      content: source?.content || '',
      contentPreview: source?.contentPreview || String(source?.content || '').slice(0, 240),
      friendlyUrl: source?.friendlyUrl || '',
      referenceDate: source?.referenceDate || null,
      references: source?.references || '',
      topicTags: Array.isArray(source?.topicTags) ? source.topicTags : [],
      groupId: source?.groupId || null,
      categoryId: source?.categoryId || source?.ownerId || null,
      ownerId: source?.ownerId || null,
      ownerType: toNumber(source?.ownerType),
      createDate: source?.createDate || now,
      createUserId: source?.createUserId || actorUserId,
      editDate: now,
      editUserId: actorUserId || source?.editUserId || null,
      screening: source?.screening || { status: constants.SCREENING_STATUS.status0.code },
      private: Boolean(source?.private),
      ethicalStatus: source?.ethicalStatus || { hasValue: false },
      verdict: source?.verdict || {},
      tags: Array.isArray(source?.tags) ? source.tags : [],
      extras: {
        ...sourceExtras,
        convertedFrom: {
          objectType: sourceTarget.objectType,
          objectName: sourceTarget.objectName,
          objectId: String(sourceEntry._id),
          title: String(source?.title || ''),
          convertedAt: now.toISOString(),
          convertedBy: actorUserId,
          convertedByUsername: actorUsername,
          reason,
        },
      },
    };

    if (destinationTarget.objectType === constants.OBJECT_TYPES.topic) {
      destinationPayload.parentId = sourceTarget.objectType === constants.OBJECT_TYPES.topic
        ? source?.parentId || null
        : null;
      destinationPayload.contextTitle = source?.contextTitle || source?.title || '';
    } else {
      destinationPayload.parentId = sourceTarget.objectType === constants.OBJECT_TYPES.argument
        ? source?.parentId || null
        : null;
      destinationPayload.threadId = source?.threadId || null;
      destinationPayload.typeId = toNumber(source?.typeId) ?? constants.ARGUMENT_TYPES.factual;
      destinationPayload.against = Boolean(source?.against);
      destinationPayload.parentRelationship = toNumber(source?.parentRelationship);
    }

    const destinationEntry = await destinationModel.create(destinationPayload);
    const destinationId = String(destinationEntry?._id || '');
    const destinationFriendlyUrl = String(destinationEntry?.friendlyUrl || destinationId);
    const destinationPath = buildEntryPath({
      objectName: destinationTarget.objectName,
      id: destinationId,
      friendlyUrl: destinationFriendlyUrl,
    });

    const sourceHistory = Array.isArray(sourceExtras?.conversionHistory)
      ? sourceExtras.conversionHistory
      : [];
    sourceEntry.extras = {
      ...sourceExtras,
      convertedTo: {
        objectType: destinationTarget.objectType,
        objectName: destinationTarget.objectName,
        objectId: destinationId,
        friendlyUrl: destinationFriendlyUrl,
        convertedAt: now.toISOString(),
        convertedBy: actorUserId,
        convertedByUsername: actorUsername,
        reason,
      },
      conversionHistory: [
        ...sourceHistory,
        {
          from: {
            objectType: sourceTarget.objectType,
            objectName: sourceTarget.objectName,
            objectId: String(sourceEntry._id),
          },
          to: {
            objectType: destinationTarget.objectType,
            objectName: destinationTarget.objectName,
            objectId: destinationId,
            friendlyUrl: destinationFriendlyUrl,
          },
          convertedAt: now.toISOString(),
          convertedBy: actorUserId,
          convertedByUsername: actorUsername,
          reason,
        },
      ],
    };
    sourceEntry.editDate = now;
    sourceEntry.editUserId = actorUserId || sourceEntry.editUserId;
    if (archiveSource) {
      sourceEntry.screening = sourceEntry.screening || {};
      sourceEntry.screening.status = constants.SCREENING_STATUS.status3.code;
    }
    await sourceEntry.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.entry.converted',
      objectType: sourceTarget.objectType,
      objectName: sourceTarget.objectName,
      objectId: sourceTarget.id,
      actorUserId,
      actorUsername,
      message: `Converted ${sourceTarget.objectName} to ${destinationTarget.objectName}`,
      payload: {
        archiveSource,
        reason,
        destination: {
          objectType: destinationTarget.objectType,
          objectName: destinationTarget.objectName,
          objectId: destinationId,
        },
      },
    });

    await notifySubscribers({
      target: {
        objectType: sourceTarget.objectType,
        objectName: sourceTarget.objectName,
        objectId: sourceTarget.id,
      },
      type: 'verdict',
      trigger: 'verdict',
      title: 'Entry converted',
      body: `${sourceTarget.objectName} converted to ${destinationTarget.objectName}.`,
      link: destinationPath,
      excludeUserIds: [actorUserId],
      payload: {
        sourceObjectType: sourceTarget.objectType,
        sourceObjectName: sourceTarget.objectName,
        sourceObjectId: sourceTarget.id,
        destinationObjectType: destinationTarget.objectType,
        destinationObjectName: destinationTarget.objectName,
        destinationObjectId: destinationId,
      },
    });

    res.json({
      success: true,
      source: {
        target: sourceTarget,
        entry: toModerationEntry(sourceEntry.toObject ? sourceEntry.toObject() : sourceEntry, sourceTarget),
        archived: archiveSource,
      },
      destination: {
        target: {
          objectType: destinationTarget.objectType,
          objectName: destinationTarget.objectName,
          id: destinationId,
        },
        entry: toModerationEntry(
          destinationEntry.toObject ? destinationEntry.toObject() : destinationEntry,
          {
            objectType: destinationTarget.objectType,
            objectName: destinationTarget.objectName,
            id: destinationId,
          }
        ),
        path: destinationPath,
      },
    });
  });

  router.get('/verdicts', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const query = queryOf<ModerationListQueryContract>(req);
    const objectType = toNumber(query.objectType);
    const verdictStatus = toNumber(query.status ?? query.verdictStatus);
    const page = toPositiveInt(query.page, 1);
    const limit = Math.min(toPositiveInt(query.limit, 20), 100);
    const search = String(query.q || '').trim();
    const regex = search ? new RegExp(escapeRegex(search), 'i') : null;

    const supportedTypes = [constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.argument];
    const targetTypes = objectType && supportedTypes.includes(objectType) ? [objectType] : supportedTypes;

    const allEntries: Record<string, unknown>[] = [];
    let total = 0;

    for (const targetType of targetTypes) {
      const dbModel = getDbModelByObjectType(targetType);
      if (!dbModel) {
        continue;
      }

      const query: Record<string, unknown> = {
        private: false,
      };
      if (verdictStatus !== null && isSupportedVerdictStatus(verdictStatus)) {
        query['verdict.status'] = verdictStatus;
      }
      if (regex) {
        query.title = regex;
      }

      const [count, entries] = await Promise.all([
        dbModel.countDocuments(query),
        dbModel
          .find(query)
          .sort({ editDate: -1 })
          .limit(limit * page)
          .lean(),
      ]);

      total += Number(count || 0);
      const objectName = String(constants.OBJECT_ID_NAME_MAP?.[targetType] || '').trim();
      entries.forEach((entry: Record<string, unknown>) => {
        allEntries.push(toModerationEntry(entry, { objectType: targetType, objectName, id: String(entry._id || '') }));
      });
    }

    allEntries.sort((a, b) => {
      const left = new Date(String((a as Record<string, unknown>).editDate || 0)).getTime();
      const right = new Date(String((b as Record<string, unknown>).editDate || 0)).getTime();
      return right - left;
    });

    const start = (page - 1) * limit;
    const pagedEntries = allEntries.slice(start, start + limit);
    const entriesWithVoteSummary = await Promise.all(
      pagedEntries.map(async (entry) => ({
        ...entry,
        voteSummary: await buildVoteSummary(entry),
      }))
    );

    res.json({
      success: true,
      entries: entriesWithVoteSummary,
      page,
      limit,
      total,
      verdictStatuses: getVerdictStatuses(),
    });
  });

  router.post('/verdicts/bulk', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const body = bodyOf<ModerationStatusBodyContract>(req);
    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (!updates.length) {
      res.status(400).json({ success: false, message: 'updates array is required' });
      return;
    }
    if (updates.length > 100) {
      res.status(400).json({ success: false, message: 'Bulk update is limited to 100 records' });
      return;
    }

    const userId = req.user?.id || req.user?._id;
    const results: Array<{ id: string; success: boolean; message?: string }> = [];

    for (const update of updates) {
      const id = String(update.id || '').trim();
      const objectType = toNumber(update.type ?? update.objectType);
      const status = toNumber(update.status ?? update.verdictStatus);
      const reasoning = String(update.reasoning || '').trim();

      if (!id || !objectType || status === null || !isSupportedVerdictStatus(status)) {
        results.push({
          id: id || 'unknown',
          success: false,
          message: 'Invalid id/type/status',
        });
        continue;
      }

      const dbModel = getDbModelByObjectType(objectType);
      if (!dbModel) {
        results.push({ id, success: false, message: 'Unsupported object type' });
        continue;
      }

      const entry = await dbModel.findById(id);
      if (!entry) {
        results.push({ id, success: false, message: 'Entry not found' });
        continue;
      }

      entry.verdict = {
        ...(entry.verdict || {}),
        status,
        editDate: Date.now(),
        editUserId: userId || entry.editUserId,
        ...(reasoning ? { reasoning } : {}),
      };
      if (reasoning && typeof entry.verdictReasoning !== 'undefined') {
        entry.verdictReasoning = reasoning;
      }
      entry.editDate = new Date();
      entry.editUserId = userId || entry.editUserId;
      await entry.save();

      await logEntryEvent({
        scope: 'privileged',
        eventType: 'moderation.verdict.bulk-updated',
        objectType,
        objectId: id,
        actorUserId: String(req.user?.id || req.user?._id || ''),
        actorUsername: String(req.user?.username || ''),
        message: `Bulk verdict update to ${status}`,
        payload: { status, reasoning },
      });

      results.push({ id, success: true });
    }

    res.json({
      success: true,
      results,
    });
  });

  router.post('/take-ownership', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findById(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    entry.createUserId = req.user?.id || req.user?._id || entry.createUserId;
    entry.editUserId = req.user?.id || req.user?._id || entry.editUserId;
    entry.editDate = new Date();
    await entry.save();

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.take-ownership',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: 'Entry ownership claimed by moderator',
    });

    res.json({
      success: true,
      target,
      entry: toModerationEntry(entry.toObject(), target),
    });
  });

  router.post('/delete', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const target = parseModerationTarget(req);
    if (!target) {
      res.status(400).json({ success: false, message: 'A moderation target is required' });
      return;
    }

    const dbModel = getDbModelByObjectType(target.objectType);
    if (!dbModel) {
      res.status(400).json({ success: false, message: 'Unsupported moderation target' });
      return;
    }

    const entry = await dbModel.findByIdAndDelete(target.id);
    if (!entry) {
      res.status(404).json({ success: false, message: 'Entry not found' });
      return;
    }

    const parent = flowUtils.getParent(entry, target.objectType);
    if (parent?.entryId && parent?.entryType) {
      await flowUtils.updateChildrenCount(parent.entryId, parent.entryType, target.objectType);
    }

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.delete',
      objectType: target.objectType,
      objectName: target.objectName,
      objectId: target.id,
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: 'Entry deleted by moderator',
      payload: {
        title: entry?.title || '',
      },
    });

    res.json({
      success: true,
      target,
      deleted: true,
    });
  });

  router.post('/ownership-migration', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const migration = parseOwnershipMigrationRequest(req);
    if (!migration.topicId) {
      res.status(400).json({ success: false, message: 'A topicId is required for ownership migration' });
      return;
    }

    if (!migration.targetScope) {
      res.status(400).json({ success: false, message: 'targetScope must be either "public" or "journal"' });
      return;
    }

    if (migration.targetScope === 'public' && migration.username) {
      res.status(400).json({ success: false, message: 'username is only valid for journal ownership migrations' });
      return;
    }

    const topic = await db.Topic.findById(migration.topicId);
    if (!topic) {
      res.status(404).json({ success: false, message: 'Topic not found' });
      return;
    }

    if (topic.parentId) {
      res.status(400).json({
        success: false,
        message: 'Ownership migration only supports root topics to prevent partial subtree drifts',
      });
      return;
    }

    if (topic.groupId || topic.ownerType === constants.OBJECT_TYPES.group) {
      res.status(409).json({
        success: false,
        message: 'Group-scoped topics must use group membership workflows instead of journal/public migration',
      });
      return;
    }

    let targetOwnerId: string | null = null;
    let targetOwnerType = -1;
    let targetPrivate = false;
    let targetUser: { _id: string; username: string } | null = null;

    if (migration.targetScope === 'journal') {
      if (!migration.username) {
        res.status(400).json({ success: false, message: 'username is required when targetScope is journal' });
        return;
      }

      targetUser = await db.User.findOne({ username: migration.username }).select('_id username').lean();
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'Journal owner account not found' });
        return;
      }

      // Policy check: require the journal target user to be the original creator to avoid implicit cross-user transfer.
      if (!areIdsEqual(topic.createUserId, targetUser._id)) {
        res.status(409).json({
          success: false,
          message:
            'Journal migration target must match the original topic creator. Use take-ownership first if transfer is intended.',
        });
        return;
      }

      targetOwnerId = String(targetUser._id);
      targetOwnerType = constants.OBJECT_TYPES.user;
      targetPrivate = true;
    }

    const unchanged =
      Boolean(topic.private) === targetPrivate &&
      Number(topic.ownerType) === targetOwnerType &&
      areIdsEqual(topic.ownerId, targetOwnerId);
    if (unchanged) {
      res.status(409).json({ success: false, message: 'Topic already matches requested ownership scope' });
      return;
    }

    const now = new Date();
    const actingUserId = req.user?.id || req.user?._id || topic.editUserId;
    const subtreeFilter = { $or: [{ _id: topic._id }, { categoryId: topic._id }] };

    await db.Topic.updateMany(subtreeFilter, {
      $set: {
        private: targetPrivate,
        ownerType: targetOwnerType,
        ownerId: targetOwnerId,
        groupId: null,
        editDate: now,
        editUserId: actingUserId,
      },
    });

    const updatedRootTopic = await db.Topic.findById(topic._id);
    if (updatedRootTopic) {
      await flowUtils.syncChildren(updatedRootTopic, { entryType: constants.OBJECT_TYPES.topic });
    }

    const impactedTopics = await db.Topic.find(subtreeFilter).select('_id').lean();
    const countTasks = impactedTopics.map((entry: { _id: string }) => ({
      entryId: entry._id,
      entryType: constants.OBJECT_TYPES.topic,
      specificEntryType: null,
    }));
    await flowUtils.updateChildrenCountBatch(countTasks, { transactional: true });

    await logEntryEvent({
      scope: 'privileged',
      eventType: 'moderation.ownership-migration',
      objectType: constants.OBJECT_TYPES.topic,
      objectName: 'topic',
      objectId: String(topic._id),
      actorUserId: String(req.user?.id || req.user?._id || ''),
      actorUsername: String(req.user?.username || ''),
      message: `Ownership migration to ${migration.targetScope}`,
      payload: {
        topicId: String(topic._id),
        targetScope: migration.targetScope,
        username: targetUser?.username || null,
      },
    });

    res.json({
      success: true,
      migration: {
        topicId: String(topic._id),
        targetScope: migration.targetScope,
        username: targetUser?.username || null,
        migratedTopicCount: impactedTopics.length,
      },
    });
  });

  registerModerationSignalsRoutes(router);
};
