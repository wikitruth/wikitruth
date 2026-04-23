'use strict';
import type { FlowUtilsModule, ConstantsModule } from '../../types/legacyModules';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse, WikitruthNext } from '../../types/http';

const async = require('async') as {
  parallel: (tasks: Record<string, () => Promise<unknown>>) => Promise<unknown>;
};
import * as flowUtilsNs from '../../utils/flowUtils';
const flowUtils = flowUtilsNs as unknown as FlowUtilsModule;
const constants = require('../../models/constants') as ConstantsModule;
const applications = require('../../models/applications') as {
  getApplications: () => unknown;
};
const db = require('../../app').db.models as Record<string, any>;

interface HomeQuery {
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
  const injectCategoryId = function (query: HomeQuery) {
    if (res.locals.application) {
      query.categoryId = (res.locals.application as { exploreTopicId?: unknown }).exploreTopicId;
    }
  };

  const MAX_RESULT = 5;
  const model: HomeModel = {};

  const result = await db.Topic.findOne({});
  if (!result) {
    return res.json({ redirect: '/install' });
  }

  flowUtils.setScreeningModel(req, model);
  flowUtils.setModelContext(req, res, model);

  await async.parallel({
    topics: async function () {
      const query: HomeQuery = {
        parentId: { $ne: null },
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
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
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
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
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
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
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
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
      const query: HomeQuery = {
        private: false,
        'screening.status': model.screening?.status,
      };
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
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
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
      const query: HomeQuery = {
        ownerType: constants.OBJECT_TYPES.topic,
        private: false,
        'screening.status': model.screening?.status,
      };
      injectCategoryId(query);
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

  // Keep parity with legacy homepage mixed "Latest Posts" columns.
  flowUtils.createEntrySet(model);

  // Add application data
  if (res.locals.application) {
    model.application = res.locals.application;
  }

  // Expose sidebar context so modern client can mirror legacy navigation.
  model.applications = applications.getApplications();
  model.appCategories =
    res.locals.appCategories ||
    (req.app.locals as { appCategories?: unknown } | undefined)?.appCategories ||
    [];

  res.json(model);
}
