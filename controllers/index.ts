'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
const templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'paths'.
  paths = require('../models/paths'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../app').db.models,
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'jwt'.
  jwt = require('jsonwebtoken'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
  async = require('async');

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const topicController = require('./topics'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  argumentController = require('./arguments'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  artifactController = require('./artifacts'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  opinionController = require('./opinions'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  questionController = require('./questions'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  answerController = require('./answers'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  issueController = require('./issues');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    // @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
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
            // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Topic.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
          await flowUtils.setEditorsUsername(results);
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
          model.topics = results;
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{}'.
            model.topicsMore = true;
          }
        },
        arguments: async function () {
          const query = {
            ownerType: constants.OBJECT_TYPES.topic,
            private: false,
            // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Argument.find(query)
            .sort({ editDate: -1 })
            .limit(MAX_RESULT)
            .lean();
          await flowUtils.setEditorsUsername(results);
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
            flowUtils.setVerdictModel(result);
          });
          // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
          model.arguments = results;
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
            model.argumentsMore = true;
          }
        },
        questions: async function () {
          const query = {
            ownerType: constants.OBJECT_TYPES.topic,
            private: false,
            // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Question.find(query)
            .sort({ editDate: -1 })
            .limit(MAX_RESULT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
          });
          // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
          model.questions = results;
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
            model.questionsMore = true;
          }
        },
        artifacts: async function () {
          const query = {
            ownerType: constants.OBJECT_TYPES.topic,
            private: false,
            // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
            'screening.status': model.screening.status,
          };
          injectCategoryId(query);
          let results = await db.Artifact.find(query).sort({ editDate: -1 }).limit(MAX_RESULT);
          //.lean()
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
            result.setThumbnailPath(req.params.username);
          });
          // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
          model.artifacts = results;
          //console.log(results);
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'artifactsMore' does not exist on type '{... Remove this comment to see the full error message
            model.artifactsMore = true;
          }
        },
        answers: async function () {
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
          const query = { private: false, 'screening.status': model.screening.status };
          injectCategoryId(query);
          let results = await db.Answer.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
          });
          // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
          model.answers = results;
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'answersMore' does not exist on type '{}'... Remove this comment to see the full error message
            model.answersMore = true;
          }
        },
        issues: async function () {
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
          const query = { private: false, 'screening.status': model.screening.status };
          injectCategoryId(query);
          let results = await db.Issue.find(query).sort({ editDate: -1 }).limit(MAX_RESULT).lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
          });
          // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
          model.issues = results;
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{}'.
            model.issuesMore = true;
          }
        },
        opinions: async function () {
          // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
          const query = { private: false, 'screening.status': model.screening.status };
          injectCategoryId(query);
          let results = await db.Opinion.find(query)
            .sort({ editDate: -1 })
            .limit(MAX_RESULT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function (result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
          });
          // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
          model.opinions = results;
          if (results.length === MAX_RESULT) {
            // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{}... Remove this comment to see the full error message
            model.opinionsMore = true;
          }
        },
      });
      flowUtils.createEntrySet(model);
      res.render(templates.index, model);
    }
  });

  /* Entry routes mapping */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/topic(/:friendlyUrl)?/link/:id', async function (req, res) {
    await topicController.GET_link_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await topicController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/argument(/:friendlyUrl)?/link/:id', async function (req, res) {
    await argumentController.GET_link_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await argumentController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/artifact(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await artifactController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await questionController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await answerController.GET_entry(req, res);
  });

  /* Opinions and Aliases */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await opinionController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/comment(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await opinionController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/comments/', async function (req, res) {
    await opinionController.GET_index(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/comments/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await opinionController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/comments/create', async function (req, res) {
    await opinionController.GET_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/comments/create', async function (req, res) {
    await opinionController.POST_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await issueController.GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/logout-switch', function (req, res) {
    req.session.destroy();
    req.logout();
    res.redirect(paths.fastSwitch);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/fast-switch', function (req, res) {
    let model = {};
    res.render(templates.fastSwitch, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/fast-switch', async function (req, res, next) {
    let model = {};
    let pin = String(req.body.pin || '').trim();
    let nextUrl = String(req.body.next || req.query.next || '/app').trim() || '/app';
    if (!/^\d{6}$/.test(pin)) {
      // @ts-ignore TS(2339): Property 'error' does not exist on type '{}'.
      model.error = 'PIN must be exactly 6 digits.';
      return res.render(templates.fastSwitch, model);
    }

    let cookies = Array.isArray(req.cookies.fast_switch) ? req.cookies.fast_switch : [];
    if (cookies.length === 0) {
      // @ts-ignore TS(2339): Property 'error' does not exist on type '{}'.
      model.error = 'No fast-switch session found on this browser.';
      return res.render(templates.fastSwitch, model);
    }

    let secret = pin + '|' + req.app.config.jwtSecret;
    let matchedUserId = null;

    for (let cookie of cookies) {
      if (!cookie?.data) {
        continue;
      }

      try {
        let decoded = jwt.verify(cookie.data, secret);
        if (decoded?.userId) {
          matchedUserId = decoded.userId;
          break;
        }
      } catch (_err) {
        // continue checking other trusted-client records
      }
    }

    if (!matchedUserId) {
      // @ts-ignore TS(2339): Property 'error' does not exist on type '{}'.
      model.error = 'Invalid PIN or fast-switch session.';
      return res.render(templates.fastSwitch, model);
    }

    try {
      const user = await db.User.findById(matchedUserId);
      if (!user) {
        // @ts-ignore TS(2339): Property 'error' does not exist on type '{}'.
        model.error = 'Account not found.';
        return res.render(templates.fastSwitch, model);
      }

      req.login(user, function (err: unknown) {
        if (err) {
          return next(err);
        }

        return res.redirect(nextUrl);
      });
    } catch (err) {
      return next(err);
    }
  });

  /* Related */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/related', async function (req, res) {
    let model = {};
    await flowUtils.setTopicModels(req, model);
    await flowUtils.setArgumentModels(req, model);
    await flowUtils.setQuestionModel(req, model);
    res.render(templates.wiki.related, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/test', function (req, res) {
    let model = {};
    res.render('dust/test/index', model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/vash', function (req, res) {
    let model = {
      message: 'hello world!',
    };
    res.render('vash/test.vash', model);
  });
};
