'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
let templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
  flowUtils = require('../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
  utils = require('../utils/utils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../app').db.models,
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'async'.
  async = require('async');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('(/topic)?(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function (req, res) {
    await GET_index(req, res);
  });
};

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports.GET_index = GET_index;

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_index(req, res) {
  flowUtils.ensureEntryIdParam(req, 'topic');
  /*if(!req.query.topic && res.locals.application) {
      req.query.topic = res.locals.application.exploreTopicId;
  }*/

  let model = {},
    // @ts-ignore TS(7034): Variable 'nodes' implicitly has type 'any[]' in so... Remove this comment to see the full error message
    nodes = [],
    // @ts-ignore TS(7034): Variable 'edges' implicitly has type 'any[]' in so... Remove this comment to see the full error message
    edges = [],
    node,
    rootId;
  let textSize = 25,
    nodeSize = 12,
    ROOT_ID = '0',
    rootLabel = 'Wikitruth'; // from nodeSize = 15 is producing an error
  const ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
  await flowUtils.setEntryModels(ownerQuery, req, model);
  // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
  let topicId = model.topic ? model.topic._id : null;
  let query = {
    parentId: topicId,
    private: false,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  };
  rootId = topicId ? topicId : ROOT_ID;
  if (req.params.username && req.user && req.user.username === req.params.username) {
    query.private = true;
    rootLabel = 'My Diary';
    if (!topicId) {
      // @ts-ignore TS(2339): Property 'ownerType' does not exist on type '{ par... Remove this comment to see the full error message
      query.ownerType = constants.OBJECT_TYPES.user;
      // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ paren... Remove this comment to see the full error message
      query.ownerId = req.user.id;
    }
  }
  // ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id
  await async.parallel({
    visualize: async () => {
      const results = await db.Topic.find(query).sort({ title: 1 }).lean();

      if (!topicId) {
        topicId = ROOT_ID;
        nodes.push({
          id: topicId,
          label: rootLabel,
          value: 10,
          color: '#f0ad4e',
          font: { size: 16 },
          current: true,
        });
      } else {
        nodes.push({
          id: topicId,
          // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
          label: utils.getShortText(model.topic.title, textSize),
          value: 10,
          color: '#f0ad4e',
          font: { size: 16 },
          current: true,
        });

        // add parent
        // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
        if (model.parentTopic) {
          nodes.push({
            // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
            id: model.parentTopic._id,
            // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
            label: utils.getShortText(model.parentTopic.title, textSize) + '\n(up level)',
            value: 6,
            shapex: 'triangle',
            color: '#cc317c',
          });
          // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
          edges.push({ from: topicId, to: model.parentTopic._id, width: 4 });
          // @ts-ignore TS(2339): Property 'grandParentTopic' does not exist on type... Remove this comment to see the full error message
          if (model.grandParentTopic) {
            nodes.push({
              // @ts-ignore TS(2339): Property 'grandParentTopic' does not exist on type... Remove this comment to see the full error message
              id: model.grandParentTopic._id,
              // @ts-ignore TS(2339): Property 'grandParentTopic' does not exist on type... Remove this comment to see the full error message
              label: utils.getShortText(model.grandParentTopic.title, textSize) + '\n(up 2 levels)',
              value: 4,
              shapex: 'triangle',
              color: '#cc317c',
            });
            // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
            edges.push({ from: model.parentTopic._id, to: model.grandParentTopic._id });
          } else {
            nodes.push({
              id: ROOT_ID,
              label: rootLabel + '\n(up 2 levels)',
              value: 4,
              shapex: 'triangle',
              color: '#cc317c',
            });
            // @ts-ignore TS(2339): Property 'parentTopic' does not exist on type '{}'... Remove this comment to see the full error message
            edges.push({ from: ROOT_ID, to: model.parentTopic._id });
          }
        } else {
          nodes.push({
            id: ROOT_ID,
            label: rootLabel + '\n(up level)',
            value: 6,
            shapex: 'triangle',
            color: '#cc317c',
          });
          edges.push({ from: ROOT_ID, to: topicId, width: 4 });
        }
      }

      // add children
      let resultCounter = 0;
      await async.series({
        topics: async function () {
          if (results.length > 0) {
            // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
            await async.each(results, async result => {
              resultCounter++;
              // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
              if (model.topic && resultCounter === nodeSize) {
                node = { id: result._id, label: 'more...', value: 6, color: '#FB7E81', more: true };
                // @ts-ignore TS(2339): Property 'originalLabel' does not exist on type '{... Remove this comment to see the full error message
                node.originalLabel = node.label;
                // @ts-ignore TS(2339): Property 'topicId' does not exist on type '{ id: a... Remove this comment to see the full error message
                node.topicId = model.topic._id;
                // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
                node.label += ' <i>*' + model.topic.childrenCount.topics.accepted + '</i>';
                nodes.push(node);
                edges.push({ from: topicId, to: result._id, width: 4 });
                return;
              }
              result.friendlyUrl = utils.urlify(result.title);
              result.shortTitle = utils.getShortText(result.contextTitle || result.title, textSize);
              nodes.push({ id: result._id, label: result.shortTitle, value: 6, color: '#FB7E81' });
              edges.push({ from: topicId, to: result._id, width: 4 });
              const subTopics = await db.Topic.find({
                parentId: result._id,
                'screening.status': constants.SCREENING_STATUS.status1.code,
              })
                .limit(nodeSize)
                .sort({ title: 1 })
                .lean()
                .exec();

              if (subTopics.length > 0) {
                let subtopicCounter = 0;
                // @ts-ignore TS(7006): Parameter 'subTopic' implicitly has an 'any' type.
                subTopics.forEach(function (subTopic) {
                  subtopicCounter++;
                  if (subtopicCounter === nodeSize) {
                    node = { id: subTopic._id, label: 'more...', value: 4, more: true };
                    // @ts-ignore TS(2339): Property 'originalLabel' does not exist on type '{... Remove this comment to see the full error message
                    node.originalLabel = node.label;
                    // @ts-ignore TS(2339): Property 'topicId' does not exist on type '{ id: a... Remove this comment to see the full error message
                    node.topicId = result._id;
                    node.label += ' <i>*' + result.childrenCount.topics.accepted + '</i>';
                    nodes.push(node);
                    edges.push({ from: subTopic._id, to: result._id });
                    return;
                  }
                  subTopic.friendlyUrl = utils.urlify(subTopic.title);
                  subTopic.shortTitle = utils.getShortText(
                    subTopic.contextTitle || subTopic.title,
                    textSize
                  );
                  node = { id: subTopic._id, label: subTopic.shortTitle, value: 4 };
                  if (subTopic.childrenCount.topics.accepted > 0) {
                    // @ts-ignore TS(2339): Property 'originalLabel' does not exist on type '{... Remove this comment to see the full error message
                    node.originalLabel = node.label;
                    node.label += ' <i>*' + subTopic.childrenCount.topics.accepted + '</i>';
                  }
                  nodes.push(node);
                  edges.push({ from: subTopic._id, to: result._id });
                });
                result.subtopics = subTopics;
              }

              if (subTopics.length < nodeSize - 2) {
                // if subtopics are less than nodeSize, get some arguments
                let nodesNeeded = subTopics.length === 0 ? nodeSize : subTopics.length - 2;
                let query = {
                  parentId: null,
                  ownerId: result._id,
                  ownerType: constants.OBJECT_TYPES.topic,
                  'screening.status': constants.SCREENING_STATUS.status1.code,
                };
                const subArgs = await flowUtils.getArguments(query, {
                  limit: nodesNeeded,
                  req: req,
                  shortTitleLength: textSize,
                });
                // @ts-ignore TS(7006): Parameter 'subArg' implicitly has an 'any' type.
                subArgs.forEach(function (subArg) {
                  if (
                    // @ts-ignore TS(7005): Variable 'nodes' implicitly has an 'any[]' type.
                    !nodes.find(function (item) {
                      return subArg._id.equals(item.id);
                    })
                  ) {
                    flowUtils.setVerdictModel(subArg);
                    nodes.push({
                      id: subArg._id,
                      label: subArg.shortTitle,
                      value: 4,
                      shape: 'square',
                      color: '#7BE141',
                      type: 'argument',
                    });
                    edges.push({ from: subArg._id, to: result._id });
                  }
                });
              }
            });
          }
        },
        arguments: async function () {
          // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
          if (model.topic && results.length < nodeSize - 2) {
            // if subtopics are less than nodeSize, get some arguments
            let nodesNeeded = results.length === 0 ? nodeSize : results.length - 2;
            let query = {
              parentId: null,
              // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
              ownerId: model.topic._id,
              ownerType: constants.OBJECT_TYPES.topic,
              'screening.status': constants.SCREENING_STATUS.status1.code,
            };
            const subArgs = await flowUtils.getArguments(query, {
              limit: nodesNeeded,
              req: req,
              shortTitleLength: textSize,
            });
            // @ts-ignore TS(7006): Parameter 'subArg' implicitly has an 'any' type.
            subArgs.forEach(function (subArg) {
              if (
                // @ts-ignore TS(7005): Variable 'nodes' implicitly has an 'any[]' type.
                !nodes.find(function (item) {
                  return subArg._id.equals(item.id);
                })
              ) {
                flowUtils.setVerdictModel(subArg);
                nodes.push({
                  id: subArg._id,
                  label: subArg.shortTitle,
                  value: 4,
                  shape: 'square',
                  color: '#7BE141',
                  type: 'argument',
                });
                // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
                edges.push({ from: subArg._id, to: model.topic._id });
              }
            });
          }
        },
      });
    },
  });
  // @ts-ignore TS(2339): Property 'hideEntryOptions' does not exist on type... Remove this comment to see the full error message
  model.hideEntryOptions = true;
  // @ts-ignore TS(2339): Property 'visualize' does not exist on type '{}'.
  model.visualize = {
    // @ts-ignore TS(7005): Variable 'nodes' implicitly has an 'any[]' type.
    nodes: nodes,
    // @ts-ignore TS(7005): Variable 'edges' implicitly has an 'any[]' type.
    edges: edges,
    rootId: rootId,
  };
  flowUtils.setModelOwnerEntry(req, res, model);
  res.render(templates.wiki.visualize, model);
}
