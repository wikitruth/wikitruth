// @ts-ignore TS(6200): Definitions of the following identifiers conflict ... Remove this comment to see the full error message
'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let mongoose = require('mongoose'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  async = require('async'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  utils = require('../utils/utils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  paths = require('../models/paths'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  templates = require('../models/templates'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  /* Arguments */

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    await GET_index(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await GET_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/create', async function (req, res) {
    await GET_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/create', async function (req, res) {
    await POST_create(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry(/:friendlyUrl)?/link/:id', async function (req, res) {
    await GET_link_entry(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/link/edit', async function (req, res) {
    await GET_link_edit(req, res);
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/link/edit', async function (req, res) {
    await POST_link_edit(req, res);
  });
};

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_entry = GET_entry;
// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_index = GET_index;
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
async function GET_entry(req, res) {
  let model = {};
  flowUtils.ensureEntryIdParam(req, 'argument');
  let ownerQuery = { ownerId: req.query.argument, ownerType: constants.OBJECT_TYPES.argument };
  await flowUtils.setEntryModels(ownerQuery, req, model);

  // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
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
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.setVerdictModel(result);
      });
      flowUtils.sortArguments(results);
      // @ts-ignore TS(7006): Parameter 'arg' implicitly has an 'any' type.
      let support = results.filter(function (arg) {
        return !arg.against;
      });
      // @ts-ignore TS(7006): Parameter 'arg' implicitly has an 'any' type.
      let contra = results.filter(function (arg) {
        return arg.against;
      });
      // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
      model.arguments = results;
      if (support.length > 0) {
        // @ts-ignore TS(2339): Property 'proArgumentCount' does not exist on type... Remove this comment to see the full error message
        model.proArgumentCount = support.length;
        // @ts-ignore TS(2339): Property 'proArguments' does not exist on type '{}... Remove this comment to see the full error message
        model.proArguments = support.slice(0, 15);
      }
      if (contra.length > 0) {
        // @ts-ignore TS(2339): Property 'conArgumentCount' does not exist on type... Remove this comment to see the full error message
        model.conArgumentCount = contra.length;
        // @ts-ignore TS(2339): Property 'conArguments' does not exist on type '{}... Remove this comment to see the full error message
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
        // @ts-ignore TS(2339): Property 'linkCount' does not exist on type '{}'.
        model.linkCount = links.length + 1;
        let ids = links
          // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
          .filter(function (link) {
            return link.ownerType === constants.OBJECT_TYPES.topic;
          })
          // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
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
          // @ts-ignore TS(2339): Property 'topicLinks' does not exist on type '{}'.
          model.topicLinks = results;
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
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
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
      });
      // @ts-ignore TS(2339): Property 'questions' does not exist on type '{}'.
      model.questions = results;
      if (results.length >= 15) {
        // @ts-ignore TS(2339): Property 'questionsMore' does not exist on type '{... Remove this comment to see the full error message
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

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_index(req, res) {
  let model = {};
  await flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model);
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  if (model.topic) {
    flowUtils.setScreeningModel(req, model);
    if (
      // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
      (model.argument && !flowUtils.isEntryOnIntendedUrl(req, res, model.argument)) ||
      // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
      (model.topic && !flowUtils.isEntryOnIntendedUrl(req, res, model.topic))
    ) {
      return res.redirect('/');
    }
    // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
    const query = { 'screening.status': model.screening.status };
    if (req.query.argument) {
      // @ts-ignore TS(2339): Property 'parentId' does not exist on type '{ 'scr... Remove this comment to see the full error message
      query.parentId = model.argument._id;
    } else {
      // @ts-ignore TS(2339): Property 'parentId' does not exist on type '{ 'scr... Remove this comment to see the full error message
      query.parentId = null;
      // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ 'scre... Remove this comment to see the full error message
      query.ownerId = model.topic._id;
      // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{ 'sc... Remove this comment to see the full error message
      query.ownerType = constants.OBJECT_TYPES.topic;
    }
    const results = await flowUtils.getArguments(query, { limit: 0, req: req });
    // @ts-ignore TS(7006): Parameter 'arg' implicitly has an 'any' type.
    let support = results.filter(arg => !arg.against);
    // @ts-ignore TS(7006): Parameter 'arg' implicitly has an 'any' type.
    let contra = results.filter(arg => arg.against);
    // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
    model.arguments = results;
    if (support.length > 0) {
      // @ts-ignore TS(2339): Property 'proArguments' does not exist on type '{}... Remove this comment to see the full error message
      model.proArguments = support;
    }
    if (contra.length > 0) {
      // @ts-ignore TS(2339): Property 'conArguments' does not exist on type '{}... Remove this comment to see the full error message
      model.conArguments = contra;
    }
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(result => {
      flowUtils.setVerdictModel(result);
    });
    flowUtils.sortArguments(results);
    flowUtils.setModelOwnerEntry(req, res, model);

    // screening and children count
    // @ts-ignore TS(2339): Property 'entry' does not exist on type '{}'.
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
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(result => {
      result.topic = {
        _id: result.ownerId,
      };
      flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.argument, req);
      flowUtils.setVerdictModel(result);
    });
    //flowUtils.sortArguments(results);
    // @ts-ignore TS(2339): Property 'arguments' does not exist on type '{}'.
    model.arguments = results;
    // @ts-ignore TS(2339): Property 'proArguments' does not exist on type '{}... Remove this comment to see the full error message
    model.proArguments = results;
    flowUtils.setModelContext(req, res, model);
  }
  res.render(templates.wiki.arguments.index, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
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
    // @ts-ignore TS(2339): Property 'argument' does not exist on type '{ argu... Remove this comment to see the full error message
    delete model.argument;
  }
  await async.series({
    argument: async function () {
      if (req.query.id) {
        const result = await db.Argument.findOne({ _id: req.query.id });
        flowUtils.appendEntryExtras(result);
        // @ts-ignore TS(2339): Property 'argument' does not exist on type '{ argu... Remove this comment to see the full error message
        model.argument = result;
      }
    },
    parentArgument: async () => {
      // @ts-ignore TS(2339): Property 'argument' does not exist on type '{ argu... Remove this comment to see the full error message
      let query = { _id: req.query.argument || model.argument?.parentId || null };
      if (query._id) {
        const result = await db.Argument.findOne(query);
        flowUtils.appendEntryExtras(result);
        // @ts-ignore TS(2339): Property 'parentArgument' does not exist on type '... Remove this comment to see the full error message
        model.parentArgument = result;
      }
    },
  });
  if (
    // @ts-ignore TS(2339): Property 'argument' does not exist on type '{ argu... Remove this comment to see the full error message
    (model.argument && !flowUtils.isEntryOwner(req, model.argument)) ||
    // @ts-ignore TS(2339): Property 'argument' does not exist on type '{ argu... Remove this comment to see the full error message
    (!model.argument && req.query.id)
  ) {
    return res.redirect('/');
  }
  // @ts-ignore TS(2339): Property 'ARGUMENT_TAGS' does not exist on type '{... Remove this comment to see the full error message
  model.ARGUMENT_TAGS = constants.ARGUMENT_TAGS;
  flowUtils.setModelContext(req, res, model);
  res.render(templates.wiki.arguments.create, model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function POST_create(req, res) {
  // @ts-ignore TS(7034): Variable 'parent' implicitly has type 'any' in som... Remove this comment to see the full error message
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
      // @ts-ignore TS(7005): Variable 'parent' implicitly has an 'any' type.
      if (parent) {
        // Parent is always an Argument
        // A child argument.
        // @ts-ignore TS(7005): Variable 'parent' implicitly has an 'any' type.
        entity.parentId = parent._id;
        // @ts-ignore TS(7005): Variable 'parent' implicitly has an 'any' type.
        entity.ownerId = parent.ownerId; // TODO: redundant??? Since you can derive this from the parent? But filtering will be easier this way.
        // @ts-ignore TS(7005): Variable 'parent' implicitly has an 'any' type.
        entity.ownerType = parent.ownerType; // TODO: redundant???
        // @ts-ignore TS(7005): Variable 'parent' implicitly has an 'any' type.
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
    // @ts-ignore TS(2531): Object is possibly 'null'.
    if (entity.parentId) {
      await flowUtils.updateChildrenCount(
        // @ts-ignore TS(2531): Object is possibly 'null'.
        entity.parentId,
        constants.OBJECT_TYPES.argument,
        constants.OBJECT_TYPES.argument
      );
    } else {
      await flowUtils.updateChildrenCount(
        // @ts-ignore TS(2531): Object is possibly 'null'.
        entity.ownerId,
        constants.OBJECT_TYPES.topic,
        constants.OBJECT_TYPES.argument
      );
    }
  }
  let model = {};
  flowUtils.setModelContext(req, res, model);
  let url =
    // @ts-ignore TS(2339): Property 'wikiBaseUrl' does not exist on type '{}'... Remove this comment to see the full error message
    model.wikiBaseUrl +
    paths.wiki.arguments.entry +
    '/' +
    // @ts-ignore TS(2531): Object is possibly 'null'.
    updatedEntity.friendlyUrl +
    '/' +
    // @ts-ignore TS(2531): Object is possibly 'null'.
    updatedEntity._id;
  res.redirect(url);
}

// @ts-ignore TS(2393): Duplicate function implementation.
async function GET_link_entry(req, res) {
  let model = {};
  let ownerQuery = { ownerId: req.params.id, ownerType: constants.OBJECT_TYPES.argumentLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  // @ts-ignore TS(2339): Property 'argumentLink' does not exist on type '{}... Remove this comment to see the full error message
  if (!flowUtils.isEntryOnIntendedUrl(req, res, model.argumentLink)) {
    return res.redirect('/');
  }
  await async.parallel({
    questions: async function () {
      // Top Questions
      let query = {
        // @ts-ignore TS(2339): Property 'argumentLink' does not exist on type '{}... Remove this comment to see the full error message
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

// @ts-ignore TS(2393): Duplicate function implementation.
async function GET_link_edit(req, res) {
  let model = {};
  let ownerQuery = { ownerId: req.query.id, ownerType: constants.OBJECT_TYPES.argumentLink };
  await flowUtils.setEntryModels(ownerQuery, req, model);
  // @ts-ignore TS(2339): Property 'argumentLink' does not exist on type '{}... Remove this comment to see the full error message
  if (model.argumentLink && !flowUtils.isEntryOwner(req, model.argumentLink)) {
    return res.redirect(flowUtils.buildReturnUrl(req));
  }
  // @ts-ignore TS(2339): Property 'cancelUrl' does not exist on type '{}'.
  model.cancelUrl = flowUtils.buildReturnUrl(req);
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.arguments.link.edit, model);
}

// @ts-ignore TS(2393): Duplicate function implementation.
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
