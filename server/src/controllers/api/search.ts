'use strict';
import type { FlowUtilsModule, ConstantsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

import * as flowUtilsNs from '../../utils/flowUtils';
import constantsMod from '../../models/constants';
import appModForDb from '../../app';
import { applyViewModeFilter } from './viewFilter';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as ConstantsModule;
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
type SearchModel = {
  screening?: {
    status?: number;
  };
};

type SearchTab = 'all' | 'topics' | 'arguments' | 'questions' | 'answers' | 'artifacts' | 'issues' | 'opinions';
type SearchContent = 'all' | 'wiki' | 'journal';
type SearchRelationship = 'any' | 'supports' | 'refutes' | 'qualifies' | 'background' | 'evidence' | 'source';
type SearchEvidence = 'all' | 'linked' | 'missing';
type SearchQueryChain = {
  sort: (sort: Record<string, unknown>) => SearchQueryChain;
  limit: (limit: number) => SearchQueryChain;
  lean: () => Promise<Record<string, unknown>[]>;
};
type SearchableModel = {
  find: (query: Record<string, unknown>, projection: Record<string, unknown>) => SearchQueryChain;
};

function parseLimit(req: WikitruthRequest, fallback: number): number {
  const raw = req.query.limit;
  if (typeof raw === 'undefined') {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 100);
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

function getCurrentUserId(req: WikitruthRequest): string | null {
  const id = req.user?._id || req.user?.id;
  if (!id) {
    return null;
  }
  const normalized = String(id).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTab(value: string): SearchTab {
  const tab = value.trim().toLowerCase() as SearchTab;
  const validTabs: SearchTab[] = ['all', 'topics', 'arguments', 'questions', 'answers', 'artifacts', 'issues', 'opinions'];
  return validTabs.includes(tab) ? tab : 'all';
}

function normalizeContent(value: string): SearchContent {
  const content = value.trim().toLowerCase();
  if (content === 'diary') {
    return 'journal';
  }
  return content === 'wiki' || content === 'journal' ? (content as SearchContent) : 'all';
}

const EVIDENCE_RELATIONSHIPS: Exclude<SearchRelationship, 'any'>[] = [
  'supports', 'refutes', 'qualifies', 'background', 'evidence', 'source',
];

function normalizeRelationship(value: string): SearchRelationship {
  const relationship = value.trim().toLowerCase() as SearchRelationship;
  return relationship === 'any' || EVIDENCE_RELATIONSHIPS.includes(relationship as Exclude<SearchRelationship, 'any'>)
    ? relationship
    : 'any';
}

function normalizeEvidence(value: string): SearchEvidence {
  const evidence = value.trim().toLowerCase();
  return evidence === 'linked' || evidence === 'missing' ? evidence : 'all';
}

async function buildGraphConstraint(
  objectType: number,
  relationship: SearchRelationship,
  evidence: SearchEvidence,
): Promise<Record<string, unknown>> {
  if ((relationship === 'any' && evidence === 'all') || !db.ObjectLink?.find) return {};
  const relationships = relationship === 'any' ? EVIDENCE_RELATIONSHIPS : [relationship];
  const links = await db.ObjectLink.find({
    $or: [{ leftType: objectType }, { rightType: objectType }],
    relationship: { $in: relationships },
    private: { $ne: true },
  }).select('leftId leftType rightId rightType').lean();
  const linkedIds = Array.from(new Set(links.flatMap((link: Record<string, unknown>) => {
    const ids: string[] = [];
    if (Number(link.leftType) === objectType && link.leftId) ids.push(String(link.leftId));
    if (Number(link.rightType) === objectType && link.rightId) ids.push(String(link.rightId));
    return ids;
  })));
  return { _id: evidence === 'missing' ? { $nin: linkedIds } : { $in: linkedIds } };
}

function buildBaseQuery(screeningStatus: number | undefined, cursor: Date | null): Record<string, unknown> {
  const base: Record<string, unknown> = {};

  if (typeof screeningStatus !== 'undefined') {
    base['screening.status'] = screeningStatus;
  }

  if (cursor) {
    base.editDate = { $lt: cursor };
  }

  return base;
}

function buildPrivacyFilter(content: SearchContent, req: WikitruthRequest): Array<Record<string, unknown>> {
  const currentUserId = getCurrentUserId(req);

  switch (content) {
    case 'wiki':
      return [{ private: false }];
    case 'journal':
      return currentUserId ? [{ private: true, createUserId: currentUserId }] : [{ private: false }];
    case 'all':
    default:
      return currentUserId
        ? [{ private: false }, { private: true, createUserId: currentUserId }]
        : [{ private: false }];
  }
}

function buildSectionQuery(
  baseQuery: Record<string, unknown>,
  keyword: string,
  privacyFilter: Array<Record<string, unknown>>,
  extraQuery: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...baseQuery,
    ...extraQuery,
    $text: { $search: keyword },
    $or: privacyFilter,
  };
}

function findByRelevance(model: SearchableModel, query: Record<string, unknown>, limit: number) {
  return model
    .find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, editDate: -1, _id: 1 })
    .limit(limit)
    .lean();
}

export = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      await GET_search(req, res);
    } catch (error) {
      console.error('Error in GET /api/search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

async function GET_search(req: WikitruthRequest, res: WikitruthResponse) {
  const keyword = String(req.query.q || '').trim();
  const tab = normalizeTab(String(req.query.tab || 'all'));
  const content = normalizeContent(String(req.query.content || 'all'));
  const evidence = normalizeEvidence(String(req.query.evidence || 'all'));
  const requestedRelationship = normalizeRelationship(String(req.query.relationship || 'any'));
  const relationship = evidence === 'missing' ? 'any' : requestedRelationship;
  const allTabs = tab === 'all';
  const maxResult = 15;
  const limit = parseLimit(req, allTabs ? maxResult : 0);
  const cursor = parseCursor(req);

  if (!keyword) {
    return res.json({
      tab: tab,
      content: content,
      graphFilters: { relationship, evidence },
      results: false,
      topics: [],
      arguments: [],
      questions: [],
      answers: [],
      artifacts: [],
      issues: [],
      opinions: [],
    });
  }

  const model: SearchModel = {};
  flowUtils.setScreeningModel(req, model);
  const baseQuery = buildBaseQuery(model.screening?.status, cursor);
  applyViewModeFilter(req, baseQuery, model.screening?.status);
  const privacyFilter = buildPrivacyFilter(content, req);
  const shouldLoad = function (section: SearchTab) {
    return allTabs || tab === section;
  };

  const objectTypes: Record<Exclude<SearchTab, 'all'>, number> = {
    topics: constants.OBJECT_TYPES.topic,
    arguments: constants.OBJECT_TYPES.argument,
    questions: constants.OBJECT_TYPES.question,
    answers: constants.OBJECT_TYPES.answer,
    artifacts: constants.OBJECT_TYPES.artifact,
    issues: constants.OBJECT_TYPES.issue,
    opinions: constants.OBJECT_TYPES.opinion,
  };
  const graphConstraints = Object.fromEntries(await Promise.all(
    Object.entries(objectTypes).map(async ([section, objectType]) => [
      section,
      shouldLoad(section as SearchTab) ? await buildGraphConstraint(objectType, relationship, evidence) : {},
    ]),
  )) as Record<Exclude<SearchTab, 'all'>, Record<string, unknown>>;

  const [
    topicResults,
    argumentResults,
    questionResults,
    answerResults,
    artifactResults,
    issueResults,
    opinionResults,
  ] = await Promise.all([
    shouldLoad('topics')
      ? findByRelevance(db.Topic, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.topics), limit)
      : [],
    shouldLoad('arguments')
      ? findByRelevance(db.Argument, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.arguments), limit)
      : [],
    shouldLoad('questions')
      ? findByRelevance(db.Question, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.questions), limit)
      : [],
    shouldLoad('answers')
      ? findByRelevance(db.Answer, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.answers), limit)
      : [],
    shouldLoad('artifacts')
      ? findByRelevance(db.Artifact, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.artifacts), limit)
      : [],
    shouldLoad('issues')
      ? findByRelevance(db.Issue, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.issues), limit)
      : [],
    shouldLoad('opinions')
      ? findByRelevance(db.Opinion, buildSectionQuery(baseQuery, keyword, privacyFilter, graphConstraints.opinions), limit)
      : [],
  ]);

  await flowUtils.setEditorsUsername(topicResults);
  await flowUtils.setEntryParents(topicResults, constants.OBJECT_TYPES.topic);
  topicResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
  });

  await flowUtils.setEditorsUsername(argumentResults);
  await flowUtils.setEntryParents(argumentResults, constants.OBJECT_TYPES.argument);
  argumentResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
    flowUtils.setVerdictModel(result);
  });
  flowUtils.sortArguments(argumentResults);

  await flowUtils.setEditorsUsername(questionResults);
  await flowUtils.setEntryParents(questionResults, constants.OBJECT_TYPES.question);
  questionResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });

  await flowUtils.setEditorsUsername(answerResults);
  await flowUtils.setEntryParents(answerResults, constants.OBJECT_TYPES.answer);
  answerResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
  });

  await flowUtils.setEditorsUsername(artifactResults);
  await flowUtils.setEntryParents(artifactResults, constants.OBJECT_TYPES.artifact);
  artifactResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
  });

  await flowUtils.setEditorsUsername(issueResults);
  await flowUtils.setEntryParents(issueResults, constants.OBJECT_TYPES.issue);
  issueResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });

  await flowUtils.setEditorsUsername(opinionResults);
  await flowUtils.setEntryParents(opinionResults, constants.OBJECT_TYPES.opinion);
  opinionResults.forEach(function (result: Record<string, unknown>) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });

  const anyResults =
    topicResults.length > 0 ||
    argumentResults.length > 0 ||
    questionResults.length > 0 ||
    answerResults.length > 0 ||
    artifactResults.length > 0 ||
    issueResults.length > 0 ||
    opinionResults.length > 0;

  res.json({
    tab: tab,
    content: content,
    graphFilters: { relationship, evidence },
    results: allTabs ? anyResults : true,
    topics: topicResults,
    arguments: argumentResults,
    questions: questionResults,
    answers: answerResults,
    artifacts: artifactResults,
    issues: issueResults,
    opinions: opinionResults,
    topicsMore: allTabs && topicResults.length >= maxResult,
    argumentsMore: allTabs && argumentResults.length >= maxResult,
    questionsMore: allTabs && questionResults.length >= maxResult,
    answersMore: allTabs && answerResults.length >= maxResult,
    artifactsMore: allTabs && artifactResults.length >= maxResult,
    issuesMore: allTabs && issueResults.length >= maxResult,
    opinionsMore: allTabs && opinionResults.length >= maxResult,
  });
}
