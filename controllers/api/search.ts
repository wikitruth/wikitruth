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

function parseLimit(req: WikitruthRequest): number {
  const raw = Number(req.query.limit);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 20;
  }
  return Math.min(Math.floor(raw), 100);
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

function buildRegexSearchQuery(query: string): Record<string, unknown> {
  const pattern = { $regex: query, $options: 'i' };
  return {
    $or: [{ title: pattern }, { content: pattern }, { contentPreview: pattern }, { references: pattern }],
  };
}

function buildBaseQuery(screeningStatus: number | undefined, cursor: Date | null): Record<string, unknown> {
  const base: Record<string, unknown> = {
    private: false,
  };

  if (typeof screeningStatus !== 'undefined') {
    base['screening.status'] = screeningStatus;
  }

  if (cursor) {
    base.editDate = { $lt: cursor };
  }

  return base;
}

function findNextCursorDate(resultSets: Array<Array<{ editDate?: unknown }>>): string | null {
  const candidate = resultSets
    .map(function (set) {
      if (!Array.isArray(set) || set.length === 0) {
        return null;
      }
      const last = set[set.length - 1];
      const value = last?.editDate;
      if (!value) {
        return null;
      }
      const parsed = new Date(value as string | number | Date);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return (a as Date).getTime() - (b as Date).getTime();
    })[0] as Date | undefined;

  return candidate ? candidate.toISOString() : null;
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
  const query = String(req.query.q || '').trim();
  const limit = parseLimit(req);
  const cursor = parseCursor(req);

  if (!query) {
    return res.json({
      topics: [],
      arguments: [],
      questions: [],
      answers: [],
      artifacts: [],
      issues: [],
      opinions: [],
      pagination: {
        limit: limit,
        cursor: cursor ? cursor.toISOString() : null,
        nextCursor: null,
      },
    });
  }

  const model: SearchModel = {};
  flowUtils.setScreeningModel(req, model);
  const screeningStatus = model.screening?.status;
  const baseQuery = buildBaseQuery(screeningStatus, cursor);

  const [
    topicResults,
    argumentResults,
    questionResults,
    answerResults,
    artifactResults,
    issueResults,
    opinionResults,
  ] = await Promise.all([
    db.Topic.find({ ...baseQuery, ...buildRegexSearchQuery(query) }).sort({ editDate: -1 }).limit(limit).lean(),
    db.Argument.find({ ...baseQuery, ...buildRegexSearchQuery(query) }).sort({ editDate: -1 }).limit(limit).lean(),
    db.Question.find({ ...baseQuery, ...buildRegexSearchQuery(query) }).sort({ editDate: -1 }).limit(limit).lean(),
    db.Answer.find({ ...baseQuery, ...buildRegexSearchQuery(query) }).sort({ editDate: -1 }).limit(limit).lean(),
    db.Artifact
      .find({
        ...baseQuery,
        ...buildRegexSearchQuery(query),
        $or: [...(buildRegexSearchQuery(query).$or as Array<Record<string, unknown>>), { source: { $regex: query, $options: 'i' } }],
      })
      .sort({ editDate: -1 })
      .limit(limit)
      .lean(),
    db.Issue.find({ ...baseQuery, ...buildRegexSearchQuery(query) }).sort({ editDate: -1 }).limit(limit).lean(),
    db.Opinion.find({ ...baseQuery, ...buildRegexSearchQuery(query) }).sort({ editDate: -1 }).limit(limit).lean(),
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

  const nextCursor = findNextCursorDate([
    topicResults,
    argumentResults,
    questionResults,
    answerResults,
    artifactResults,
    issueResults,
    opinionResults,
  ]);

  res.json({
    topics: topicResults,
    arguments: argumentResults,
    questions: questionResults,
    answers: answerResults,
    artifacts: artifactResults,
    issues: issueResults,
    opinions: opinionResults,
    pagination: {
      limit: limit,
      cursor: cursor ? cursor.toISOString() : null,
      nextCursor: nextCursor,
    },
  });
}
