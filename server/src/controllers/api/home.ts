'use strict';
import type { FlowUtilsModule, ConstantsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';

import appModForDb from '../../app';
import asyncMod from 'async';
const async = asyncMod as unknown as {
  parallel: (tasks: Record<string, () => Promise<unknown>>) => Promise<unknown>;
};
import * as flowUtilsNs from '../../utils/flowUtils';
import constantsMod from '../../models/constants';
import { attachAuthorReputation } from '../../services/reputationService';
import { resolveActiveApplication, visibleApplications } from '../../services/applicationContextService';
import { loadHomeRankings } from '../../services/homeRankingService';
import { applyViewModeFilter } from './viewFilter';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = constantsMod as unknown as ConstantsModule;
const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
interface HomeQuery extends Record<string, unknown> {
  parentId?: unknown;
  ownerType?: number;
  private: boolean;
  'screening.status'?: unknown;
  categoryId?: unknown;
}

interface HomeModel {
  screening?: { status?: unknown };
  topics?: unknown[];
  topicsMore?: boolean;
  arguments?: unknown[];
  argumentsMore?: boolean;
  questions?: unknown[];
  questionsMore?: boolean;
  artifacts?: unknown[];
  artifactsMore?: boolean;
  answers?: unknown[];
  answersMore?: boolean;
  issues?: unknown[];
  issuesMore?: boolean;
  opinions?: unknown[];
  opinionsMore?: boolean;
  application?: unknown;
  applications?: unknown;
  appCategories?: unknown;
  diaryCategories?: unknown[];
  myGroups?: unknown[];
  rankings?: unknown;
  [key: string]: unknown;
}

export = function (router: Router) {
  router.get('/', async function (req: WikitruthRequest, res: WikitruthResponse, next: WikitruthNext) {
    try {
      await GET_home(req, res);
    } catch (error) {
      next(error);
    }
  });
};

async function GET_home(req: WikitruthRequest, res: WikitruthResponse) {
  const application = await resolveActiveApplication(req, res);
  const knowledgeRootTopicId = String(application?.exploreTopicId || '').trim();
  const injectCategoryId = function (query: HomeQuery) {
    if (knowledgeRootTopicId) {
      query.categoryId = knowledgeRootTopicId;
    }
  };
  const hasTenantKnowledge = !application || Boolean(knowledgeRootTopicId);

  const MAX_RESULT = 20;
  const DISPLAY_RESULT = 5;
  const model: HomeModel = {};

  const result = await db.Topic.findOne({});
  if (!result) {
    return res.json({ redirect: '/install' });
  }

  flowUtils.setScreeningModel(req, model);
  flowUtils.setModelContext(req, res, model);

  await async.parallel({
    topics: async function () {
      if (!hasTenantKnowledge) { model.topics = []; return; }
      const query: HomeQuery = {
        parentId: { $ne: null },
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Topic.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
      });
      model.topics = results;
      if (results.length === MAX_RESULT) {
        model.topicsMore = true;
      }
    },
    arguments: async function () {
      if (!hasTenantKnowledge) { model.arguments = []; return; }
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Argument.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
        flowUtils.setVerdictModel(result);
      });
      model.arguments = results;
      if (results.length === MAX_RESULT) {
        model.argumentsMore = true;
      }
    },
    questions: async function () {
      if (!hasTenantKnowledge) { model.questions = []; return; }
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Question.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
      if (results.length === MAX_RESULT) {
        model.questionsMore = true;
      }
    },
    artifacts: async function () {
      if (!hasTenantKnowledge) { model.artifacts = []; return; }
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Artifact.find(query)
        .sort({ editDate: -1 })
        .limit(MAX_RESULT)
        .lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
      });
      model.artifacts = results;
      if (results.length === MAX_RESULT) {
        model.artifactsMore = true;
      }
    },
    answers: async function () {
      if (!hasTenantKnowledge) { model.answers = []; return; }
      const query: HomeQuery = {
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Answer.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEditorsUsername(results);
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
      });
      model.answers = results;
      if (results.length === MAX_RESULT) {
        model.answersMore = true;
      }
    },
    issues: async function () {
      if (!hasTenantKnowledge) { model.issues = []; return; }
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Issue.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
      });
      model.issues = results;
      if (results.length === MAX_RESULT) {
        model.issuesMore = true;
      }
    },
    opinions: async function () {
      if (!hasTenantKnowledge) { model.opinions = []; return; }
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
      applyViewModeFilter(req, query, model.screening?.status);
      const results = await db.Opinion.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
      await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result: unknown) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
      });
      model.opinions = results;
      if (results.length === MAX_RESULT) {
        model.opinionsMore = true;
      }
    },
  });

  await attachAuthorReputation(db, model);

  const rankingCandidates = ([] as unknown[]).concat(
    model.topics || [], model.arguments || [], model.questions || [], model.answers || [],
    model.issues || [], model.opinions || [], model.artifacts || [],
  ) as Array<Record<string, unknown>>;
  model.rankings = await loadHomeRankings(db, rankingCandidates);

  // Keep the legacy per-type payload compact; discovery buckets retain ranked candidates.
  ['topics', 'arguments', 'questions', 'answers', 'issues', 'opinions', 'artifacts'].forEach((key) => {
    const entries = model[key];
    if (Array.isArray(entries)) model[key] = entries.slice(0, DISPLAY_RESULT);
  });

  // Keep parity with legacy homepage mixed "Latest Posts" columns.
  flowUtils.createEntrySet(model);

  // Add application data
  if (application) {
    model.application = application;
  }

  // Expose sidebar context so modern client can mirror legacy navigation.
  // Tenant hosts advertise their resolved civic app instead of the built-in discovery list.
  model.applications = visibleApplications(application);
  if (application?.exploreTopicId) {
    const categoryModel: { categories?: unknown[] } = {};
    await flowUtils.getCategories(categoryModel, String(application.exploreTopicId), req);
    model.appCategories = categoryModel.categories || [];
  } else if (application) {
    model.appCategories = [];
  } else {
    model.appCategories =
      res.locals.appCategories ||
      (req.app.locals as { appCategories?: unknown } | undefined)?.appCategories ||
      [];
  }

  if (req.user) {
    [model.diaryCategories, model.myGroups] = await Promise.all([
      flowUtils.getDiaryCategories(req),
      flowUtils.getUserGroups(req),
    ]);
  }

  res.json(model);
}
