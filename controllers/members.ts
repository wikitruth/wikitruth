// @ts-nocheck
'use strict';

let mongoose = require('mongoose'),
  templates = require('../models/templates'),
  paths = require('../models/paths'),
  config = require('../config/config'),
  async = require('async'),
  url = require('url'),
  jwt = require('jsonwebtoken'),
  flowUtils = require('../utils/flowUtils'),
  utils = require('../utils/utils'),
  constants = require('../models/constants'),
  db = require('../app').db.models;

module.exports = function(router) {
  let prefix = '/:username/diary';

  router.get('/', async function(req, res) {
    let model = {};
    model.contributors = await findMembers({ 'preferences.privateProfile': { $ne: true } });
    res.render(templates.members.contributors, model);
  });

  router.get('/screeners', async function(req, res) {
    let model = {};
    model.screeners = await findMembers(
      { 'roles.screener': true, 'preferences.privateProfile': { $ne: true } });
    res.render(templates.members.screeners, model);
  });

  router.get('/reviewers', async function(req, res) {
    let model = {};
    model.reviewers = await findMembers(
      { 'roles.reviewer': true, 'preferences.privateProfile': { $ne: true } });
    res.render(templates.members.reviewers, model);
  });

  router.get('/administrators', async function(req, res) {
    let model = {};
    model.administrators = await findMembers({
      'roles.admin': { $exists: true }, 'preferences.privateProfile': { $ne: true },
    });
    res.render(templates.members.administrators, model);
  });

  router.get('/:username', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    let groupFilter = { createUserId: model.member._id, private: false };
    await flowUtils.countEntries(model, groupFilter);
    flowUtils.setModelContext(req, res, model);
    model.url = model.profileBaseUrl + '/contributions';
    model.contributions = model.totalCount;
    res.render(templates.members.profile.index, model);
  });

  router.get('/:username/following', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.following, model);
  });

  router.get('/:username/settings', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    const results = await db.TrustedClient.find({ userId: model.member._id }).lean();
    let cookies = req.cookies.fast_switch || [];
    if (cookies.length > 0) {
      setcookieloop: for (let result of results) {
        for (let cookie of cookies) {
          if (result._id.equals(cookie.id)) {
            model.fastSwitch = true;
            break setcookieloop;
          }
        }
      }
    }
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.settings, model);
  });

  router.post('/:username/settings', async function(req, res) {
    let model = {};
    let postUpdateAction = function() {
      flowUtils.setModelContext(req, res, model);
      res.redirect(model.profileBaseUrl);
    };
    await setMemberModel(model, req);
    let action = req.body.action;
    switch (action) {
      case 'preferences': {
        let preferences = model.member.preferences || {};
        preferences.privateProfile = !!req.body.privateProfile;
        let fieldsToSet = {
          preferences: preferences,
        };
        await req.app.db.models.User.findByIdAndUpdate(model.member._id, fieldsToSet);
        postUpdateAction();
        break;
      }
      case 'fast-switch': {
        let cookieName = 'fast_switch';
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

  router.get('/:username/contributions', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    let tab = req.query.tab ? req.query.tab : 'all';
    let LIMIT = tab === 'all' ? 15 : 0; //let LIMIT = req.query.tab ? 25 : 15;
    model.tab = tab;
    model.results = tab !== 'all';
    model.url = '/members/' + model.member.username + '/contributions';
    await async.parallel(
      {
        topics: async function() {
          if (tab !== 'all' && tab !== 'topics') return;
          const results = await db.Topic.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.topics = results;
          if (results.length > 0) {
            if (results.length === 15) {
              model.topicsMore = true;
            }
            model.results = true;
          }
        },
        arguments: async function() {
          if (tab !== 'all' && tab !== 'arguments') return;
          const results = await db.Argument.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
            flowUtils.setVerdictModel(result);
          });
          flowUtils.sortArguments(results);
          model.arguments = results;
          if (results.length > 0) {
            if (results.length === 15) {
              model.argumentsMore = true;
            }
            model.results = true;
          }
        },
        artifacts: async function() {
          if (tab !== 'all' && tab !== 'artifacts') return;
          const results = await db.Artifact.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
          });
          model.artifacts = results;
          if (results.length > 0) {
            model.results = true;
          }
        },
        questions: async function() {
          if (tab !== 'all' && tab !== 'questions') return;
          const results = await db.Question.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
          });
          model.questions = results;
          if (results.length > 0) {
            model.results = true;
          }
        },
        answers: async function() {
          if (tab !== 'all' && tab !== 'answers') return;
          const results = await db.Answer.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
          });
          model.answers = results;
          if (results.length > 0) {
            model.results = true;
          }
        },
        issues: async function() {
          if (tab !== 'all' && tab !== 'issues') {
            return;
          }
          const results = await db.Issue.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
          });
          model.issues = results;
          if (results.length > 0) {
            if (results.length === 15) {
              model.issuesMore = true;
            }
            model.results = true;
          }
        },
        opinions: async function() {
          if (tab !== 'all' && tab !== 'opinions') return;
          const results = await db.Opinion.find({ createUserId: model.member._id, private: false })
            .sort({ editDate: -1 })
            .limit(LIMIT)
            .lean();
          await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
          await flowUtils.setEditorsUsername(results);
          results.forEach(function(result) {
            flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
          });
          model.opinions = results;
          if (results.length > 0) {
            if (results.length === 15) {
              model.opinionsMore = true;
            }
            model.results = true;
          }
        },
      },
    );
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.contributions, model);
  });

  /* Member Pages */

  router.get('/:username/pages', async function(req, res) {
    let model = {};
    flowUtils.setModelContext(req, res, model);
    await setMemberModel(model, req);
    await async.parallel(
      {
        parent: async function() {
          if (req.query.parent) {
            const result = await db.Page.findOne({ _id: req.query.parent });
            model.page = result;
            flowUtils.appendOwnerFlag(req, result, model);
          }
        },
        pages: async function() {
          let query = req.query.parent
            ? {
              createUserId: model.member._id,
              parentId: req.query.parent,
            }
            : { createUserId: model.member._id };
          const results = await db.Page.find(query)
            .sort({ title: 1 });
          if (req.query.parent) {
            model.pages = results;
          } else {
            // Return pages with hierarchy
            let nodes = [];
            // Build parent pages
            results.forEach(function(page) {
              if (!page.parentId) {
                nodes.push(page);
              }
            });
            results.forEach(function(page) {
              if (page.parentId) {
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
                let orphans = nodes.filter(function(p) {
                  return p._id.equals(page._id);
                });
                let orphan = orphans.length > 0 ? orphans[0] : null;
                if (!orphan) {
                  nodes.push(page);
                }
              }
            });
            model.pageNodes = nodes;
          }
        },
      },
    );
    if (!req.query.parent) {
      model.pagesRoot = true;
    }
    res.render(templates.members.profile.pages.index, model);
  });

  router.get('/:username/pages/create', async function(req, res) {
    let model = {};
    flowUtils.setModelContext(req, res, model);
    await setMemberModel(model, req);
    if (req.user && req.user.id) {
      await async.parallel(
        {
          parent: async function() {
            if (req.query.parent) {
              model.parent = await db.Page.findOne({ _id: req.query.parent });
              //flowUtils.appendOwnerFlag(req, result, model);
            }
          },
          page: async function() {
            if (req.query.id) {
              model.page = await db.Page.findOne({ createUserId: req.user.id, _id: req.query.id });
            }
          },
        },
      );
    }
    res.render(templates.members.profile.pages.create, model);
  });

  router.get('/:username/pages(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    let model = {};
    await setMemberModel(model, req);
    await async.parallel(
      {
        parent: async function() {
          if (req.query.parent) {
            model.parent = await db.Page.findOne({ _id: req.query.parent });
          }
        },
        page: async function() {
          const result = await db.Page.findOne({ _id: req.params.id });
          model.page = result;
          flowUtils.appendOwnerFlag(req, result, model);
        },
      },
    );
    flowUtils.setModelContext(req, res, model);
    res.render(templates.members.profile.pages.page, model);
  });

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
        model.profileBaseUrl +
        paths.members.profile.pages.index +
        '/' +
        updatedEntity.friendlyUrl +
        '/' +
        updatedEntity._id +
        (req.query.parent ? '?parent=' + req.query.parent : ''),
      );
    } else {
      res.redirect(model.profileBaseUrl + paths.members.profile.pages.index);
    }
  });

  /* Diary Topics */

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
            ownerId: model.member._id,
          })
            .sort({ title: 1 })
            .lean();
          await async.each(
            results,
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
                subArgs.forEach(function(subargument) {
                  flowUtils.setVerdictModel(subargument);
                });
                flowUtils.sortArguments(subArgs);
                result.subarguments = subArgs;
              }
            },
          );
          model.categories = results;
        },
        rootTopics: async function() {
          // display 15 if top topics, all if has topic parameter
          model.rootTopics = await flowUtils.getTopics(
            {
              parentId: null,
              ownerType: constants.OBJECT_TYPES.user,
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
        let query = { private: true, createUserId: model.member._id };
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Topic.find(query).sort({ editDate: -1 }).limit(LIMIT);
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
        });
        model.topics = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.topicsMore = true;
          }
          model.results = true;
        }
      },
      arguments: async function() {
        if (!allTabs && model.tab !== 'arguments') return;
        //let query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: true,
          createUserId: model.member._id,
        };
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Argument.find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
          flowUtils.setVerdictModel(result);
        });
        model.arguments = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.argumentsMore = true;
          }
          model.results = true;
        }
      },
      questions: async function() {
        if (!allTabs && model.tab !== 'questions') return;
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: true,
          createUserId: model.member._id,
        };
        //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Question.find(query)
          .sort({ editDate: -1 })
          .limit(LIMIT)
          .lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
        });
        model.questions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.questionsMore = true;
          }
          model.results = true;
        }
      },
      answers: async function() {
        if (!allTabs && model.tab !== 'answers') return;
        //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        let query = { private: true, createUserId: model.member._id };
        const results = await db.Answer.find(query).sort({ editDate: -1 }).limit(LIMIT).lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.answer, req);
        });
        model.answers = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.answersMore = true;
          }
          model.results = true;
        }
      },
      artifacts: async function() {
        if (!allTabs && model.tab !== 'artifacts') return;
        //let query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
        let query = {
          ownerType: constants.OBJECT_TYPES.topic,
          private: true,
          createUserId: model.member._id,
        };
        //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
        const results = await db.Artifact.find(query).sort({ editDate: -1 }).limit(LIMIT);
        //.lean()
        await flowUtils.setEditorsUsername(results);
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.artifact);
        results.forEach(result => {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
          result.setThumbnailPath(req.params.username);
        });
        model.artifacts = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.artifactsMore = true;
          }
          model.results = true;
        }
      },
      issues: async function() {
        if (!allTabs && model.tab !== 'issues') return;
        let query = { private: true, createUserId: model.member._id };
        const results = await db.Issue.find(query).sort({ editDate: -1 }).limit(LIMIT).lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
        });
        model.issues = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.issuesMore = true;
          }
          model.results = true;
        }
      },
      opinions: async function() {
        if (!allTabs && model.tab !== 'opinions') {
          return;
        }
        let query = { private: true, createUserId: model.member._id };
        const results = await db.Opinion.find(query).sort({ editDate: -1 }).limit(LIMIT).lean();
        await flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion);
        await flowUtils.setEditorsUsername(results);
        results.forEach(function(result) {
          flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
        });
        model.opinions = results;
        if (results.length > 0) {
          if (allTabs && results.length >= LIMIT) {
            model.opinionsMore = true;
          }
          model.results = true;
        }
      },
    });
    flowUtils.createEntrySet(model);
    res.render(templates.members.profile.topics, model);
  });

  flowUtils.setupEntryRouters(router, prefix);
};

async function findMembers(memberFilter) {
  const results = await db.User.find(memberFilter)
    .populate('roles.account', 'name.full')
    .sort({ title: 1 })
    .lean();
  results.forEach(function(result) {
    flowUtils.setMemberFullname(result);
  });
  return results;
}

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
