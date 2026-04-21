'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';

const flowUtils = require('../../utils/flowUtils') as any;
const constants = require('../../models/constants') as any;
const db = require('../../app').db.models as any;

type SearchModel = {
  screening?: {
    status?: number;
  };
};

type SearchTab = 'all' | 'topics' | 'arguments' | 'questions' | 'answers' | 'artifacts' | 'issues' | 'opinions';
type SearchContent = 'all' | 'wiki' | 'journal';

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

function buildRegexSearchFields(query: string, includeSource: boolean = false): Array<Record<string, unknown>> {
  const pattern = { $regex: query, $options: 'i' };
  const fields: Array<Record<string, unknown>> = [
    { title: pattern },
    { content: pattern },
    { contentPreview: pattern },
    { references: pattern },
  ];
  if (includeSource) {
    fields.push({ source: pattern });
  }
  return fields;
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
  searchFields: Array<Record<string, unknown>>,
  privacyFilter: Array<Record<string, unknown>>,
  extraQuery: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...baseQuery,
    ...extraQuery,
    $and: [{ $or: searchFields }, { $or: privacyFilter }],
  };
}

module.exports = function (router: Router) {
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
  const allTabs = tab === 'all';
  const maxResult = 15;
  const limit = parseLimit(req, allTabs ? maxResult : 0);
  const cursor = parseCursor(req);

  if (!keyword) {
    return res.json({
      tab: tab,
      content: content,
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
  const privacyFilter = buildPrivacyFilter(content, req);
  const shouldLoad = function (section: SearchTab) {
    return allTabs || tab === section;
  };

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
      ? db.Topic.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
    shouldLoad('arguments')
      ? db.Argument.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
    shouldLoad('questions')
      ? db.Question.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
    shouldLoad('answers')
      ? db.Answer.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
    shouldLoad('artifacts')
      ? db.Artifact.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword, true), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
    shouldLoad('issues')
      ? db.Issue.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
    shouldLoad('opinions')
      ? db.Opinion.find(buildSectionQuery(baseQuery, buildRegexSearchFields(keyword), privacyFilter)).sort({ editDate: -1 }).limit(limit).lean()
      : [],
  ]);

  await flowUtils.setEditorsUsername(topicResults);
  await flowUtils.setEntryParents(topicResults, constants.OBJECT_TYPES.topic);
  topicResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
  });

  await flowUtils.setEditorsUsername(argumentResults);
  await flowUtils.setEntryParents(argumentResults, constants.OBJECT_TYPES.argument);
  argumentResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
    flowUtils.setVerdictModel(result);
  });

  await flowUtils.setEditorsUsername(questionResults);
  await flowUtils.setEntryParents(questionResults, constants.OBJECT_TYPES.question);
  questionResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });

  await flowUtils.setEditorsUsername(answerResults);
  await flowUtils.setEntryParents(answerResults, constants.OBJECT_TYPES.answer);
  answerResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
  });

  await flowUtils.setEditorsUsername(artifactResults);
  await flowUtils.setEntryParents(artifactResults, constants.OBJECT_TYPES.artifact);
  artifactResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
  });

  await flowUtils.setEditorsUsername(issueResults);
  await flowUtils.setEntryParents(issueResults, constants.OBJECT_TYPES.issue);
  issueResults.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });

  await flowUtils.setEditorsUsername(opinionResults);
  await flowUtils.setEntryParents(opinionResults, constants.OBJECT_TYPES.opinion);
  opinionResults.forEach(function (result: any) {
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
