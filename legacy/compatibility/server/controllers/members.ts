// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let mongoose = require('mongoose'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  paths = require('../models/paths'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'config'.
  config = require('../config/config'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  async = require('async'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'url'.
  url = require('url'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'jwt'.
  jwt = require('jsonwebtoken'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  utils = require('../utils/utils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {
  let prefix = '/:username/diary';

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function(req, res) {
    let model = {};
    // @ts-ignore TS(2339): Property 'contributors' does not exist on type '{}... Remove this comment to see the full error message
    model.contributors = await findMembers({ 'preferences.privateProfile': { $ne: true } });
    res.render(templates.members.contributors, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/screeners', async function(req, res) {
    let model = {};
    // @ts-ignore TS(2339): Property 'screeners' does not exist on type '{}'.
    model.screeners = await findMembers(
      { 'roles.screener': true, 'preferences.privateProfile': { $ne: true } });
    res.render(templates.members.screeners, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/reviewers', async function(req, res) {
    let model = {};
    // @ts-ignore TS(2339): Property 'reviewers' does not exist on type '{}'.
    model.reviewers = await findMembers(
      { 'roles.reviewer': true, 'preferences.privateProfile': { $ne: true } });
    res.render(templates.members.reviewers, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/administrators', async function(req, res) {
    let model = {};
    // @ts-ignore TS(2339): Property 'administrators' does not exist on type '... Remove this comment to see the full error message
    model.administrators = await findMembers({
      'roles.admin': { $exists: true }, 'preferences.privateProfile': { $ne: true },
    });
    res.render(templates.members.administrators, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
    let groupFilter = { createUserId: model.member._id, private: false };
    await flowUtils.countEntries(model, groupFilter);
    flowUtils.setModelContext(req, res, model);
    // @ts-ignore TS(2339): Property 'url' does not exist on type '{}'.
    model.url = model.profileBaseUrl + '/contributions';
    // @ts-ignore TS(2339): Property 'contributions' does not exist on type '{... Remove this comment to see the full error message
    model.contributions = model.totalCount;
    res.render(templates.members.profile.index, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/following', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.following, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/settings', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
    const results = await db.TrustedClient.find({ userId: model.member._id }).lean();
    let cookies = req.cookies.fast_switch || [];
    if (cookies.length > 0) {
      setcookieloop: for (let result of results) {
        for (let cookie of cookies) {
          if (result._id.equals(cookie.id)) {
            // @ts-ignore TS(2339): Property 'fastSwitch' does not exist on type '{}'.
            model.fastSwitch = true;
            break setcookieloop;
          }
        }
      }
    }
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.settings, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/:username/settings', async function(req, res) {
    let model = {};
    let postUpdateAction = function() {
      flowUtils.setModelContext(req, res, model);
      // @ts-ignore TS(2339): Property 'profileBaseUrl' does not exist on type '... Remove this comment to see the full error message
      res.redirect(model.profileBaseUrl);
    };
    await setMemberModel(model, req);
    let action = req.body.action;
    switch (action) {
      case 'preferences': {
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
        let preferences = model.member.preferences || {};
        preferences.privateProfile = !!req.body.privateProfile;
        let fieldsToSet = {
          preferences: preferences,
        };
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
        await req.app.db.models.User.findByIdAndUpdate(model.member._id, fieldsToSet);
        postUpdateAction();
        break;
      }
      case 'fast-switch': {
        let cookieName = 'fast_switch';
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
        const results = await db.TrustedClient.find({ userId: model.member._id })
          .lean();
        let now = new Date();
        let expiry = new Date(now.setMonth(now.getMonth() + 6));
        let cookies = req.cookies.fast_switch || [];
        if (req.body.fastSwitch === '1') {
          // validate pin
          // create or update trusted_client
          let pin = req.body.pin; // use jwt and server secret
          let encryptedUserId = jwt.sign(
            // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
            { userId: model.member._id },
            pin + '|' + config.jwtSecret,
          );
          let cookieFound = false;
          if (cookies.length > 0) {
            setcookieloop: for (let result of results) {
              for (let cookie of cookies) {
                if (result._id.equals(cookie.id)) {
                  // update existing pin
                  cookie.data = encryptedUserId;
                  cookie.created = now;
                  cookieFound = true;
                  break setcookieloop;
                }
              }
            }
          }

          if (!cookieFound) {
            let newClient = new db.TrustedClient({
              // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
              userId: model.member._id,
              clientIp: req.ip,
              userAgent: req.headers['user-agent'],
            });
            await newClient.save();
            let newCookie = {
              id: newClient._id,
              data: encryptedUserId,
              created: now,
            };
            cookies.push(newCookie);
            res.cookie(cookieName, cookies, { expires: expiry });
            postUpdateAction();
          } else {
            res.cookie(cookieName, cookies, { expires: expiry });
            postUpdateAction();
          }
        } else {
          let clientToDelete = null;
          clearcookieloop: for (let result of results) {
            for (let i = 0; i < cookies.length; i++) {
              let cookie = cookies[i];
              if (result._id.equals(cookie.id)) {
                clientToDelete = result;
                await db.TrustedClient.findByIdAndRemove(
                  clientToDelete._id);
                if (cookies.length === 1) {
                  res.clearCookie(cookieName);
                } else {
                  cookies.splice(i, 1);
                  res.cookie(cookieName, cookies, { expires: expiry });
                }
                postUpdateAction();
                break clearcookieloop;
              }
            }
          }
          if (!clientToDelete) {
            postUpdateAction();
          }
        }
        break;
      }

      default:
        postUpdateAction();
    }
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/contributions', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    let tab = req.query.tab ? req.query.tab : 'all';
    let LIMIT = tab === 'all' ? 15 : 0; //let LIMIT = req.query.tab ? 25 : 15;
    // @ts-ignore TS(2339): Property 'tab' does not exist on type '{}'.
    model.tab = tab;
    // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
    model.results = tab !== 'all';
    // @ts-ignore TS(2339): Property 'url' does not exist on type '{}'.
    model.url = '/members/' + model.member.username + '/contributions';
    await async.parallel(
      {
        topics: async function() {
          if (tab !== 'all' && tab !== 'topics') return;
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Topic.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
          model.topics = results;
          if (results.length > 0) {
            if (results.length === 15) {
              // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{}'.
              model.topicsMore = true;
            }
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
        arguments: async function() {
          if (tab !== 'all' && tab !== 'arguments') return;
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Argument.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
            flowUtils.setVerdictModel(result);
          });
          flowUtils.sortArguments(results);
          // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
          model.arguments = results;
          if (results.length > 0) {
            if (results.length === 15) {
              // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
              model.argumentsMore = true;
            }
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
        artifacts: async function() {
          if (tab !== 'all' && tab !== 'artifacts') return;
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Artifact.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
          });
          // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{}'.
          model.artifacts = results;
          if (results.length > 0) {
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
        questions: async function() {
          if (tab !== 'all' && tab !== 'questions') return;
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Question.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
          });
          // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
          model.questions = results;
          if (results.length > 0) {
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
        answers: async function() {
          if (tab !== 'all' && tab !== 'answers') return;
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Answer.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
          });
          // @ts-ignore TS(2339): Property 'answers' does not exist on type '{}'.
          model.answers = results;
          if (results.length > 0) {
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
        issues: async function() {
          if (tab !== 'all' && tab !== 'issues') {
            return;
          }
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Issue.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
          });
          // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
          model.issues = results;
          if (results.length > 0) {
            if (results.length === 15) {
              // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{}'.
              model.issuesMore = true;
            }
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
        opinions: async function() {
          if (tab !== 'all' && tab !== 'opinions') return;
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
          const results = await db.Opinion.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
          await flowUtils.setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
          });
          // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{}'.
          model.opinions = results;
          if (results.length > 0) {
            if (results.length === 15) {
              // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{}... Remove this comment to see the full error message
              model.opinionsMore = true;
            }
            // @ts-ignore TS(2339): Property 'results' does not exist on type '{}'.
            model.results = true;
          }
        },
      },
    );
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.contributions, model);
  });

  /* Member Pages */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/pages', async function(req, res) {
    let model = {};
    flowUtils.setModelContext(req, res, model);
    await setMemberModel(model, req);
    await async.parallel(
      {
        parent: async function() {
          if (req.query.parent) {
            const result = await db.Page.findOne({ _id: req.query.parent });
            // @ts-ignore TS(2339): Property 'page' does not exist on type '{}'.
            model.page = result;
            flowUtils.appendOwnerFlag(req, result, model);
          }
        },
        pages: async function() {
          let query = req.query.parent
            ? {
              // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
              createUserId: model.member._id,
              parentId: req.query.parent,
            }
            // @ts-ignore TS(2339): Property 'member' does not exist on type '{}'.
            : { createUserId: model.member._id };
          const results = await db.Page.find(query)
            .sort({ title: 1 });
          if (req.query.parent) {
            // @ts-ignore TS(2339): Property 'pages' does not exist on type '{}'.
            model.pages = results;
          } else {
            // Return pages with hierarchy
            // @ts-ignore TS(7034): Variable 'nodes' implicitly has type 'any[]' in so... Remove this comment to see the full error message
            let nodes = [];
            // Build parent pages
            // @ts-ignore TS(7006): Parameter 'page' implicitly has an 'any' type.
            results.forEach(function(page) {
              if (!page.parentId) {
                nodes.push(page);
              }
            });
            // @ts-ignore TS(7006): Parameter 'page' implicitly has an 'any' type.
            results.forEach(function(page) {
              if (page.parentId) {
                // @ts-ignore TS(7005): Variable 'nodes' implicitly has an 'any[]' type.
                let parents = nodes.filter(function(p) {
                  return p._id.equals(page.parentId);
                });
                let parent = parents.length > 0 ? parents[0] : null;
                if (parent) {
                  if (!parent.children) {
                    parent.children = [];
                  }
                  parent.children.push(page);
                } else {
                  // parent not found, add as orphan
                  nodes.push(page);
                }
              } else {
                // no parent, if not existing, add as orphan
                // @ts-ignore TS(7005): Variable 'nodes' implicitly has an 'any[]' type.
                let orphans = nodes.filter(function(p) {
                  return p._id.equals(page._id);
                });
                let orphan = orphans.length > 0 ? orphans[0] : null;
                if (!orphan) {
                  nodes.push(page);
                }
              }
            });
            // @ts-ignore TS(2339): Property 'pageNodes' does not exist on type '{}'.
            model.pageNodes = nodes;
          }
        },
      },
    );
    if (!req.query.parent) {
      // @ts-ignore TS(2339): Property 'pagesRoot' does not exist on type '{}'.
      model.pagesRoot = true;
    }
    res.render(templates.members.profile.pages.index, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/pages/create', async function(req, res) {
    let model = {};
    flowUtils.setModelContext(req, res, model);
    await setMemberModel(model, req);
    if (req.user && req.user.id) {
      await async.parallel(
        {
          parent: async function() {
            if (req.query.parent) {
              // @ts-ignore TS(2339): Property 'parent' does not exist on type '{}'.
              model.parent = await db.Page.findOne({ _id: req.query.parent });
              //flowUtils.appendOwnerFlag(req, result, model);
            }
          },
          page: async function() {
            if (req.query.id) {
              // @ts-ignore TS(2339): Property 'page' does not exist on type '{}'.
              model.page = await db.Page.findOne({ createUserId: req.user.id, _id: req.query.id });
            }
          },
        },
      );
    }
    res.render(templates.members.profile.pages.create, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/pages(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    await async.parallel(
      {
        parent: async function() {
          if (req.query.parent) {
            // @ts-ignore TS(2339): Property 'parent' does not exist on type '{}'.
            model.parent = await db.Page.findOne({ _id: req.query.parent });
          }
        },
        page: async function() {
          const result = await db.Page.findOne({ _id: req.params.id });
          // @ts-ignore TS(2339): Property 'page' does not exist on type '{}'.
          model.page = result;
          flowUtils.appendOwnerFlag(req, result, model);
        },
      },
    );
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.pages.page, model);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/:username/pages/create', async function(req, res) {
    let query = {
      _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId(),
    };
    const result = await db.Page.findOne(query);

    let dateNow = Date.now();
    let entity = result ? result : {};
    entity.content = req.body.content;
    entity.title = req.body.title;
    entity.friendlyUrl = utils.urlify(req.body.title);
    entity.editUserId = req.user.id;
    entity.editDate = dateNow;
    if (!result) {
      entity.createUserId = req.user.id;
      entity.createDate = dateNow;
    }
    if (req.query.parent) {
      entity.parentId = req.query.parent;
    } else if (entity.parentId) {
      entity.parentId = null;
    }

    const updatedEntity = await db.Page.findOneAndUpdate(
      query,
      entity,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    let model = {};
    flowUtils.setModelContext(req, res, model);
    if (result) {
      res.redirect(
        // @ts-ignore TS(2339): Property 'profileBaseUrl' does not exist on type '... Remove this comment to see the full error message
        model.profileBaseUrl +
        paths.members.profile.pages.index +
        '/' +
        updatedEntity.friendlyUrl +
        '/' +
        updatedEntity._id +
        (req.query.parent ? '?parent=' + req.query.parent : ''),
      );
    } else {
      // @ts-ignore TS(2339): Property 'profileBaseUrl' does not exist on type '... Remove this comment to see the full error message
      res.redirect(model.profileBaseUrl + paths.members.profile.pages.index);
    }
  });

  /* Diary Topics */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get(prefix, async function(req, res) {
    let LIMIT = req.query.tab ? 25 : 15;
    let allTabs = !req.query.tab;
    let tab = req.query.tab ? req.query.tab : 'all';
    let baseUrl = url.parse(req.originalUrl);
    let model = {
      tab: tab,
      url: baseUrl.pathname,
    };
    await async.series(
      {
        user: async function() {
          await setMemberModel(model, req);
        },
        categories: async function() {
          const results = await db.Topic.find({
            parentId: null,
            ownerType: constants.OBJECT_TYPES.user,
            // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
            ownerId: model.member._id,
          })
            .sort({ title: 1 })
            .lean();
          await async.each(
            results,
            // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
            async function(result) {
              result.friendlyUrl = utils.urlify(result.title);
              const subTopics = await flowUtils.getTopics(
                { parentId: result._id },
                {
                  limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
                  req: req,
                  shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
                },
              );
              if (subTopics.length > 0) {
                result.subtopics = subTopics;
              }
              // if subtopics are less than SUBCATEGORY_LIST_SIZE, get some arguments
              if (subTopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
                let query = {
                  parentId: null,
                  ownerId: result._id,
                  ownerType: constants.OBJECT_TYPES.topic,
                };
                const subArgs = await flowUtils.getArguments(
                  query,
                  {
                    limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE - subTopics.length,
                    req: req,
                    shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
                  },
                );
                // @ts-ignore TS(7006): Parameter 'subargument' implicitly has an 'any' ty... Remove this comment to see the full error message
                subArgs.forEach(function(subargument) {
                  flowUtils.setVerdictModel(subargument);
                });
                flowUtils.sortArguments(subArgs);
                result.subarguments = subArgs;
              }
            },
          );
          // @ts-ignore TS(2339): Property 'categories' does not exist on type '{ ta... Remove this comment to see the full error message
          model.categories = results;
        },
        rootTopics: async function() {
          // display 15 if top topics, all if has topic parameter
          // @ts-ignore TS(2339): Property 'rootTopics' does not exist on type '{ ta... Remove this comment to see the full error message
          model.rootTopics = await flowUtils.getTopics(
            {
              parentId: null,
              ownerType: constants.OBJECT_TYPES.user,
              // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
              ownerId: model.member._id,
            },
            { limit: 0, req: req },
          );
        },
      },
    );
    flowUtils.setModelContext(req, res, model);
    flowUtils.setClipboardModel(req, model);

    async.parallel({
      topics: async function() {
        if (!allTabs && model.tab !== 'topics') {
          return;
        }
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
        let query = { private: true, createUserId: model.member._id };
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Topic.find(query).sort({ editDate: -1 }).limit(LIMIT);
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
        });
        // @ts-ignore TS(2339): Property 'topics' does not exist on type '{ tab: a... Remove this comment to see the full error message
        model.topics = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'topicsMore' does not exist on type '{ ta... Remove this comment to see the full error message
            model.topicsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      arguments: async function() {
        if (!allTabs && model.tab !== 'arguments') return;
        //let query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: true,
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
          createUserId: model.member._id,
        };
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Argument.find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
          flowUtils.setVerdictModel(result);
        });
        // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{ tab... Remove this comment to see the full error message
        model.arguments = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'argumentsMore' does not exist on type '{... Remove this comment to see the full error message
            model.argumentsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      questions: async function() {
        if (!allTabs && model.tab !== 'questions') return;
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: true,
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
          createUserId: model.member._id,
        };
        //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Question.find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
        });
        // @ts-ignore TS(2339): Property 'questions' does not exist on type '{ tab... Remove this comment to see the full error message
        model.questions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
            model.questionsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      answers: async function() {
        if (!allTabs && model.tab !== 'answers') return;
        //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
        let query = { private: true, createUserId: model.member._id };
        const results = await db.Answer.find(query).sort({ editDate: -1 }).limit(LIMIT).lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        // @ts-ignore TS(2339): Property 'answers' does not exist on type '{ tab: ... Remove this comment to see the full error message
        model.answers = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'answersMore' does not exist on type '{ t... Remove this comment to see the full error message
            model.answersMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      artifacts: async function() {
        if (!allTabs && model.tab !== 'artifacts') return;
        //let query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: true,
          // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
          createUserId: model.member._id,
        };
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Artifact.find(query).sort({ editDate: -1 }).limit(LIMIT);
        //.lean()
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(result => {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
          result.setThumbnailPath(req.params.username);
        });
        // @ts-ignore TS(2339): Property 'artifacts' does not exist on type '{ tab... Remove this comment to see the full error message
        model.artifacts = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'artifactsMore' does not exist on type '{... Remove this comment to see the full error message
            model.artifactsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      issues: async function() {
        if (!allTabs && model.tab !== 'issues') return;
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
        let query = { private: true, createUserId: model.member._id };
        const results = await db.Issue.find(query).sort({ editDate: -1 }).limit(LIMIT).lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
        });
        // @ts-ignore TS(2339): Property 'issues' does not exist on type '{ tab: a... Remove this comment to see the full error message
        model.issues = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'issuesMore' does not exist on type '{ ta... Remove this comment to see the full error message
            model.issuesMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
      opinions: async function() {
        if (!allTabs && model.tab !== 'opinions') {
          return;
        }
        // @ts-ignore TS(2339): Property 'member' does not exist on type '{ tab: a... Remove this comment to see the full error message
        let query = { private: true, createUserId: model.member._id };
        const results = await db.Opinion.find(query).sort({ editDate: -1 }).limit(LIMIT).lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
        await flowUtils.setEditorsUsername(results);
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
        });
        // @ts-ignore TS(2339): Property 'opinions' does not exist on type '{ tab:... Remove this comment to see the full error message
        model.opinions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            // @ts-ignore TS(2339): Property 'opinionsMore' does not exist on type '{ ... Remove this comment to see the full error message
            model.opinionsMore = true;
          }
          // @ts-ignore TS(2339): Property 'results' does not exist on type '{ tab: ... Remove this comment to see the full error message
          model.results = true;
        }
      },
    });
    flowUtils.createEntrySet(model);
    res.render(templates.members.profile.topics, model);
  });

  flowUtils.setupEntryRouters(router, prefix);
};

// @ts-ignore TS(7006): Parameter 'memberFilter' implicitly has an 'any' t... Remove this comment to see the full error message
async function findMembers(memberFilter) {
  const results = await db.User.find(memberFilter)
    .populate('roles.account', 'name.full')
    .sort({ title: 1 })
    .lean();
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  results.forEach(function(result) {
    flowUtils.setMemberFullname(result);
  });
  return results;
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
async function setMemberModel(model, req) {
  if (req.params.username) {
    if (req.user && req.user.username === req.params.username) {
      model.member = req.user;
      model.loggedIn = true;
    } else {
      model.member = await db.User.findOne({ username: req.params.username });
    }
  }
}
