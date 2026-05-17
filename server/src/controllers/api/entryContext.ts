'use strict';
import type { FlowUtilsModule, ConstantsModule, LegacyEntry } from '../../types/legacyModules';

import type { WikitruthRequest } from '../../types/http';
import * as flowUtilsNs from '../../utils/flowUtils';
import constantsMod from '../../models/constants';
import appModForDb from '../../app';

const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as ConstantsModule;
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

export type LegacyEntryContextModel = {
  topic?: LegacyEntry;
  parentTopic?: LegacyEntry;
  grandParentTopic?: LegacyEntry;
  topicLink?: LegacyEntry & { topic?: LegacyEntry };
  argument?: LegacyEntry;
  argumentLink?: LegacyEntry & { argument?: LegacyEntry; argumentId?: unknown };
  parentArgument?: LegacyEntry;
  grandParentArgument?: LegacyEntry;
  artifact?: LegacyEntry;
  question?: LegacyEntry;
  answer?: LegacyEntry;
  issue?: LegacyEntry;
  opinion?: LegacyEntry;
  opinion2?: LegacyEntry;
  parentOpinion?: LegacyEntry;
  parentOpinion2?: LegacyEntry;
  [key: string]: unknown;
};

function getEntryId(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  const id = (value as { _id?: unknown })._id;
  return id ? String(id) : '';
}

function assignIfMissing(entry: LegacyEntry, key: keyof LegacyEntry, candidate?: LegacyEntry) {
  if (entry[key] || !candidate) {
    return;
  }

  const entryId = getEntryId(entry);
  const candidateId = getEntryId(candidate);
  if (entryId && candidateId && entryId === candidateId) {
    return;
  }

  entry[key] = candidate;
}

export async function resolveLegacyEntryContext(
  req: WikitruthRequest,
  ownerType: number,
  ownerId: string
): Promise<LegacyEntryContextModel> {
  const model: LegacyEntryContextModel = {};
  const contextReq = {
    query: {} as Record<string, unknown>,
    params: { username: req.params?.username ? String(req.params.username) : undefined },
    user: req.user ? { id: req.user.id } : undefined,
  };

  await flowUtils.setEntryModels({ ownerType: ownerType, ownerId: ownerId }, contextReq, model);
  return model;
}

export function applyLegacyEntryContext(entry: LegacyEntry, context: LegacyEntryContextModel) {
  assignIfMissing(entry, 'parentTopic', context.topic || context.parentTopic);
  assignIfMissing(entry, 'parentArgument', context.parentArgument || context.argument);
  assignIfMissing(entry, 'parentArtifact', context.artifact);
  assignIfMissing(entry, 'parentQuestion', context.question);
  assignIfMissing(entry, 'parentAnswer', context.answer);
  assignIfMissing(entry, 'parentIssue', context.issue);
  assignIfMissing(entry, 'parentOpinion', context.parentOpinion || context.parentOpinion2);
}

export async function loadArgumentTopicLinks(argumentId: string, req: WikitruthRequest): Promise<LegacyEntry[]> {
  const links = await db.ArgumentLink.find({
    argumentId: argumentId,
    ownerType: constants.OBJECT_TYPES.topic,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  }).lean();

  if (!Array.isArray(links) || links.length === 0) {
    return [];
  }

  const topicIds = Array.from(
    new Set(
      links
        .map((link: Record<string, unknown>) => String(link.ownerId || '').trim())
        .filter(Boolean)
    )
  );
  if (topicIds.length === 0) {
    return [];
  }

  const topics = await db.Topic.find({ _id: { $in: topicIds } })
    .sort({ title: 1 })
    .lean();
  await flowUtils.setEditorsUsername(topics);
  topics.forEach(function (topic: LegacyEntry) {
    flowUtils.appendEntryExtras(topic, constants.OBJECT_TYPES.topic, req);
  });

  return topics as LegacyEntry[];
}
