'use strict';

let mongoose = require('mongoose'),
  async = require('async'),
  paths = require('../models/paths'),
  templates = require('../models/templates'),
  utils = require('../utils/utils'),
  flowUtils = require('../utils/flowUtils'),
  constants = require('../models/constants'),
  db = require('../app').db.models;


module.exports = function(router) {

  router.get('/', async function(req, res) {
    await GET_index(req, res);
  });

  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await GET_entry(req, res);
  });

  /**
   * basic rule: id is the entry, query.topic or topic.parentId is the parent.
   */
  router.get('/create', async function(req, res) {
    await GET_create(req, res);
  });

  router.post('/create', async function(req, res) {
    await POST_create(req, res);
  });


  router.get('/entry(/:friendlyUrl)?/link/:id', async function(req, res) {
    await GET_link_entry(req, res);
  });

  router.get('/link/edit', async function(req, res) {
    await GET_link_edit(req, res);
  });

  router.post('/link/edit', async function(req, res) {
    await POST_link_edit(req, res);
  });

  /**
   * Place this here to prevent it from overriding /link/* paths
   */
  router.get('/:friendlyUrl/:id', async function(req, res) {
    await GET_index(req, res);
  });
};

module.exports.GET_index = GET_index;
module.exports.GET_entry = GET_entry;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;
module.exports.GET_link_entry = GET_link_entry;
module.exports.GET_link_edit = GET_link_edit;
module.exports.POST_link_edit = POST_link_edit;

async function GET_index(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  if (!req.query.topic && req.params.id) {
    req.query.topic = req.params.id;
  }
  await async.parallel({
    topic: async function() {
      await flowUtils.setTopicModels(req, model);
    },
    topics: async function() {
      // display 15 if top topics, all if has topic parameter
      model.topics = await flowUtils.getTopics({
        parentId: req.query.topic,
        'screening.status': model.screening.status,
      }, {
        limit: 0,
        req: req,
      });
    },
  });
  if (!model.topic || !flowUtils.isEntryOnIntendedUrl(req, res, model.topic)) return res.redirect('/');
  flowUtils.setScreeningModelCount(model, model.topic.childrenCount.topics);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.topics.index, model);
}

async function GET_entry(req, res) {
  // Topic home: display top subtopics, top arguments
  const model = {};
  flowUtils.ensureEntryIdParam(req, 'topic');
  await flowUtils.setTopicModels(req, model);
  if (!model.topic || !flowUtils.isEntryOnIntendedUrl(req, res, model.topic)) return res.redirect('/');
  if (!req.query.topic) req.query.topic = model.topic._id;
  flowUtils.setModelOwnerEntry(req, res, model);

  await async.parallel({
    categories: async function() {
      if (model.mainTopic) {
        let results = await flowUtils.getTopics({
          parentId: model.topic._id,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }, {
          limit: 0,
          shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
          req: req,
        });
        await async.each(results, async function(result) {
          let subTopics = await flowUtils.getTopics({
            parentId: result._id,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          }, {
            limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
            shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
            req: req,
          });
          result.subtopics = subTopics;
          // if subtopics are less than 3, get some arguments
          if (subTopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
            const query = {
              parentId: null,
              ownerId: result._id,
              ownerType: constants.OBJECT_TYPES.topic,
              'screening.status': constants.SCREENING_STATUS.status1.code,
            };
            let subArguments = await flowUtils.getArguments(query, {
              limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE - subTopics.length,
              req: req,
              shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
            });
            subArguments.forEach(function(subArgument) {
              flowUtils.setVerdictModel(subArgument);
            });
            flowUtils.sortArguments(subArguments);
            result.subarguments = subArguments;
          }
        });
        model.categories = results;
      }
    },
    topics: async function() {
      // Top Subtopics
      const query = { parentId: req.query.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
      let results = await flowUtils.getTopics(query, { limit: 15, req: req });
      model.topics = results;
      model.keyTopics = results.filter(function(result) {
        return result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
      });
      if (model.keyTopics.length > 0) {
        model.hasKeyEntries = true;
      }
    },
    links: async function() {
      // Top Linked Topics
      let query = { topicId: req.query.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
      let links = await db.TopicLink
        .find(query)
        .lean();
      if (links.length > 0) {
        model.linkCount = links.length + 1;
        const ids = links.map(function(link) {
          return link.parentId;
        });
        query = { _id: { $in: ids } };
        let results = await db.Topic
          .find(query)
          .sort({ title: 1 })
          .lean();
        if (results.length > 0) {
          model.topicLinks = results;
          results.forEach(function(result) {
            result.friendlyUrl = utils.urlify(result.title);
            const link = links.find(function(link) {
              return link.topicId.equals(result._id);
            });
            if (link) {
              result.link = link;
            }
          });
        }
      }
    },
    arguments: async function() {
      // Top Arguments
      const query = {
        parentId: null,
        ownerId: req.query.topic,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      let results = await flowUtils.getArguments(query, { limit: 0, req: req });
      results.forEach(function(result) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      model.arguments = results.slice(0, 15);
      model.keyArguments = results.filter(function(result) {
        return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
      });
      if (model.keyArguments.length > 0) {
        model.hasKeyEntries = true;
      }
      model.verdict = {
        counts: flowUtils.getVerdictCount(results),
      };
      return results;
    },
    questions: async function() {
      // Top Questions
      const query = {
        ownerId: req.query.topic,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      let results = await db.Question.find(query).limit(15);
      await flowUtils.setEditorsUsername(results);
      results.forEach(function(result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
    },
    artifacts: async function() {
      // Top Issues
      const query = {
        ownerId: req.query.topic,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopArtifacts(query, model, req);
    },
    issues: async function() {
      // Top Issues
      const query = {
        ownerId: req.query.topic,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopIssues(query, model, req);
    },
    opinions: async function() {
      // Top Opinions
      const query = {
        parentId: null,
        ownerId: req.query.topic,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  res.render(templates.wiki.topics.entry, model);
}

async function GET_create(req, res) {
  const model = {};
  await async.series({
    topic: async function() {
      if (req.query.id) {
        const result = await db.Topic.findOne({ _id: req.query.id });
        flowUtils.appendEntryExtras(result);
        model.topic = result;
      }
    },
    parentTopic: async function() {
      let query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
      if (query._id) {
        const result = await db.Topic.findOne(query);
        flowUtils.appendEntryExtras(result);
        model.parentTopic = result;
      }
    },
  });
  if (model.topic && !flowUtils.isEntryOwner(req, model.topic) || !model.topic && req.query.id) {
    // not the owner or doc not found, stop editing
    return res.redirect('/');
  }
  flowUtils.setModelContext(req, res, model);
  if (!model.topic && !model.parentTopic && !req.params.username && !req.user.isAdmin()) {
    // A public create on root topics but not an admin
    return res.redirect(model.wikiBaseUrl);
  }
  model.cancelUrl = flowUtils.buildTopicReturnUrl(model, model.wikiBaseUrl + paths.wiki.topics.entry, model.topic, model.parentTopic);
  res.render(templates.wiki.topics.create, model);
}

async function POST_create(req, res) {
  // https://stackoverflow.com/questions/17899750/how-can-i-generate-an-objectid-with-mongoose
  const query = { _id: req.query.id || new mongoose.Types.ObjectId() };
  const result = await db.Topic.findOne(query);
  if (result && !flowUtils.isEntryOwner(req, result)) {
    // not the owner, stop editing
    return res.redirect('/');
  }
  const entity = result ? result : {};
  let tags = req.body.topicTags;
  const dateNow = Date.now();
  if (tags && !(tags instanceof Array)) {
    tags = [tags];
  }
  entity.content = flowUtils.getEditorContent(req.body.content);
  entity.contentPreview = flowUtils.createContentPreview(entity.content);
  entity.title = req.body.title;
  entity.contextTitle = req.body.contextTitle;
  entity.references = flowUtils.getEditorContent(req.body.references);
  entity.friendlyUrl = utils.urlify(req.body.title);
  entity.editUserId = req.user.id;
  entity.editDate = dateNow;
  entity.referenceDate = req.body.referenceDate ? new Date(req.body.referenceDate) : null;
  entity.tags = tags ? tags : [];
  entity.icon = req.body.icon;
  if (!entity.ethicalStatus) {
    entity.ethicalStatus = {};
  }
  entity.ethicalStatus.hasValue = !!req.body.hasEthicalValue;
  entity.parentId = req.body.parent ? req.body.parent : null;
  if (!result) {
    entity.createUserId = req.user.id;
    entity.createDate = dateNow;
    flowUtils.initScreeningStatus(req, entity);
  }
  if (req.params.username) {
    entity.private = true;
    entity.ownerType = constants.OBJECT_TYPES.user;
    entity.ownerId = req.user.id;
  } else if (res.locals.group) {
    entity.private = true; // FIXME: what should I do with this? Probably good to retain this for data privacy safety.
    entity.ownerType = constants.OBJECT_TYPES.group;
    entity.ownerId = res.locals.group._id;
    entity.groupId = res.locals.group._id;
  } else if (!entity.parentId && !req.user.isAdmin()) {
    // root topic & not admin & not private - non-admins are not allowed to create categories
    return res.redirect('/');
  }
  await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.topic });
  const updatedEntity = await db.Topic.findOneAndUpdate(query, entity, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  const updateRedirect = function() {
    const model = {};
    flowUtils.setModelContext(req, res, model);
    const url = model.wikiBaseUrl + paths.wiki.topics.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
    res.redirect(url);
  };

  if (entity.parentId && !result) { // update parent count on create only
    await flowUtils.updateChildrenCount(updatedEntity.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic);
  }
  updateRedirect();
}

async function GET_link_entry(req, res) {
  const model = {};
  const ownerQuery = { ownerId: req.params.id, ownerType: constants.OBJECT_TYPES.topicLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  if (!flowUtils.isEntryOnIntendedUrl(req, res, model.topicLink)) {
    return res.redirect('/');
  }

  await async.parallel({
    topics: async function() {
      // Top Subtopics
      const query = {
        parentId: model.topicLink.topicId,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const results = await flowUtils.getTopics(query, { limit: 15, req: req });
      model.topics = results;
      model.keyTopics = results.filter(function(result) {
        return result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
      });
      if (model.keyTopics.length > 0) {
        model.hasKeyEntries = true;
      }
    },
    links: async function() {
      // Top Linked Topics
      const query = {
        topicId: model.topicLink.topicId,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const links = await db.TopicLink
        .find(query)
        .lean();
      if (links.length > 0) {
        model.linkCount = links.length + 1;
        const ids = links.map(function(link) {
          return link.parentId;
        });
        const query = { _id: { $in: ids } };
        const results = await db.Topic
          .find(query)
          .sort({ title: 1 })
          .lean();
        if (results.length > 0) {
          model.topicLinks = results;
          results.forEach(function(result) {
            result.friendlyUrl = utils.urlify(result.title);
            let link = links.find(function(link) {
              return link.topicId.equals(result._id);
            });
            if (link) {
              result.link = link;
            }
          });
        }
      }
    },
    arguments: async function() {
      // Top Arguments
      const query = {
        parentId: null,
        ownerId: model.topicLink.topicId,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const results = await flowUtils.getArguments(query, { limit: 0, req: req });
      results.forEach(function(result) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      model.arguments = results.slice(0, 15);
      model.keyArguments = results.filter(function(result) {
        return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
      });
      if (model.keyArguments.length > 0) {
        model.hasKeyEntries = true;
      }
      model.verdict = {
        counts: flowUtils.getVerdictCount(results),
      };
      return results;
    },
    questions: async function() {
      // Top Questions
      const query = {
        ownerId: model.topicLink.topicId,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopQuestions(query, model, req);
    },
    issues: async function() {
      // Top Issues
      const query = {
        ownerId: ownerQuery.ownerId,
        ownerType: ownerQuery.ownerType,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopIssues(query, model, req);
    },
    opinions: async function() {
      // Top Opinions
      const query = {
        parentId: null,
        ownerId: ownerQuery.ownerId,
        ownerType: ownerQuery.ownerType,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.topics.link.entry, model);

  /*async.series({
      entry: function (callback) {
          if(req.query.id) {
              db.TopicLink.findOne({_id: req.query.id}, function(err, link) {
                  model.link = link;
                  db.Topic.findOne({_id: link.topicId}, function(err, result) {
                      result.friendlyUrl = utils.urlify(result.title);
                      result.shortTitle = utils.getShortText(result.title);
                      model.topic = result;
                  });
              });
          }
      },
      parentEntry: function (callback) {
          let query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
          if(query._id) {
              db.Topic.findOne(query, function (err, result) {
                  result.friendlyUrl = utils.urlify(result.title);
                  result.shortTitle = utils.getShortText(result.title);
                  model.parentTopic = result;
              });
          }
      }
  }, function (err, results) {

  });*/
}

async function GET_link_edit(req, res) {
  const model = {};
  const ownerQuery = { ownerId: req.query.id, ownerType: constants.OBJECT_TYPES.topicLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  if (model.topicLink) {
    if (!flowUtils.isEntryOwner(req, model.topicLink)) {
      // VALIDATION: non-owners cannot update other's entry
      return res.redirect(flowUtils.buildReturnUrl(req));
    }
  }
  model.cancelUrl = flowUtils.buildReturnUrl(req);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.topics.link.edit, model);
  /*async.series({
      entry: function (callback) {
          if(req.query.id) {
              db.TopicLink.findOne({_id: req.query.id}, function(err, link) {
                  model.link = link;
                  db.Topic.findOne({_id: link.topicId}, function(err, result) {
                      result.friendlyUrl = utils.urlify(result.title);
                      result.shortTitle = utils.getShortText(result.title);
                      model.topic = result;
                  });
              });
          }
      },
      parentEntry: function (callback) {
          let query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
          if(query._id) {
              db.Topic.findOne(query, function (err, result) {
                  result.friendlyUrl = utils.urlify(result.title);
                  result.shortTitle = utils.getShortText(result.title);
                  model.parentTopic = result;
              });
          }
      }
  }, function (err, results) {

  });*/
}

async function POST_link_edit(req, res) {
  const action = req.body.action;
  if (action === 'delete') {
    if (!req.user.isAdmin()) {
      // VALIDATION: only admin can delete a link
      return res.redirect(flowUtils.buildReturnUrl(req));
    }
    let link = await db.TopicLink.findByIdAndDelete(req.query.id);
    await flowUtils.updateChildrenCount(link.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic);
    res.redirect(flowUtils.buildParentUrl(req, link));
  } else if (action === 'submit') {
    const query = { _id: req.query.id };
    let result = await db.TopicLink.findOne(query);
    if (result && !flowUtils.isEntryOwner(req, result)) {
      // VALIDATION: non-owners cannot update other's entry
      return res.redirect(flowUtils.buildReturnUrl(req));
    }
    const entity = result ? result : {};
    entity.title = req.body.title;
    entity.editUserId = req.user.id;
    entity.editDate = Date.now();
    if (!result) {
      flowUtils.initScreeningStatus(req, entity);
    }
    await db.TopicLink.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.redirect(flowUtils.buildReturnUrl(req));
  }
}
