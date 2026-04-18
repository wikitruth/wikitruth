'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
let constants = require('../../models/constants'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
  flowUtils = require('../../utils/flowUtils'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/take-ownership', async function (req, res) {
    let id = req.body.id;
    let type = req.body.type;

    if (req.user.isAdmin()) {
      let dateNow = Date.now();
      let query = { _id: id };
      if (type === constants.OBJECT_TYPES.topic) {
        const entry = await db.Topic.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.Topic.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.topicLink) {
        const entry = await db.TopicLink.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.TopicLink.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.argument) {
        const entry = await db.Argument.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.Argument.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.argumentLink) {
        const entry = await db.ArgumentLink.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.ArgumentLink.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.question) {
        const entry = await db.Question.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.Question.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.answer) {
        const entry = await db.Answer.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.Answer.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.issue) {
        const entry = await db.Issue.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.Issue.updateOne(query, entry, { upsert: true });
      } else if (type === constants.OBJECT_TYPES.opinion) {
        const entry = await db.Opinion.findOne(query);
        entry.createUserId = req.user.id;
        entry.editUserId = req.user.id;
        entry.editDate = dateNow;
        await db.Opinion.updateOne(query, entry, { upsert: true });
      }
    }
    res.send({});
  });

  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/delete', async function (req, res) {
    let id = req.body.id;
    let type = req.body.type;
    let entry = null;

    if (req.user.isAdmin()) {
      switch (type) {
        case constants.OBJECT_TYPES.topic:
          entry = await db.Topic.findByIdAndDelete(id);
          if (entry.parentId) {
            await flowUtils.updateChildrenCount(
              entry.parentId,
              constants.OBJECT_TYPES.topic,
              constants.OBJECT_TYPES.topic
            );
          }
          break;
        case constants.OBJECT_TYPES.topicLink:
          entry = await db.TopicLink.findByIdAndDelete(id);
          await flowUtils.updateChildrenCount(
            entry.parentId,
            constants.OBJECT_TYPES.topic,
            constants.OBJECT_TYPES.topic
          );
          break;
        case constants.OBJECT_TYPES.argument:
          entry = await db.Argument.findByIdAndDelete(id);
          if (entry.parentId) {
            await flowUtils.updateChildrenCount(
              entry.parentId,
              constants.OBJECT_TYPES.argument,
              constants.OBJECT_TYPES.argument
            );
          } else {
            await flowUtils.updateChildrenCount(
              entry.ownerId,
              constants.OBJECT_TYPES.topic,
              constants.OBJECT_TYPES.argument
            );
          }
          break;
        case constants.OBJECT_TYPES.argumentLink:
          entry = await db.ArgumentLink.findByIdAndDelete(id);
          if (entry.parentId) {
            await flowUtils.updateChildrenCount(
              entry.parentId,
              constants.OBJECT_TYPES.argument,
              constants.OBJECT_TYPES.argument
            );
          } else {
            await flowUtils.updateChildrenCount(
              entry.ownerId,
              entry.ownerType,
              constants.OBJECT_TYPES.argument
            );
          }
          break;
        case constants.OBJECT_TYPES.question:
          entry = await db.Question.findByIdAndDelete(id);
          await flowUtils.updateChildrenCount(
            entry.ownerId,
            entry.ownerType,
            constants.OBJECT_TYPES.question
          );
          break;
        case constants.OBJECT_TYPES.artifact:
          entry = await db.Artifact.findByIdAndDelete(id);
          await flowUtils.updateChildrenCount(
            entry.ownerId,
            entry.ownerType,
            constants.OBJECT_TYPES.artifact
          );
          break;
        case constants.OBJECT_TYPES.issue:
          entry = await db.Issue.findByIdAndDelete(id);
          await flowUtils.updateChildrenCount(
            entry.ownerId,
            entry.ownerType,
            constants.OBJECT_TYPES.issue
          );
          break;
        case constants.OBJECT_TYPES.opinion:
          entry = await db.Opinion.findByIdAndDelete(id);
          await flowUtils.updateChildrenCount(
            entry.ownerId,
            entry.ownerType,
            constants.OBJECT_TYPES.opinion
          );
          break;

        default:
          break;
      }
      if (entry) {
        return res.send({ redirectUrl: flowUtils.buildParentUrl(req, entry) });
      }
    }
    res.send({});
  });
};
