// @ts-nocheck
'use strict';

let mongoose = require('mongoose'),
  async = require('async'),
  utils = require('../utils/utils'),
  flowUtils = require('../utils/flowUtils'),
  paths = require('../models/paths'),
  templates = require('../models/templates'),
  constants = require('../models/constants'),
  db = require('../app').db.models;

module.exports = function (router) {
  /* Arguments */

  router.get('/', async function (req, res) {
    await GET_index(req, res);
  });

  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await GET_entry(req, res);
  });

  router.get('/create', async function (req, res) {
    await GET_create(req, res);
  });

  router.post('/create', async function (req, res) {
    await POST_create(req, res);
  });

  router.get('/entry(/:friendlyUrl)?/link/:id', async function (req, res) {
    await GET_link_entry(req, res);
  });

  router.get('/link/edit', async function (req, res) {
    await GET_link_edit(req, res);
  });

  router.post('/link/edit', async function (req, res) {
    await POST_link_edit(req, res);
  });
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;
module.exports.GET_link_entry = GET_link_entry;
module.exports.GET_link_edit = GET_link_edit;
module.exports.POST_link_edit = POST_link_edit;

async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'argument');
  let ownerQuery = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument };
  await flowUtils.setEntryModels(ownerQuery, req, model);

  if (!flowUtils.isEntryOnIntendedUrl(req, res, model.argument)) {
    return res.redirect('/');
  }
  await async.parallel({
    arguments: async function () {
      // Top Arguments
      let query = {
        parentId: req.query.argument,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const results = await flowUtils.getArguments(query, { limit: 0, req: req });
      results.forEach(function (result) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      let support = results.filter(function (arg) {
        return !arg.against;
      });
      let contra = results.filter(function (arg) {
        return arg.against;
      });
      model.arguments = results;
      if (support.length > 0) {
        model.proArgumentCount = support.length;
        model.proArguments = support.slice(0, 15);
      }
      if (contra.length > 0) {
        model.conArgumentCount = contra.length;
        model.conArguments = contra.slice(0, 15);
      }
      return results;
    },
    links: async function () {
      let query = {
        argumentId: req.query.argument,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const links = await db.ArgumentLink.find(query);
      if (links.length > 0) {
        model.linkCount = links.length + 1;
        let ids = links
          .filter(function (link) {
            return link.ownerType === constants.OBJECT_TYPES.topic;
          })
          .map(function (link) {
            return link.ownerId;
          });
        let query = {
          _id: {
            $in: ids,
          },
        };
        const results = await db.Topic.find(query).sort({ title: 1 }).lean().exec();
        if (results.length > 0) {
          model.topicLinks = results;
          results.forEach(function (result) {
            result.friendlyUrl = utils.urlify(result.title);
          });
        }
      }
    },
    questions: async function () {
      // Top Questions
      let query = {
        ownerId: req.query.argument,
        ownerType: constants.OBJECT_TYPES.argument,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      const results = await db.Question.find(query).limit(15).sort({ title: 1 }).lean().exec();
      await flowUtils.setEditorsUsername(results);
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      model.questions = results;
      if (results.length >= 15) {
        model.questionsMore = true;
      }
    },
    issues: async function () {
      // Top Issues
      let query = {
        ownerId: req.query.argument,
        ownerType: constants.OBJECT_TYPES.argument,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopIssues(query, model, req);
    },
    opinions: async function () {
      // Top Opinions
      let query = {
        parentId: null,
        ownerId: req.query.argument,
        ownerType: constants.OBJECT_TYPES.argument,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.arguments.entry, model);
}

async function GET_index(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  if (model.topic) {
    flowUtils.setScreeningModel(req, model);
    if (
      (model.argument && !flowUtils.isEntryOnIntendedUrl(req, res, model.argument)) ||
      (model.topic && !flowUtils.isEntryOnIntendedUrl(req, res, model.topic))
    ) {
      return res.redirect('/');
    }
    const query = { 'screening.status': model.screening.status };
    if (req.query.argument) {
      query.parentId = model.argument._id;
    } else {
      query.parentId = null;
      query.ownerId = model.topic._id;
      query.ownerType = constants.OBJECT_TYPES.topic;
    }
    const results = await flowUtils.getArguments(query, { limit: 0, req: req });
    let support = results.filter(arg => !arg.against);
    let contra = results.filter(arg => arg.against);
    model.arguments = results;
    if (support.length > 0) {
      model.proArguments = support;
    }
    if (contra.length > 0) {
      model.conArguments = contra;
    }
    results.forEach(result => {
      flowUtils.setVerdictModel(result);
    });
    flowUtils.sortArguments(results);
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    flowUtils.setScreeningModelCount(model, model.entry.childrenCount['arguments']);
  } else {
    // Top Arguments
    const query = {
      ownerType: constants.OBJECT_TYPES.topic,
      private: false,
      'screening.status': constants.SCREENING_STATUS.status1.code,
    };
    //db.Argument.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
    const results = await db.Argument.find(query).sort({ editDate: -1 }).limit(25).lean();
    await flowUtils.setEditorsUsername(results);
    results.forEach(result => {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
      flowUtils.setVerdictModel(result);
    });
    //flowUtils.sortArguments(results);
    model.arguments = results;
    model.proArguments = results;
    flowUtils.setModelContext(req, res, model);
  }
  res.render(templates.wiki.arguments.index, model);
}

async function GET_create(req, res) {
  let model = {
    argumentTypes: constants.ARGUMENT_TYPES,
  };
  if (req.query.id) {
    req.query.argument = req.query.id;
  }
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  if (req.query.id) {
    delete req.query.argument;
  } else {
    delete model.argument;
  }
  await async.series({
    argument: async function () {
      if (req.query.id) {
        const result = await db.Argument.findOne({ _id: req.query.id });
        flowUtils.appendEntryExtras(result);
        model.argument = result;
      }
    },
    parentArgument: async () => {
      let query = { _id: req.query.argument || model.argument?.parentId || null };
      if (query._id) {
        const result = await db.Argument.findOne(query);
        flowUtils.appendEntryExtras(result);
        model.parentArgument = result;
      }
    },
  });
  if (
    (model.argument && !flowUtils.isEntryOwner(req, model.argument)) ||
    (!model.argument && req.query.id)
  ) {
    return res.redirect('/');
  }
  model.ARGUMENT_TAGS = constants.ARGUMENT_TAGS;
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.arguments.create, model);
}

async function POST_create(req, res) {
  let parent = null,
    entry = null,
    entity = null,
    updatedEntity = null;
  await async.series({
    parent: async function () {
      if (req.body.parent) {
        const result = await db.Argument.findOne({ _id: req.body.parent });
        result.friendlyUrl = utils.urlify(result.title);
        parent = result;
      }
    },
    update: async function () {
      let query = { _id: req.query.id || new mongoose.Types.ObjectId() };
      const result = await db.Argument.findOne(query);
      if (result && !flowUtils.isEntryOwner(req, result)) {
        throw new Error('Not allowed to update, not the owner.');
      }
      let tags = req.body.argumentTags;
      let dateNow = Date.now();
      if (tags && !(tags instanceof Array)) {
        tags = [tags];
      }
      entry = result;
      entity = result ? result : {};
      entity.content = flowUtils.getEditorContent(req.body.content);
      entity.contentPreview = flowUtils.createContentPreview(entity.content);
      entity.title = req.body.title;
      entity.references = flowUtils.getEditorContent(req.body.references);
      entity.friendlyUrl = utils.urlify(req.body.title);
      entity.referenceDate = req.body.referenceDate ? new Date(req.body.referenceDate) : null;
      entity.editUserId = req.user.id;
      entity.editDate = dateNow;
      entity.typeId = req.body.typeId;
      entity.against = !req.body.supportsParent;
      entity.tags = tags ? tags : [];
      if (!entity.ethicalStatus) {
        entity.ethicalStatus = {};
      }
      entity.ethicalStatus.hasValue = !!req.body.hasEthicalValue;
      if (parent) {
        // Parent is always an Argument
        // A child argument.
        entity.parentId = parent._id;
        entity.ownerId = parent.ownerId; // TODO: redundant??? Since you can derive this from the parent? But filtering will be easier this way.
        entity.ownerType = parent.ownerType; // TODO: redundant???
        entity.threadId = parent.threadId ? parent.threadId : parent._id;
      } else {
        // A root argument.
        entity.parentId = null;
        entity.threadId = null; // TODO: should set to self._id
        entity.against = false;
        if (req.query.topic) {
          // owner is a topic. Should the owner be specified only if it's a root argument, i.e. parent == null?
          entity.ownerId = req.query.topic;
          entity.ownerType = constants.OBJECT_TYPES.topic;
        }
        //if(!entity.ownerId) {} // Owner can be any object
      }
      if (!result) {
        entity.createUserId = req.user.id;
        entity.createDate = dateNow;
        flowUtils.initScreeningStatus(req, entity);
      }
      /*} else if(req.user.isAdmin()) {
         entity.createUserId = req.body.author;
         }*/
      await flowUtils.syncCategoryId(entity, { entryType: constants.OBJECT_TYPES.argument });
      updatedEntity = await db.Argument.findOneAndUpdate(query, entity, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
    },
  });
  if (!entry) {
    // if new entry, update parent count
    if (entity.parentId) {
      await flowUtils.updateChildrenCount(
        entity.parentId,
        constants.OBJECT_TYPES.argument,
        constants.OBJECT_TYPES.argument
      );
    } else {
      await flowUtils.updateChildrenCount(
        entity.ownerId,
        constants.OBJECT_TYPES.topic,
        constants.OBJECT_TYPES.argument
      );
    }
  }
  let model = {};
  flowUtils.setModelContext(req, res, model);
  let url =
    model.wikiBaseUrl +
    paths.wiki.arguments.entry +
    '/' +
    updatedEntity.friendlyUrl +
    '/' +
    updatedEntity._id;
  res.redirect(url);
}

async function GET_link_entry(req, res) {
  let model = {};
  let ownerQuery = { ownerId: req.params.id, ownerType: constants.OBJECT_TYPES.argumentLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  if (!flowUtils.isEntryOnIntendedUrl(req, res, model.argumentLink)) {
    return res.redirect('/');
  }
  await async.parallel({
    questions: async function () {
      // Top Questions
      let query = {
        ownerId: model.argumentLink.argumentId,
        ownerType: constants.OBJECT_TYPES.argument,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopQuestions(query, model, req);
    },
    issues: async function () {
      // Top Issues
      let query = {
        ownerId: ownerQuery.ownerId,
        ownerType: ownerQuery.ownerType,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopIssues(query, model, req);
    },
    opinions: async function () {
      // Top Opinions
      let query = {
        parentId: null,
        ownerId: ownerQuery.ownerId,
        ownerType: ownerQuery.ownerType,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      await flowUtils.getTopOpinions(query, model, req);
    },
  });
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.arguments.link.entry, model);
}

async function GET_link_edit(req, res) {
  let model = {};
  let ownerQuery = { ownerId: req.query.id, ownerType: constants.OBJECT_TYPES.argumentLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  if (model.argumentLink && !flowUtils.isEntryOwner(req, model.argumentLink)) {
    return res.redirect(flowUtils.buildReturnUrl(req));
  }
  model.cancelUrl = flowUtils.buildReturnUrl(req);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.arguments.link.edit, model);
}

async function POST_link_edit(req, res) {
  let action = req.body.action;
  if (action === 'delete') {
    if (!req.user.isAdmin()) {
      // VALIDATION: only admin can delete a link
      return res.redirect(flowUtils.buildReturnUrl(req));
    }
    const link = await db.ArgumentLink.findByIdAndDelete(req.query.id);
    if (link.parentId) {
      await flowUtils.updateChildrenCount(
        link.parentId,
        constants.OBJECT_TYPES.argument,
        constants.OBJECT_TYPES.argument
      );
    } else {
      await flowUtils.updateChildrenCount(
        link.ownerId,
        link.ownerType,
        constants.OBJECT_TYPES.argument
      );
    }
    res.redirect(flowUtils.buildParentUrl(req, link));
  } else if (action === 'submit') {
    let query = { _id: req.query.id };
    const result = await db.ArgumentLink.findOne(query);
    if (result && !flowUtils.isEntryOwner(req, result)) {
      // VALIDATION: non-owners cannot update other's entry
      return res.redirect(flowUtils.buildReturnUrl(req));
    }
    let entity = result ? result : {};
    entity.title = req.body.title;
    entity.editUserId = req.user.id;
    entity.editDate = Date.now();
    entity.against = !req.body.supportsParent;
    if (!result) {
      flowUtils.initScreeningStatus(req, entity);
    }
    await db.ArgumentLink.findOneAndUpdate(query, entity, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    res.redirect(flowUtils.buildReturnUrl(req));
  }
}
