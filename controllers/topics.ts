// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let mongoose = require('mongoose'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  async = require('async'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  paths = require('../models/paths'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  utils = require('../utils/utils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  db = require('../app').db.models;


// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function(router) {

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function(req, res) {
    await GET_index(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await GET_entry(req, res);
  });

  /**
   * basic rule: id is the entry, query.topic or topic.parentId is the parent.
   */
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/create', async function(req, res) {
    await GET_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/create', async function(req, res) {
    await POST_create(req, res);
  });


  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?/link/:id', async function(req, res) {
    await GET_link_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/link/edit', async function(req, res) {
    await GET_link_edit(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/link/edit', async function(req, res) {
    await POST_link_edit(req, res);
  });

  /**
   * Place this here to prevent it from overriding /link/* paths
   */
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:friendlyUrl/:id', async function(req, res) {
    await GET_index(req, res);
  });
};

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_index = GET_index;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_entry = GET_entry;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_create = GET_create;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.POST_create = POST_create;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_link_entry = GET_link_entry;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_link_edit = GET_link_edit;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.POST_link_edit = POST_link_edit;

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
      // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
      model.topics = await flowUtils.getTopics({
        parentId: req.query.topic,
        // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
        'screening.status': model.screening.status,
      }, {
        limit: 0,
        req: req,
      });
    },
  });
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (!model.topic || !flowUtils.isEntryOnIntendedUrl(req, res, model.topic)) return res.redirect('/');
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  flowUtils.setScreeningModelCount(model, model.topic.childrenCount.topics);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.topics.index, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_entry(req, res) {
  // Topic home: display top subtopics, top arguments
  const model = {};
  flowUtils.ensureEntryIdParam(req, 'topic');
  await flowUtils.setTopicModels(req, model);
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (!model.topic || !flowUtils.isEntryOnIntendedUrl(req, res, model.topic)) return res.redirect('/');
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (!req.query.topic) req.query.topic = model.topic._id;
  flowUtils.setModelOwnerEntry(req, res, model);

  await async.parallel({
    categories: async function() {
      // @ts-ignore TS(2339): Property 'mainTopic' does not exist on type '{}'.
      if (model.mainTopic) {
        let results = await flowUtils.getTopics({
          // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
          parentId: model.topic._id,
          'screening.status': constants.SCREENING_STATUS.status1.code,
        }, {
          limit: 0,
          shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
          req: req,
        });
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
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
            // @ts-ignore TS(7006): Parameter 'subArgument' implicitly has an 'any' ty... Remove this comment to see the full error message
            subArguments.forEach(function(subArgument) {
              flowUtils.setVerdictModel(subArgument);
            });
            flowUtils.sortArguments(subArguments);
            result.subarguments = subArguments;
          }
        });
        // @ts-ignore TS(2339): Property 'categories' does not exist on type '{}'.
        model.categories = results;
      }
    },
    topics: async function() {
      // Top Subtopics
      const query = { parentId: req.query.topic, 'screening.status': constants.SCREENING_STATUS.status1.code };
      let results = await flowUtils.getTopics(query, { limit: 15, req: req });
      // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
      model.topics = results;
      // @ts-ignore TS(2339): Property 'keyTopics' does not exist on type '{}'.
      model.keyTopics = results.filter(function(result) {
        return result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
      });
      // @ts-ignore TS(2339): Property 'keyTopics' does not exist on type '{}'.
      if (model.keyTopics.length > 0) {
        // @ts-ignore TS(2339): Property 'hasKeyEntries' does not exist on type '{... Remove this comment to see the full error message
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
        // @ts-ignore TS(2339): Property 'linkCount' does not exist on type '{}'.
        model.linkCount = links.length + 1;
        // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
        const ids = links.map(function(link) {
          return link.parentId;
        });
        // @ts-ignore TS(2322): Type '{ _id: { $in: any; }; }' is not assignable t... Remove this comment to see the full error message
        query = { _id: { $in: ids } };
        let results = await db.Topic
          .find(query)
          .sort({ title: 1 })
          .lean();
        if (results.length > 0) {
          // @ts-ignore TS(2339): Property 'topicLinks' does not exist on type '{}'.
          model.topicLinks = results;
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            result.friendlyUrl = utils.urlify(result.title);
            // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
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
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function(result) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
      model.arguments = results.slice(0, 15);
      // @ts-ignore TS(2339): Property 'keyArguments' does not exist on type '{}... Remove this comment to see the full error message
      model.keyArguments = results.filter(function(result) {
        return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
      });
      // @ts-ignore TS(2339): Property 'keyArguments' does not exist on type '{}... Remove this comment to see the full error message
      if (model.keyArguments.length > 0) {
        // @ts-ignore TS(2339): Property 'hasKeyEntries' does not exist on type '{... Remove this comment to see the full error message
        model.hasKeyEntries = true;
      }
      // @ts-ignore TS(2339): Property 'verdict' does not exist on type '{}'.
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
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function(result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_create(req, res) {
  const model = {};
  await async.series({
    topic: async function() {
      if (req.query.id) {
        const result = await db.Topic.findOne({ _id: req.query.id });
        flowUtils.appendEntryExtras(result);
        // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
        model.topic = result;
      }
    },
    parentTopic: async function() {
      // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
      let query = { _id: req.query.topic ? req.query.topic : model.topic && model.topic.parentId ? model.topic.parentId : null };
      if (query._id) {
        const result = await db.Topic.findOne(query);
        flowUtils.appendEntryExtras(result);
        // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
        model.parentTopic = result;
      }
    },
  });
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (model.topic && !flowUtils.isEntryOwner(req, model.topic) || !model.topic && req.query.id) {
    // not the owner or doc not found, stop editing
    return res.redirect('/');
  }
  flowUtils.setModelContext(req, res, model);
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (!model.topic && !model.parentTopic && !req.params.username && !req.user.isAdmin()) {
    // A public create on root topics but not an admin
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
    return res.redirect(model.wikiBaseUrl);
  }
  // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{}'.
  model.cancelUrl = flowUtils.buildTopicReturnUrl(model, model.wikiBaseUrl + paths.wiki.topics.entry, model.topic, model.parentTopic);
  res.render(templates.wiki.topics.create, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
    const url = model.wikiBaseUrl + paths.wiki.topics.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
    res.redirect(url);
  };

  if (entity.parentId && !result) { // update parent count on create only
    await flowUtils.updateChildrenCount(updatedEntity.parentId, constants.OBJECT_TYPES.topic, constants.OBJECT_TYPES.topic);
  }
  updateRedirect();
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_link_entry(req, res) {
  const model = {};
  const ownerQuery = { ownerId: req.params.id, ownerType: constants.OBJECT_TYPES.topicLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
  if (!flowUtils.isEntryOnIntendedUrl(req, res, model.topicLink)) {
    return res.redirect('/');
  }

  await async.parallel({
    topics: async function() {
      // Top Subtopics
      const query = {
        // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
        parentId: model.topicLink.topicId,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const results = await flowUtils.getTopics(query, { limit: 15, req: req });
      // @ts-ignore TS(2339): Property 'topics' does not exist on type '{}'.
      model.topics = results;
      // @ts-ignore TS(2339): Property 'keyTopics' does not exist on type '{}'.
      model.keyTopics = results.filter(function(result) {
        return result.tags.indexOf(constants.TOPIC_TAGS.tag20.code) >= 0;
      });
      // @ts-ignore TS(2339): Property 'keyTopics' does not exist on type '{}'.
      if (model.keyTopics.length > 0) {
        // @ts-ignore TS(2339): Property 'hasKeyEntries' does not exist on type '{... Remove this comment to see the full error message
        model.hasKeyEntries = true;
      }
    },
    links: async function() {
      // Top Linked Topics
      const query = {
        // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
        topicId: model.topicLink.topicId,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const links = await db.TopicLink
        .find(query)
        .lean();
      if (links.length > 0) {
        // @ts-ignore TS(2339): Property 'linkCount' does not exist on type '{}'.
        model.linkCount = links.length + 1;
        // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
        const ids = links.map(function(link) {
          return link.parentId;
        });
        const query = { _id: { $in: ids } };
        const results = await db.Topic
          .find(query)
          .sort({ title: 1 })
          .lean();
        if (results.length > 0) {
          // @ts-ignore TS(2339): Property 'topicLinks' does not exist on type '{}'.
          model.topicLinks = results;
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            result.friendlyUrl = utils.urlify(result.title);
            // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
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
        // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
        ownerId: model.topicLink.topicId,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const results = await flowUtils.getArguments(query, { limit: 0, req: req });
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function(result) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
      model.arguments = results.slice(0, 15);
      // @ts-ignore TS(2339): Property 'keyArguments' does not exist on type '{}... Remove this comment to see the full error message
      model.keyArguments = results.filter(function(result) {
        return result.tags.indexOf(constants.ARGUMENT_TAGS.tag20.code) >= 0;
      });
      // @ts-ignore TS(2339): Property 'keyArguments' does not exist on type '{}... Remove this comment to see the full error message
      if (model.keyArguments.length > 0) {
        // @ts-ignore TS(2339): Property 'hasKeyEntries' does not exist on type '{... Remove this comment to see the full error message
        model.hasKeyEntries = true;
      }
      // @ts-ignore TS(2339): Property 'verdict' does not exist on type '{}'.
      model.verdict = {
        counts: flowUtils.getVerdictCount(results),
      };
      return results;
    },
    questions: async function() {
      // Top Questions
      const query = {
        // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_link_edit(req, res) {
  const model = {};
  const ownerQuery = { ownerId: req.query.id, ownerType: constants.OBJECT_TYPES.topicLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
  if (model.topicLink) {
    // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
    if (!flowUtils.isEntryOwner(req, model.topicLink)) {
      // VALIDATION: non-owners cannot update other's entry
      return res.redirect(flowUtils.buildReturnUrl(req));
    }
  }
  // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{}'.
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
