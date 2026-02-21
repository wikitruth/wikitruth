// @ts-nocheck
'use strict';

const templates = require('../models/templates'),
  paths = require('../models/paths'),
  constants = require('../models/constants'),
  flowUtils = require('../utils/flowUtils'),
  db = require('../app').db.models,
  jwt = require('jsonwebtoken'),
  cookieParser = require('cookie-parser'),
  async = require('async');

const topicController = require('./topics'),
  argumentController = require('./arguments'),
  artifactController = require('./artifacts'),
  opinionController = require('./opinions'),
  questionController = require('./questions'),
  answerController = require('./answers'),
  issueController = require('./issues');

module.exports = function (router) {
  router.get('/', async function (req, res) {
    let injectCategoryId = function (query) {
      if (res.locals.application) {
        query.categoryId = res.locals.application.exploreTopicId;
      }
    };
    let MAX_RESULT = 5;
    let model = {};
    let result = await db.Topic.findOne({});
    if (!result) {
      res.redirect(paths.install);
    } else {
      flowUtils.setScreeningModel(req, model);
      flowUtils.setModelContext(req, res, model);
      await async.parallel({
        topics: async function () {
          const query = {
            parentId: { $ne: null },
            private: false,
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Topic.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
          await flowUtils.setEditorsUsername(results);
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.topics = results;
          if (results.length === MAX_RESULT) {
            model.topicsMore = true;
          }
        },
        arguments: async function () {
          const query = {
            ownerType: constants.OBJECT_TYPES.topic,
            private: false,
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Argument.find(query)
            .sort({ editDate: -1 })
            .limit(MAX_RESULT)
            .lean();
          await flowUtils.setEditorsUsername(results);
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
            flowUtils.setVerdictModel(result);
          });
          model.arguments = results;
          if (results.length === MAX_RESULT) {
            model.argumentsMore = true;
          }
        },
        questions: async function () {
          const query = {
            ownerType: constants.OBJECT_TYPES.topic,
            private: false,
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Question.find(query)
            .sort({ editDate: -1 })
            .limit(MAX_RESULT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
          });
          model.questions = results;
          if (results.length === MAX_RESULT) {
            model.questionsMore = true;
          }
        },
        artifacts: async function () {
          const query = {
            ownerType: constants.OBJECT_TYPES.topic,
            private: false,
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Artifact.find(query).sort({ editDate: -1 }).limit(MAX_RESULT);
          //.lean()
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
            result.setThumbnailPath(req.params.username);
          });
          model.artifacts = results;
          //console.log(results);
          if (results.length === MAX_RESULT) {
            model.artifactsMore = true;
          }
        },
        answers: async function () {
          const query = { private: false, 'screening.status': model.screening.status };
          injectCategoryId(query);
          let results = await db.Answer.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
          });
          model.answers = results;
          if (results.length === MAX_RESULT) {
            model.answersMore = true;
          }
        },
        issues: async function () {
          const query = { private: false, 'screening.status': model.screening.status };
          injectCategoryId(query);
          let results = await db.Issue.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function (result) {
            result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
          });
          model.issues = results;
          if (results.length === MAX_RESULT) {
            model.issuesMore = true;
          }
        },
        opinions: async function () {
          const query = { private: false, 'screening.status': model.screening.status };
          injectCategoryId(query);
          let results = await db.Opinion.find(query)
            .sort({ editDate: -1 })
            .limit(MAX_RESULT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
          });
          model.opinions = results;
          if (results.length === MAX_RESULT) {
            model.opinionsMore = true;
          }
        },
      });
      flowUtils.createEntrySet(model);
      res.render(templates.index, model);
    }
  });

  /* Entry routes mapping */

  router.get('/topic(/:friendlyUrl)?/link/:id', async function (req, res) {
    await topicController.GET_link_entry(req, res);
  });

  router.get('/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await topicController.GET_entry(req, res);
  });

  router.get('/argument(/:friendlyUrl)?/link/:id', async function (req, res) {
    await argumentController.GET_link_entry(req, res);
  });

  router.get('/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await argumentController.GET_entry(req, res);
  });

  router.get('/artifact(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await artifactController.GET_entry(req, res);
  });

  router.get('/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await questionController.GET_entry(req, res);
  });

  router.get('/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await answerController.GET_entry(req, res);
  });

  /* Opinions and Aliases */

  router.get('/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await opinionController.GET_entry(req, res);
  });

  router.get('/comment(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await opinionController.GET_entry(req, res);
  });

  router.get('/comments/', async function (req, res) {
    await opinionController.GET_index(req, res);
  });

  router.get('/comments/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await opinionController.GET_entry(req, res);
  });

  router.get('/comments/create', async function (req, res) {
    await opinionController.GET_create(req, res);
  });

  router.post('/comments/create', async function (req, res) {
    await opinionController.POST_create(req, res);
  });

  router.get('/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await issueController.GET_entry(req, res);
  });

  router.get('/logout-switch', function (req, res) {
    req.session.destroy();
    req.logout();
    res.redirect(paths.fastSwitch);
  });

  router.get('/fast-switch', function (req, res) {
    let model = {};
    res.render(templates.fastSwitch, model);
  });

  router.post('/fast-switch', function (req, res) {
    let model = {};
    let cookieString = req.body.cookie;
    let pin = req.body.pin;
    let success = false;
    if (cookieString && pin && pin.length === 6) {
      let secret = pin + '|' + req.app.config.jwtSecret;
      let cookies = cookieParser.JSONCookie(cookieString);
      if (cookies.length > 0) {
        for (let cookie of cookies) {
          jwt.verify(cookie.data, secret, function (err, decoded) {
            if (!err && decoded && decoded.userId) {
              // pin matched, auto-login the user
              // decoded.userId
              // cookie.id -- client_id
              success = true;
              // redirect
            }
          });
        }
      }
    }

    if (!success) {
      model.error = 'Not cookies or session found.';
      res.render(templates.fastSwitch, model);
    }
  });

  /* Related */

  router.get('/related', async function (req, res) {
    let model = {};
    await flowUtils.setTopicModels(req, model);
    await flowUtils.setArgumentModels(req, model);
    await flowUtils.setQuestionModel(req, model);
    res.render(templates.wiki.related, model);
  });

  router.get('/test', function (req, res) {
    let model = {};
    res.render('dust/test/index', model);
  });

  router.get('/vash', function (req, res) {
    let model = {
      message: 'hello world!',
    };
    res.render('vash/test.vash', model);
  });
};
