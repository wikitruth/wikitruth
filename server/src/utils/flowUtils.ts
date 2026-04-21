'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
let db = require('../app').db.models,
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  utils = require('./utils'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  constants = require('../models/constants'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  paths = require('../models/paths'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  applications = require('../models/applications'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  config = require('../config/config'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  url = require('url'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  querystring = require('querystring'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  htmlToText = require('html-to-text'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  dateFns = require('date-fns'),
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  async = require('async');

const childrenCountGuardrails = require('../services/childrenCountGuardrails'),
  normalizeChildrenCountUpdateTasks = childrenCountGuardrails.normalizeChildrenCountUpdateTasks,
  assertChildrenCountInvariants = childrenCountGuardrails.assertChildrenCountInvariants;

// @ts-ignore TS(7006): Parameter 'isPrivate' implicitly has an 'any' type... Remove this comment to see the full error message
function getBackupDir(isPrivate) {
  let backupRoot = isPrivate && config.mongodb.privateBackupRoot ? config.mongodb.privateBackupRoot : config.mongodb.backupRoot;
  if (backupRoot) {
    if (backupRoot.startsWith('~')) {
      return process.cwd() + backupRoot.substring(1);
    }
    return backupRoot;
  }
  return process.cwd() + '/config/mongodb' + (isPrivate ? '/users' : '');
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function isEntryOwner(req, item) {
  return item && item.createUserId && req.user && req.user.id && item.createUserId.equals(req.user.id);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function appendOwnerFlag(req, item, model) {
  if (isEntryOwner(req, item)) {
    if (!model) {
      model = item;
    }
    model.isItemOwner = true;
  }
}

// @ts-ignore TS(7006): Parameter 'entry' implicitly has an 'any' type.
function isCategoryTopic(entry) {
  return entry.tags.indexOf(constants.TOPIC_TAGS.tag510.code) > -1;
}

// @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
function appendListExtras(item, objectType, shortTitleLength) {
  if (!item) return;
  if (item.title) {
    item.friendlyUrl = utils.urlify(item.title);
    item.shortTitle = utils.getShortText(item.contextTitle || item.title, shortTitleLength || constants.SETTINGS.TILE_MAX_ENTRY_LEN);
  }
  if (objectType) {
    item.objectType = objectType;
    item.objectName = getObjectName(objectType);
  } else if (item.getType) {
    objectType = item.getType();
    item.objectType = objectType;
    item.objectName = getObjectName(objectType);
  }
  if (item.content && item.contentPreview && item.content.length > constants.SETTINGS.contentPreviewLength && item.contentPreview !== item.content) {
    item.showMore = true;
  }
}

// @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
function appendEntryExtras(item, objectType, req, shortTitleLength) {
  if (!item) return;
  appendListExtras(item, objectType, shortTitleLength);
  item.comments = utils.randomInt(0, 999);
  item.points = utils.randomInt(0, 9999);

  //let editDateString = result.editDate.toUTCString();
  item.editDateString = utils.timeSince(item.editDate, true) + ' ago';
  item.createDateString = utils.timeSince(item.createDate, true) + ' ago';

  item.sameEditor = item.createUserId.toString() === item.editUserId.toString();
  item.sameEditDate = item.createDate.valueOf() === item.editDate.valueOf();

  if (item.referenceDate) {
    let refDate = new Date(item.referenceDate);
    item.referenceDateString = item.referenceDate.toLocaleString(); // FIXME: using this on front-end might produce an issue when the locale of the server does not match the locale of the client.
    item.referenceDateUTC = item.referenceDate.toUTCString();
    // Aligns with prior `moment(...).format('lll')` style using date-fns server-side formatting.
    if (!Number.isNaN(refDate.getTime())) {
      item.referenceDateSimple = dateFns.format(refDate, 'PP p');
    } else {
      item.referenceDateSimple = item.referenceDate.toLocaleString();
    }
    if (/,?\s*12:00 AM$/.test(item.referenceDateSimple)) {
      item.referenceDateSimple = item.referenceDateSimple.replace(/,?\s*12:00 AM$/, '');
    }
  }
  if (item.childrenCount) {
    // @ts-ignore TS(7006): Parameter 'objectName' implicitly has an 'any' typ... Remove this comment to see the full error message
    let hasChildren = function(objectName) {
      return item.childrenCount[objectName] && item.childrenCount[objectName].accepted > 0;
    };
    if (hasChildren('topics')
      || hasChildren('arguments')
      || hasChildren('questions')
      || hasChildren('answers')
      || hasChildren('issues')
      || hasChildren('opinions')) {
      item.hasChildren = true;
    }
  }

  if (req) {
    // @ts-ignore TS(2554): Expected 3 arguments, but got 2.
    appendOwnerFlag(req, item);
  }
}

/*
    items: items to which to set the parents
    typeId: the typeId of the items
 */
// @ts-ignore TS(7006): Parameter 'items' implicitly has an 'any' type.
async function setEntryParents(items, typeId) {
  if (!items || items.length === 0) {
    return;
  }

  // @ts-ignore TS(7034): Variable 'topicIds' implicitly has type 'any[]' in... Remove this comment to see the full error message
  let topicIds = [], topicLinkIds = [], argumentIds = [], argumentLinkIds = [], artifactIds = [], questionIds = [],
    // @ts-ignore TS(7034): Variable 'answerIds' implicitly has type 'any[]' i... Remove this comment to see the full error message
    answerIds = [], issueIds = [], opinionIds = [];
  let topics = {}, topicLinks = {}, args = {}, argumentLinks = {}, artifacts = {}, questions = {}, answers = {},
    issues = {}, opinions = {};
  switch (typeId) {
    case constants.OBJECT_TYPES.topic:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        // @ts-ignore TS(7005): Variable 'topicIds' implicitly has an 'any[]' type... Remove this comment to see the full error message
        if (item.parentId && !topicIds[item.parentId.valueOf()]) {
          topicIds.push(item.parentId.valueOf());
        }
      });
      break;
    case constants.OBJECT_TYPES.argument:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        // @ts-ignore TS(7005): Variable 'argumentIds' implicitly has an 'any[]' t... Remove this comment to see the full error message
        if (item.parentId && !argumentIds[item.parentId.valueOf()]) {
          argumentIds.push(item.parentId.valueOf());
        // @ts-ignore TS(7005): Variable 'topicIds' implicitly has an 'any[]' type... Remove this comment to see the full error message
        } else if (!topicIds[item.ownerId.valueOf()]) {
          topicIds.push(item.ownerId.valueOf());
        }
      });
      break;
    case constants.OBJECT_TYPES.artifact:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        // @ts-ignore TS(7005): Variable 'artifactIds' implicitly has an 'any[]' t... Remove this comment to see the full error message
        if (item.parentId && !artifactIds[item.parentId.valueOf()]) {
          artifactIds.push(item.parentId.valueOf());
        // @ts-ignore TS(7005): Variable 'topicIds' implicitly has an 'any[]' type... Remove this comment to see the full error message
        } else if (!topicIds[item.ownerId.valueOf()]) {
          topicIds.push(item.ownerId.valueOf());
        }
      });
      break;
    case constants.OBJECT_TYPES.answer:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        questionIds.push(item.questionId.valueOf());
      });
      break;
    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        switch (item.ownerType) {
          case constants.OBJECT_TYPES.topic:
            topicIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.topicLink:
            topicLinkIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.artifact:
            artifactIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.argument:
            argumentIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.argumentLink:
            argumentLinkIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.question:
            questionIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.answer:
            answerIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.issue:
            issueIds.push(item.ownerId.valueOf());
            break;
          case constants.OBJECT_TYPES.opinion:
            opinionIds.push(item.ownerId.valueOf());
            break;
        }
      });
      break;
  }

  await async.parallel({
    topics: async function() {
      if (topicIds.length > 0) {
        let results = await db.Topic
          // @ts-ignore TS(7005): Variable 'topicIds' implicitly has an 'any[]' type... Remove this comment to see the full error message
          .find({ _id: { $in: topicIds } })
          .exec();
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          topics[result._id.valueOf()] = result;
        });
      }
    },
    topicLinks: async function() {
      if (topicLinkIds.length > 0) {
        let linkResults = await db.TopicLink
          // @ts-ignore TS(7005): Variable 'topicLinkIds' implicitly has an 'any[]' ... Remove this comment to see the full error message
          .find({ _id: { $in: topicLinkIds } })
          .exec();
        // @ts-ignore TS(7034): Variable 'topicIds2' implicitly has type 'any[]' i... Remove this comment to see the full error message
        let topicIds2 = [], topics2 = {};
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        linkResults.forEach(function(result) {
          topicIds2.push(result.topicId.valueOf());
        });

        let topicResults = await db.Topic
          // @ts-ignore TS(7005): Variable 'topicIds2' implicitly has an 'any[]' typ... Remove this comment to see the full error message
          .find({ _id: { $in: topicIds2 } })
          .exec();
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        topicResults.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          topics2[result._id.valueOf()] = result;
        });
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        linkResults.forEach(function(result) {
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          result.topic = topics2[result.topicId.valueOf()];
          result.title2 = result.title ? result.title : result.topic.title;
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          topicLinks[result._id.valueOf()] = result;
        });
      }
    },
    arguments: async function() {
      if (argumentIds.length > 0) {
        // @ts-ignore TS(7005): Variable 'argumentIds' implicitly has an 'any[]' t... Remove this comment to see the full error message
        let query = { _id: { $in: argumentIds } };
        let results = await db.Argument
          .find(query)
          .exec();
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          args[result._id.valueOf()] = result;
        });
      }
    },
    argumentLinks: async function() {
      if (argumentLinkIds.length > 0) {
        let results = await db.ArgumentLink
          // @ts-ignore TS(7005): Variable 'argumentLinkIds' implicitly has an 'any[... Remove this comment to see the full error message
          .find({ _id: { $in: argumentLinkIds } })
          .exec();

        // @ts-ignore TS(7034): Variable 'argumentIds2' implicitly has type 'any[]... Remove this comment to see the full error message
        let argumentIds2 = [], arguments2 = {};
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          argumentIds2.push(result.argumentId.valueOf());
        });

        let results2 = await db.Argument
          // @ts-ignore TS(7005): Variable 'argumentIds2' implicitly has an 'any[]' ... Remove this comment to see the full error message
          .find({ _id: { $in: argumentIds2 } })
          .exec();
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results2.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          arguments2[result._id.valueOf()] = result;
        });
        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          result.argument = arguments2[result.argumentId.valueOf()];
          result.title2 = result.title ? result.title : result.argument.title;
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          argumentLinks[result._id.valueOf()] = result;
        });
      }
    },
    questions: async function() {
      if (questionIds.length > 0) {
        // @ts-ignore TS(7005): Variable 'questionIds' implicitly has an 'any[]' t... Remove this comment to see the full error message
        let query = { _id: { $in: questionIds } };
        let results = await db.Question
          .find(query)
          .exec();

        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          questions[result._id.valueOf()] = result;
        });
      }
    },
    answers: async function() {
      if (answerIds.length > 0) {
        // @ts-ignore TS(7005): Variable 'answerIds' implicitly has an 'any[]' typ... Remove this comment to see the full error message
        let query = { _id: { $in: answerIds } };
        let results = await db.Answer
          .find(query)
          .exec();

        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          answers[result._id.valueOf()] = result;
        });
      }
    },
    artifacts: async function() {
      if (artifactIds.length > 0) {
        // @ts-ignore TS(7005): Variable 'artifactIds' implicitly has an 'any[]' t... Remove this comment to see the full error message
        let query = { _id: { $in: artifactIds } };
        let results = await db.Artifact
          .find(query)
          .exec();

        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          artifacts[result._id.valueOf()] = result;
        });
      }
    },
    issues: async function() {
      if (issueIds.length > 0) {
        // @ts-ignore TS(7005): Variable 'issueIds' implicitly has an 'any[]' type... Remove this comment to see the full error message
        let query = { _id: { $in: issueIds } };
        let results = await db.Issue
          .find(query)
          .exec();

        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          issues[result._id.valueOf()] = result;
        });
      }
    },
    opinions: async function() {
      if (opinionIds.length > 0) {
        // @ts-ignore TS(7005): Variable 'opinionIds' implicitly has an 'any[]' ty... Remove this comment to see the full error message
        let query = { _id: { $in: opinionIds } };
        let results = await db.Opinion
          .find(query)
          .exec();

        // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
        results.forEach(function(result) {
          // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
          appendListExtras(result);
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          opinions[result._id.valueOf()] = result;
        });
      }
    },
  });

  switch (typeId) {
    case constants.OBJECT_TYPES.topic:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        if (item.parentId) {
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          item.parentTopic = topics[item.parentId.valueOf()];
        }
      });
      break;
    case constants.OBJECT_TYPES.argument:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        if (item.parentId) {
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          item.parentArgument = args[item.parentId.valueOf()];
        } else {
          // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          item.parentTopic = topics[item.ownerId.valueOf()];
        }
      });
      break;
    case constants.OBJECT_TYPES.answer:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        item.parentQuestion = questions[item.questionId.valueOf()];
      });
      break;
    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.artifact:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      items.forEach(function(item) {
        switch (item.ownerType) {
          case constants.OBJECT_TYPES.topic:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentTopic = topics[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.topicLink:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentTopicLink = topicLinks[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.argument:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentArgument = args[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.argumentLink:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentArgumentLink = argumentLinks[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.artifact:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentArtifact = artifacts[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.question:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentQuestion = questions[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.answer:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentAnswer = answers[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.issue:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentIssue = issues[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.opinion:
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            item.parentOpinion = opinions[item.ownerId.valueOf()];
            break;
        }
      });
      break;
  }
}

// Backward-compatible helper for service layers that enrich a single entry.
// Reuses the same parent resolution path as batch operations.
// @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
async function setEntryParent(item, typeId) {
  if (!item) {
    return;
  }
  await setEntryParents([item], typeId);
}

// @ts-ignore TS(7006): Parameter 'items' implicitly has an 'any' type.
async function setEditorsUsername(items) {
  if (items && items.length > 0) {
    let seen = {};
    let userIds = items
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      .filter(function(item) {
        let id = item.editUserId ? item.editUserId.valueOf() : null;
        // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        if (!id || seen[id]) {
          return;
        }
        // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        seen[id] = true;
        return item;
        //return !!item.editUserId;
      // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
      }).map(function(item) {
          return item.editUserId;
        },
      );

    let query = {
      _id: {
        $in: userIds,
      },
    };

    let results = await db.User
      .find(query, { username: 1 })
      .exec();
    let userNames = {};
    // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
    results.forEach(function(result) {
      // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      userNames[result._id.valueOf()] = result.username;
    });
    // @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
    items.forEach(function(item) {
      if (item.editUserId) {
        // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        item.editUsername = userNames[item.editUserId.valueOf()];
      }
    });
  }
}

// @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
async function setCreateUsername(item) {
  if (!item || !item.createUserId) {
    return;
  }

  let user = await db.User.findOne({ _id: item.createUserId });
  if (user) {
    item.createUsername = user.username;
  }
}

// @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
async function setEditUsername(item) {
  if (!item || !item.editUserId) {
    return;
  }

  let user = await db.User.findOne({ _id: item.editUserId });
  if (user) {
    item.editUsername = user.username;
  }
}

// @ts-ignore TS(7006): Parameter 'item' implicitly has an 'any' type.
async function setUsername(item) {
  if (!item) {
    return;
  }

  await setCreateUsername(item);
  if (item.createUserId && item.createUserId === item.editUserId) {
    item.editUsername = item.createUsername;
  } else if (item.editUserId) {
    await setEditUsername(item);
  }
}

// @ts-ignore TS(7006): Parameter 'group' implicitly has an 'any' type.
function buildGroupUrl(group) {
  return paths.groups.index + '/' + group.friendlyUrl + '/' + group._id;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setGroupModel(req, model) {
  if (req.query.group) {
    let result = await db.Group.findOne({ _id: req.query.group });
    model.group = result;
    await setUsername(result);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setArtifactModel(req, model) {
  if (req.query.artifact) {
    let result = await db.Artifact.findOne({ _id: req.query.artifact });
    model.artifact = result;
    result.setThumbnailPath(req.params.username);
    // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isArtifactOwner = true;
    }
    await setUsername(result);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setQuestionModel(req, model) {
  if (req.query.question) {
    let result = await db.Question.findOne({ _id: req.query.question });
    model.question = result;
    // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isQuestionOwner = true;
    }
    await setUsername(result);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setAnswerModel(req, model) {
  if (req.query.answer) {
    let result = await db.Answer.findOne({ _id: req.query.answer });
    model.answer = result;
    // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isAnswerOwner = true;
    }
    await setUsername(result);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setIssueModel(req, model) {
  if (req.query.issue) {
    let result = await db.Issue.findOne({ _id: req.query.issue });
    model.issue = result;
    // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isIssueOwner = true;
    }
    await setUsername(result);
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setOpinionModel(req, model) {
  if (req.query.opinion) {
    await async.series({
      opinion: async function() {
        let result = await db.Opinion.findOne({ _id: req.query.opinion });
        if (!result) {
          return;
        }
        if (model.opinion) {
          model.opinion2 = result;
        } else {
          model.opinion = result;
        }
        // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
        appendEntryExtras(result);
        if (isEntryOwner(req, result)) {
          if (model.opinion2) {
            model.isOpinionOwner2 = true;
          } else {
            model.isOpinionOwner = true;
          }
        }
        await setUsername(result);
      },
      parentOpinion: async function() {
        const opinion = model.opinion2 || model.opinion;
        if (opinion && opinion.parentId) {
          let result = await db.Opinion.findOne({ _id: opinion.parentId });
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            if (model.opinion2) {
              model.parentOpinion2 = result;
            } else {
              model.parentOpinion = result;
            }
          }
        }
      },
      grandParentOpinion: async function() {
        const parentOpinion = model.parentOpinion2 || model.parentOpinion;
        if (parentOpinion && parentOpinion.parentId) {
          let result = await db.Opinion.findOne({ _id: parentOpinion.parentId });
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            if (model.opinion2) {
              model.grandParentOpinion2 = result;
            } else {
              model.grandParentOpinion = result;
            }
          }
        }
      },
    });
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setArgumentLinkModel(req, model) {
  if (req.query.argumentLink) {
    await async.series({
      argumentLink: async function() {
        let result = await db.ArgumentLink.findOne({ _id: req.query.argumentLink });
        model.argumentLink = result;
        // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
        appendEntryExtras(result);
        if (isEntryOwner(req, result)) {
          model.isArgumentLinkOwner = true;
        }
        await setUsername(result);
      },
      argument: async function() {
        if (model.argumentLink) {
          let result = await db.Argument.findOne({ _id: model.argumentLink.argumentId });
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            model.argumentLink.argument = result;
            model.argumentLink.references = result.references;
            model.argumentLink.title2 = model.argumentLink.title ? model.argumentLink.title : result.title;
            model.argumentLink.content2 = result.content;
          }
        }
      },
    });
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setArgumentModels(req, model) {
  if (req.query.argument) {
    await async.series({
      argument: async function() {
        let result = await db.Argument.findOne({ _id: req.query.argument });
        if (!result) {
          return;
        }
        model.argument = result;
        // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
        appendEntryExtras(result);
        if (isEntryOwner(req, result)) {
          model.isArgumentOwner = true;
        }
        await setUsername(result);
      },
      parentArgument: async function() {
        if (model.argument && model.argument.parentId) {
          let result = await db.Argument.findOne({ _id: model.argument.parentId });
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            model.parentArgument = result;
          }
        }
      },
      grandParentArgument: async function() {
        if (model.parentArgument && model.parentArgument.parentId) {
          let result = await db.Argument.findOne({ _id: model.parentArgument.parentId });
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            model.grandParentArgument = result;
          }
        }
      },
    });
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setTopicLinkModel(req, model) {
  if (req.query.topicLink) {
    await async.series({
      topicLink: async function() {
        let result = await db.TopicLink.findOne({ _id: req.query.topicLink });
        model.topicLink = result;
        if (isEntryOwner(req, result)) {
          model.isTopicLinkOwner = true;
        }
        await setUsername(result);
      },
      topic: async function() {
        if (model.topicLink) {
          let result = await db.Topic.findOne({ _id: model.topicLink.topicId });
          if (result) {
            model.topicLink.topic = result;
            model.topicLink.references = result.references;
            model.topicLink.referenceDate = result.referenceDate;
            model.topicLink.title2 = model.topicLink.title ? model.topicLink.title : result.title;
            model.topicLink.content2 = result.content;
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(model.topicLink);
          }
        }
      },
    });
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function setTopicModels(req, model) {
  let query = { _id: model.argument ? model.argument.ownerId : req.query.topic ? req.query.topic : null };
  if (!query._id && req.query.friendlyUrl) {
    delete query._id;
    // @ts-ignore TS(2339): Property 'friendlyUrl' does not exist on type '{ _... Remove this comment to see the full error message
    query.friendlyUrl = req.query.friendlyUrl;
  }
  // @ts-ignore TS(2339): Property 'friendlyUrl' does not exist on type '{ _... Remove this comment to see the full error message
  if (query._id || query.friendlyUrl) {
    await async.series({
      topic: async function() {
        let result = await db.Topic.findOne(query);
        if (!result) {
          return;
        }
        model.topic = result;
        // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
        appendEntryExtras(result);
        if (isEntryOwner(req, result)) {
          model.isTopicOwner = true;
        }
        await setUsername(result);
      },
      topicChildren: async function() {
        if (model.topic) {
          let results = await db.Topic
            .find({
              parentId: model.topic._id,
              private: model.topic.private,
              'screening.status': constants.SCREENING_STATUS.status1.code,
            })
            .limit(8)
            .sort({ title: 1 })
            .lean();
          if (results.length === 8) {
            results.splice(6);
            model.topicChildrenMore = true;
          }
          await setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.topicChildren = results;
        }
      },
      topicSiblings: async function() {
        if (model.topic) {
          query = {
            // @ts-ignore TS(2322): Type '{ parentId: any; _id: { $ne: any; }; private... Remove this comment to see the full error message
            parentId: model.topic.parentId,
            _id: { $ne: model.topic._id },
            private: model.topic.private,
            groupId: model.topic.groupId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          };
          if (!model.topic.parentId && model.topic.private) {
            // @ts-ignore TS(2339): Property 'createUserId' does not exist on type '{ ... Remove this comment to see the full error message
            query.createUserId = model.topic.createUserId;
          }
          let results = await db.Topic
            .find(query)
            .limit(8)
            .sort({ title: 1 })
            .lean();
          if (results.length === 8) {
            results.splice(6);
            model.topicSiblingsMore = true;
          }
          await setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.topicSiblings = results;
        }
      },
      parentTopic: async function() {
        if (model.topic && model.topic.parentId) {
          let result = await db.Topic.findOne({ _id: model.topic.parentId }).exec();
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            model.parentTopic = result;
          }
        }
      },
      parentSiblings: async function() {
        if (model.parentTopic) {
          query = {
            // @ts-ignore TS(2322): Type '{ parentId: any; _id: { $ne: any; }; private... Remove this comment to see the full error message
            parentId: model.parentTopic.parentId,
            _id: { $ne: model.parentTopic._id },
            private: model.parentTopic.private,
            groupId: model.parentTopic.groupId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          };
          if (!model.parentTopic.parentId && model.parentTopic.private) {
            // @ts-ignore TS(2339): Property 'createUserId' does not exist on type '{ ... Remove this comment to see the full error message
            query.createUserId = model.parentTopic.createUserId;
          }
          let results = await db.Topic
            .find(query)
            .limit(8)
            .sort({ title: 1 })
            .lean();
          if (results.length === 8) {
            results.splice(6);
            model.parentSiblingsMore = true;
          }
          await setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.parentSiblings = results;
        }
      },
      grandParentTopic: async function() {
        if (model.parentTopic && model.parentTopic.parentId) {
          let result = await db.Topic.findOne({ _id: model.parentTopic.parentId });
          if (result) {
            // @ts-ignore TS(2554): Expected 4 arguments, but got 1.
            appendEntryExtras(result);
            model.grandParentTopic = result;
          }
        }
      },
    });
  }
}

/**
 * Retrieves the entry from query.ownerId, query.ownerType
 * @param query: ownerId and ownerType is required
 * @param req: only used by specific setters (setTopicModels, setArgumentModels, etc)
 * @param model
 * @returns void
 */
// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function setEntryModels(query, req, model) {
  if (!query || !query.ownerType || query.ownerType === -1) { // if the query or entry does not follow owner id/type concept.
    return;
  }

  if (query.ownerType === constants.OBJECT_TYPES.topic) {
    req.query.topic = query.ownerId;
    await setTopicModels(req, model);
  } else if (query.ownerType === constants.OBJECT_TYPES.topicLink) {
    req.query.topicLink = query.ownerId;
    await setTopicLinkModel(req, model);
    if (!model.topicLink) {
      return;
    }
    const q = { ownerType: constants.OBJECT_TYPES.topic, ownerId: model.topicLink.parentId };
    await setEntryModels(q, req, model);
  } else if (query.ownerType === constants.OBJECT_TYPES.argument) {
    req.query.argument = query.ownerId;
    await setArgumentModels(req, model);
    await setTopicModels(req, model);
  } else if (query.ownerType === constants.OBJECT_TYPES.argumentLink) {
    req.query.argumentLink = query.ownerId;
    await setArgumentLinkModel(req, model);
    if (!model.argumentLink) {
      return;
    }
    const q = model.argumentLink.parentId ? {
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: model.argumentLink.parentId,
    } : model.argumentLink;
    await setEntryModels(q, req, model);
  } else if (query.ownerType === constants.OBJECT_TYPES.artifact) {
    req.query.artifact = query.ownerId;
    await setArtifactModel(req, model);
    if (model.artifact) {
      await setEntryModels(model.artifact, req, model);
    }
  } else if (query.ownerType === constants.OBJECT_TYPES.question) {
    req.query.question = query.ownerId;
    await setQuestionModel(req, model);
    if (model.question) {
      await setEntryModels(model.question, req, model);
    }
  } else if (query.ownerType === constants.OBJECT_TYPES.answer) {
    req.query.answer = query.ownerId;
    await setAnswerModel(req, model);
    if (model.answer) {
      const q = { ownerType: constants.OBJECT_TYPES.question, ownerId: model.answer.questionId };
      await setEntryModels(q, req, model);
    }
  } else if (query.ownerType === constants.OBJECT_TYPES.issue) {
    req.query.issue = query.ownerId;
    await setIssueModel(req, model);
    if (model.issue) {
      await setEntryModels(model.issue, req, model);
    }
  } else if (query.ownerType === constants.OBJECT_TYPES.opinion) {
    req.query.opinion = query.ownerId;
    await setOpinionModel(req, model);
    if (model.opinion2 || model.opinion) {
      await setEntryModels(model.opinion2 || model.opinion, req, model);
    }
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function setupClipboard(req, type) {
  let clipboard = req.session.clipboard;
  if (!clipboard) {
    clipboard = {};
    clipboard['object' + constants.OBJECT_TYPES.topic] = [];
    clipboard['object' + constants.OBJECT_TYPES.argument] = [];
  }
  if (!clipboard['object' + type]) {
    clipboard['object' + type] = [];
  }
  return clipboard;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function getClipboard(req) {
  const clipboard = req.session.clipboard;
  if (clipboard && !clipboard['object' + constants.OBJECT_TYPES.artifact]) {
    clipboard['object' + constants.OBJECT_TYPES.artifact] = [];
  }
  return clipboard;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function setClipboardModel(req, model, entryType) {
  model.clipboard = {};
  const clipboard = getClipboard(req);
  if (clipboard) {
    let marked = false;
    let count = 0;
    for (const key in clipboard) {
      if (clipboard.hasOwnProperty(key)) {
        const items = clipboard[key];
        const keyType = parseInt(key.substring('object'.length - 1));
        const keyEntry = getEntryByObjectType(model, keyType);
        if (entryType === keyType && keyEntry && items.indexOf(keyEntry._id.toString()) > -1) {
          model.clipboard.marked = true;
          marked = true;
        }
        count += items.length;
      }
    }

    if (count > 0) {
      model.clipboard.count = count;
      if (!(count === 1 && marked)) {
        model.clipboard.canPaste = true;
      }
    }

    /*let topics = clipboard['object' + constants.OBJECT_TYPES.topic];
        let args = clipboard['object' + constants.OBJECT_TYPES.argument];
        let artifacts = clipboard['object' + constants.OBJECT_TYPES.artifact];
        let count = topics.length + args.length + artifacts.length;
        if (count > 0) {
            model.clipboard.count = count;

            if(entryType) {
                if (
                    (entryType === constants.OBJECT_TYPES.topic && model.topic && topics.indexOf(model.topic._id.toString()) > -1) ||
                    (entryType === constants.OBJECT_TYPES.argument && model.argument && args.indexOf(model.argument._id.toString()) > -1) ||
                    (entryType === constants.OBJECT_TYPES.artifact && model.artifact && artifacts.indexOf(model.artifact._id.toString()) > -1)
                ) {
                    model.clipboard.marked = true;
                    marked = true;
                }
            }
            if(!(count === 1 && marked)) {
                model.clipboard.canPaste = true;
            }
        }*/
  }

  if (model.entry || model.clipboard.count) {
    model.clipboard.visible = true;
  }
}

// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function getTopics(query, options) {
  // @ts-ignore TS(7034): Variable 'children' implicitly has type 'any[]' in... Remove this comment to see the full error message
  let children = [], topicLinks = [];
  //limit, shortTitleLength, req
  if (!options) options = {};
  await async.series({
    children: async function() {
      let results = await db.Topic
        .find(query)
        .limit(options.limit)
        .sort({ title: 1 })
        .lean();

      await setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function(result) {
        appendEntryExtras(result, constants.OBJECT_TYPES.topic, options.req, options.shortTitleLength);
      });
      children = results;
    },
    links: async function() {
      if (options.limit > 0 && options.limit === children.length) return;

      let newLimit = options.limit > 0 ? options.limit - children.length : options.limit;
      let links = await db.TopicLink
        .find(query)
        .limit(newLimit)
        .lean();

      if (links.length > 0) {
        // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
        const ids = links.map(function(link) {
          return link.topicId;
        });
        query = { _id: { $in: ids } };
        // query the actual topics being linked to
        let results = await db.Topic
          .find(query)
          .limit(newLimit)
          .sort({ title: 1 })
          .lean();
        if (results.length > 0) {
          // Get parents for rendering the subtitle
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          const parentIds = results.filter(function(result) {
            return !!result.parentId;
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          }).map(function(result) {
            return result.parentId;
          });
          query = { _id: { $in: parentIds } };
          // query the parents of the actual topics
          let linkParents = await db.Topic
            .find(query)
            .lean();
          await setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(function(result) {
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, options.req, options.shortTitleLength);
            // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
            const link = links.find(function(link) {
              return link.topicId.equals(result._id);
            });
            if (link) {
              // @ts-ignore TS(7006): Parameter 'linkParent' implicitly has an 'any' typ... Remove this comment to see the full error message
              const linkParent = linkParents.find(function(linkParent) {
                return linkParent._id.equals(result.parentId);
              });
              if (linkParent) {
                // @ts-ignore TS(2554): Expected 3 arguments, but got 4.
                appendListExtras(linkParent, constants.OBJECT_TYPES.topic, options.req, options.shortTitleLength);
              }
              // @ts-ignore TS(2554): Expected 3 arguments, but got 4.
              appendListExtras(link, constants.OBJECT_TYPES.topicLink, options.req, options.shortTitleLength);
              result.parentTopic = linkParent;
              result.link = link;
            }
          });
        }
        topicLinks = results;
      }
    },
  });
  // @ts-ignore TS(7005): Variable 'children' implicitly has an 'any[]' type... Remove this comment to see the full error message
  return children.concat(topicLinks).sort(utils.titleCompare);
}

// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function getArguments(query, options) {
  // @ts-ignore TS(7034): Variable 'children' implicitly has type 'any[]' in... Remove this comment to see the full error message
  let children = [], argumentLinks = [];
  if (!options) options = {};
  await async.series({
    children: async function() {
      let results = await db.Argument
        .find(query)
        .limit(options.limit)
        .sort({ title: 1 })
        .lean();
      await setEditorsUsername(results);
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function(result) {
        appendEntryExtras(result, constants.OBJECT_TYPES.argument, options.req, options.shortTitleLength);
        //result.against = false;
      });
      children = results;
    },
    links: async function() {
      if (options.limit > 0 && options.limit === children.length) return;
      const newLimit = options.limit > 0 ? options.limit - children.length : options.limit;
      let links = await db.ArgumentLink
        .find(query)
        .limit(newLimit)
        .lean();

      if (links.length > 0) {
        // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
        const ids = links.map(function(link) {
          return link.argumentId;
        });
        let query = { _id: { $in: ids } };
        // get actual arguments from links
        let results = await db.Argument
          .find(query)
          .limit(newLimit)
          .sort({ title: 1 })
          .lean();
        if (results.length > 0) {
          const linkParents = await async.parallel({
            parentTopics: async () => {
              const topicIds = results
                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                .filter(result => !result.parentId && result.ownerId)
                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                .map(result => result.ownerId);
              // get the topics of actual arguments
              return await db.Topic
                .find({ _id: { $in: topicIds } })
                .lean();
            },
            parentArguments: async () => {
              const parentIds = results
                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                .filter(result => !!result.parentId)
                // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
                .map(result => result.parentId);
              query = { _id: { $in: parentIds } };
              return await db.Argument
                .find(query)
                .lean();
            },
          });
          await setEditorsUsername(results);
          // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
          results.forEach(result => {
            appendEntryExtras(
              result,
              constants.OBJECT_TYPES.argument,
              options.req,
              options.shortTitleLength
            );
            // @ts-ignore TS(7006): Parameter 'link' implicitly has an 'any' type.
            const link = links.find(link => link.argumentId.equals(result._id));
            if (link) {
              if (result.parentId) {
                // @ts-ignore TS(7006): Parameter 'linkParent' implicitly has an 'any' typ... Remove this comment to see the full error message
                const parentArgument = linkParents.parentArguments.find(linkParent =>
                  linkParent._id.equals(result.parentId)
                );
                if (parentArgument) {
                  // @ts-ignore TS(2554): Expected 3 arguments, but got 1.
                  appendListExtras(parentArgument);
                }
                result.parentArgument = parentArgument;
              } else if (result.ownerType === constants.OBJECT_TYPES.topic && result.ownerId) {
                // @ts-ignore TS(7006): Parameter 'linkParent' implicitly has an 'any' typ... Remove this comment to see the full error message
                const linkParent = linkParents.parentTopics.find(linkParent =>
                  linkParent._id.equals(result.ownerId)
                );
                if (linkParent) {
                  appendListExtras(
                    linkParent,
                    constants.OBJECT_TYPES.argument,
                    options.req,
                    // @ts-ignore TS(2554): Expected 3 arguments, but got 4.
                    options.shortTitleLength
                  );
                }
                result.parentTopic = linkParent;
              }
              appendEntryExtras(
                link,
                constants.OBJECT_TYPES.argumentLink,
                options.req,
                options.shortTitleLength
              );
              result.link = link;
              result.against = link.against;
            }
          });
        }
        argumentLinks = results;
      }
    },
  });
  // @ts-ignore TS(7005): Variable 'children' implicitly has an 'any[]' type... Remove this comment to see the full error message
  return children.concat(argumentLinks).sort(utils.titleCompare);
}

// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function getTopQuestions(query, model, req) {
  let results = await db.Question
    .find(query)
    .limit(15)
    .lean();
  await setEditorsUsername(results);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  results.forEach(result => {
    // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
    appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });
  model.questions = results;
}

// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function getTopArtifacts(query, model, req) {
  let results = await db.Artifact
    .find(query)
    .limit(15)
    //.lean()
    .sort({ title: 1 });
  await setEditorsUsername(results);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  results.forEach(result => {
    result.setThumbnailPath(req.params.username);
    // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
    appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
  });
  model.artifacts = results;
}

// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function getTopIssues(query, model, req) {
  let results = await db.Issue
    .find(query)
    .limit(15)
    .lean()
    .sort({ title: 1 });
  await setEditorsUsername(results);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  results.forEach(result => {
    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
    // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
    appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });
  model.issues = results;
}

// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
async function getTopOpinions(query, model, req) {
  let results = await db.Opinion
    .find(query)
    .limit(15)
    .sort({ title: 1 })
    .lean();
  await setEditorsUsername(results);
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  results.forEach(result => {
    // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
    appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });
  model.opinions = results;
}

/**
 * Updates the childrenCount property of the specified entry
 * @param entryId: parent entryId
 * @param entryType: parent entryType
 * @param specificEntryType: specific child entries to update
 */
// @ts-ignore TS(7006): Parameter 'query' implicitly has an 'any' type.
function applySessionToQuery(query, session) {
  if (session && query && typeof query.session === 'function') {
    return query.session(session);
  }
  return query;
}

// @ts-ignore TS(7006): Parameter 'dbModel' implicitly has an 'any' type.
async function countDocumentsWithSession(dbModel, query, session) {
  return await applySessionToQuery(dbModel.countDocuments(query), session);
}

// @ts-ignore TS(7006): Parameter 'dbModel' implicitly has an 'any' type.
async function updateOneWithSession(dbModel, filter, update, session) {
  return await applySessionToQuery(dbModel.updateOne(filter, update), session);
}

// @ts-ignore TS(7006): Parameter 'specificEntryType' implicitly has an 'any' type.
function normalizeUpdateChildrenCountArgs(specificEntryType, callbackOrOptions, maybeOptions) {
  let normalizedSpecificEntryType = specificEntryType;
  let callback = null;
  let options: any = {};

  if (typeof normalizedSpecificEntryType === 'function') {
    callback = normalizedSpecificEntryType;
    normalizedSpecificEntryType = null;
  } else if (normalizedSpecificEntryType && typeof normalizedSpecificEntryType === 'object') {
    options = normalizedSpecificEntryType;
    normalizedSpecificEntryType = null;
  }

  if (typeof callbackOrOptions === 'function') {
    callback = callbackOrOptions;
  } else if (callbackOrOptions && typeof callbackOrOptions === 'object') {
    options = callbackOrOptions;
  }

  if (typeof maybeOptions === 'function') {
    callback = maybeOptions;
  } else if (maybeOptions && typeof maybeOptions === 'object') {
    options = maybeOptions;
  }

  return {
    specificEntryType: normalizedSpecificEntryType,
    callback,
    options,
  };
}

// @ts-ignore TS(7006): Parameter 'entryType' implicitly has an 'any' type.
function getDbConnectionForObjectType(entryType) {
  const dbModel = getDbModelByObjectType(entryType);
  return dbModel && dbModel.db ? dbModel.db : null;
}

// @ts-ignore TS(7006): Parameter 'entryId' implicitly has an 'any' type.
async function updateChildrenCount(entryId, entryType, specificEntryType, callbackOrOptions?, maybeOptions?) {
  const normalizedArgs = normalizeUpdateChildrenCountArgs(specificEntryType, callbackOrOptions, maybeOptions);
  specificEntryType = normalizedArgs.specificEntryType;
  const callback = normalizedArgs.callback;
  const session = normalizedArgs.options && normalizedArgs.options.session ? normalizedArgs.options.session : null;

  let countNode = {};
  let model = {}, req = {};

  const updateTopics = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.topic) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const topics = countNode.childrenCount.topics;
      await async.parallel({
        accepted: async function() {
          const query = { parentId: entryId, 'screening.status': constants.SCREENING_STATUS.status1.code };
          let count = await countDocumentsWithSession(db.Topic, query, session);
          let linkCount = await countDocumentsWithSession(db.TopicLink, query, session);
          topics.accepted = count + linkCount;
        },
        pending: async function() {
          const query = { parentId: entryId, 'screening.status': constants.SCREENING_STATUS.status0.code };
          let count = await countDocumentsWithSession(db.Topic, query, session);
          let linkCount = await countDocumentsWithSession(db.TopicLink, query, session);
          topics.pending = count + linkCount;
        },
        rejected: async function() {
          const query = { parentId: entryId, 'screening.status': constants.SCREENING_STATUS.status2.code };
          const count = await countDocumentsWithSession(db.Topic, query, session);
          const linkCount = await countDocumentsWithSession(db.TopicLink, query, session);
          topics.rejected = count + linkCount;
        },
      });
      topics.total = topics.accepted + topics.pending + topics.rejected;
    }
  };
  const updateArguments = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.argument) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const args = countNode.childrenCount['arguments'];
      const q = {
        // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
        ownerId: model.argument ? model.argument.ownerId : entryId,
        // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
        parentId: model.argument ? model.argument._id : null,
      };
      await async.parallel({
        accepted: async function() {
          const query = {
            ownerId: q.ownerId,
            parentId: q.parentId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          };
          const count = await countDocumentsWithSession(db.Argument, query, session);
          const linkCount = await countDocumentsWithSession(db.ArgumentLink, query, session);
          args.accepted = count + linkCount;
        },
        pending: async function() {
          const query = {
            ownerId: q.ownerId,
            parentId: q.parentId,
            'screening.status': constants.SCREENING_STATUS.status0.code,
          };
          const count = await countDocumentsWithSession(db.Argument, query, session);
          const linkCount = await countDocumentsWithSession(db.ArgumentLink, query, session);
          args.pending = count + linkCount;
        },
        rejected: async function() {
          const query = {
            ownerId: q.ownerId,
            parentId: q.parentId,
            'screening.status': constants.SCREENING_STATUS.status2.code,
          };
          const count = await countDocumentsWithSession(db.Argument, query, session);
          const linkCount = await countDocumentsWithSession(db.ArgumentLink, query, session);
          args.rejected = count + linkCount;
        },
      });
      args.total = args.accepted + args.pending + args.rejected;
    }
  };
  const updateArtifacts = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.artifact) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const artifacts = countNode.childrenCount.artifacts;
      const q = {
        // @ts-ignore TS(2339): Property 'artifact' does not exist on type '{}'.
        ownerId: model.artifact ? model.artifact.ownerId : entryId,
        // @ts-ignore TS(2339): Property 'artifact' does not exist on type '{}'.
        parentId: model.artifact ? model.artifact._id : null,
      };
      await async.parallel({
        accepted: async function() {
          const query = {
            ownerId: q.ownerId,
            parentId: q.parentId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          };
          artifacts.accepted = await countDocumentsWithSession(db.Artifact, query, session);
        },
        pending: async function() {
          const query = {
            ownerId: q.ownerId,
            parentId: q.parentId,
            'screening.status': constants.SCREENING_STATUS.status0.code,
          };
          artifacts.pending = await countDocumentsWithSession(db.Artifact, query, session);
        },
        rejected: async function() {
          const query = {
            ownerId: q.ownerId,
            parentId: q.parentId,
            'screening.status': constants.SCREENING_STATUS.status2.code,
          };
          artifacts.rejected = await countDocumentsWithSession(db.Artifact, query, session);
        },
      });
      artifacts.total = artifacts.accepted + artifacts.pending + artifacts.rejected;
    }
  };
  const updateQuestions = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.question) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const questions = countNode.childrenCount.questions;
      await async.parallel({
        accepted: async function() {
          questions.accepted = await countDocumentsWithSession(db.Question, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          }, session);
        },
        pending: async function() {
          questions.pending = await countDocumentsWithSession(db.Question, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status0.code,
          }, session);
        },
        rejected: async function() {
          questions.rejected = await countDocumentsWithSession(db.Question, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status2.code,
          }, session);
        },
      });
      questions.total = questions.accepted + questions.pending + questions.rejected;
    }
  };
  const updateAnswers = async () => {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.answer) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const answers = countNode.childrenCount.answers;
      await async.parallel({
        accepted: async () => {
          answers.accepted = await countDocumentsWithSession(db.Answer, {
            questionId: entryId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          }, session);
        },
        pending: async () => {
          answers.pending = await countDocumentsWithSession(db.Answer, {
            questionId: entryId,
            'screening.status': constants.SCREENING_STATUS.status0.code,
          }, session);
        },
        rejected: async () => {
          answers.rejected = await countDocumentsWithSession(db.Answer, {
            questionId: entryId,
            'screening.status': constants.SCREENING_STATUS.status2.code,
          }, session);
        },
      });
      answers.total = answers.accepted + answers.pending + answers.rejected;
    }
  };
  const updateIssues = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.issue) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const issues = countNode.childrenCount.issues;
      await async.parallel({
        accepted: async function() {
          issues.accepted = await countDocumentsWithSession(db.Issue, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          }, session);
        },
        pending: async function() {
          issues.pending = await countDocumentsWithSession(db.Issue, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status0.code,
          }, session);
        },
        rejected: async function() {
          issues.rejected = await countDocumentsWithSession(db.Issue, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status2.code,
          }, session);
        },
      });
      issues.total = issues.accepted + issues.pending + issues.rejected;
    }
  };
  const updateOpinions = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.opinion) {
      // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{... Remove this comment to see the full error message
      const opinions = countNode.childrenCount.opinions;
      await async.parallel({
        accepted: async function() {
          opinions.accepted = await countDocumentsWithSession(db.Opinion, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          }, session);
        },
        pending: async function() {
          opinions.pending = await countDocumentsWithSession(db.Opinion, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status0.code,
          }, session);
        },
        rejected: async function() {
          opinions.rejected = await countDocumentsWithSession(db.Opinion, {
            ownerId: entryId,
            'screening.status': constants.SCREENING_STATUS.status2.code,
          }, session);
        },
      });
      opinions.total = opinions.accepted + opinions.pending + opinions.rejected;
    }
  };

  try {
    switch (entryType) {
      case constants.OBJECT_TYPES.topic:
        req = { query: { topic: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'topic' does not exist on type '{}'.
        countNode = { childrenCount: model.topic.childrenCount };
        await async.parallel({
          topics: updateTopics,
          arguments: updateArguments,
          artifacts: updateArtifacts,
          questions: updateQuestions,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Topic, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.topicLink:
        req = { query: { topicLink: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'topicLink' does not exist on type '{}'.
        countNode = { childrenCount: model.topicLink.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.TopicLink, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.argument:
        req = { query: { argument: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'argument' does not exist on type '{}'.
        countNode = { childrenCount: model.argument.childrenCount };
        await async.parallel({
          arguments: updateArguments,
          questions: updateQuestions,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Argument, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.argumentLink:
        req = { query: { argumentLink: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'argumentLink' does not exist on type '{}... Remove this comment to see the full error message
        countNode = { childrenCount: model.argumentLink.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.ArgumentLink, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.artifact:
        req = { query: { artifact: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'artifact' does not exist on type '{}'.
        countNode = { childrenCount: model.artifact.childrenCount };
        await async.parallel({
          artifacts: updateArtifacts,
          arguments: updateArguments,
          questions: updateQuestions,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Artifact, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.question:
        req = { query: { question: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'question' does not exist on type '{}'.
        countNode = { childrenCount: model.question.childrenCount };
        await async.parallel({
          answers: updateAnswers,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Question, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.answer:
        req = { query: { answer: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'answer' does not exist on type '{}'.
        countNode = { childrenCount: model.answer.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Answer, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.issue:
        req = { query: { issue: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'issue' does not exist on type '{}'.
        countNode = { childrenCount: model.issue.childrenCount };
        await async.parallel({
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Issue, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.opinion:
        req = { query: { opinion: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        // @ts-ignore TS(2339): Property 'opinion' does not exist on type '{}'.
        countNode = { childrenCount: model.opinion.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        // @ts-ignore TS(2339): Property 'childrenCount' does not exist on type '{}'.
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Opinion, { _id: entryId }, { $set: countNode }, session);
        break;

      default:
    }
  } catch (error) {
    if (callback) {
      callback(error);
      return;
    }
    throw error;
  }

  if (callback) {
    callback();
  }
}

// @ts-ignore TS(7006): Parameter 'tasks' implicitly has an 'any' type.
async function updateChildrenCountBatch(tasks, options) {
  const normalizedTasks = normalizeChildrenCountUpdateTasks(tasks);
  if (normalizedTasks.length === 0) {
    return {
      processed: 0,
      unique: 0,
      skipped: Array.isArray(tasks) ? tasks.length : 0,
      transactional: false,
    };
  }

  const runBatch = async function(session: any) {
    for (const task of normalizedTasks) {
      await updateChildrenCount(task.entryId, task.entryType, task.specificEntryType, { session });
    }
  };

  const transactional = Boolean(options && options.transactional === true);
  if (!transactional) {
    await runBatch(null);
    return {
      processed: normalizedTasks.length,
      unique: normalizedTasks.length,
      skipped: Array.isArray(tasks) ? Math.max(tasks.length - normalizedTasks.length, 0) : 0,
      transactional: false,
    };
  }

  const connection = getDbConnectionForObjectType(normalizedTasks[0].entryType);
  if (!connection || typeof connection.startSession !== 'function') {
    await runBatch(null);
    return {
      processed: normalizedTasks.length,
      unique: normalizedTasks.length,
      skipped: Array.isArray(tasks) ? Math.max(tasks.length - normalizedTasks.length, 0) : 0,
      transactional: false,
    };
  }

  const session = await connection.startSession();
  try {
    await session.withTransaction(async function() {
      await runBatch(session);
    });
  } finally {
    await session.endSession();
  }

  return {
    processed: normalizedTasks.length,
    unique: normalizedTasks.length,
    skipped: Array.isArray(tasks) ? Math.max(tasks.length - normalizedTasks.length, 0) : 0,
    transactional: true,
  };
}

// SUMMARY: updates the children of parent including the categoryId, does not touch the parent
// @ts-ignore TS(7006): Parameter 'parent' implicitly has an 'any' type.
async function syncChildren(parent, options) {
  const syncChildTopics = async () => {
    const children = await db.Topic.find({ parentId: parent._id });
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async child => {
      let categoryChanged = false,
        oldCategoryId = child.categoryId;
      await async.series({
        syncCategoryId: async () => {
          await syncCategoryId(child, { entryType: constants.OBJECT_TYPES.topic });
        },
        update: async () => {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged) {
            await db.Topic.updateOne({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async () => {
          if (categoryChanged) {
            await syncChildren(child, { entryType: constants.OBJECT_TYPES.topic });
          }
        },
      });
    });
  };

  const syncChildTopicLinks = async function() {
    const children = await db.TopicLink.find({ parentId: parent._id });
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async child => {
      let categoryChanged = false,
        oldCategoryId = child.categoryId;
      await async.series({
        syncCategoryId: async () => {
          await syncCategoryId(child, { entryType: constants.OBJECT_TYPES.topicLink });
        },
        update: async () => {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged) {
            await db.TopicLink.updateOne({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async function () {
          if (categoryChanged) {
            await syncChildren(child, { entryType: constants.OBJECT_TYPES.topicLink });
          }
        },
      });
    });
  };

  const syncChildArguments = async function() {
    const parentIsTopic = options.entryType === constants.OBJECT_TYPES.topic;
    const query = parentIsTopic ? {
      ownerId: parent._id,
      ownerType: constants.OBJECT_TYPES.topic,
    } : { parentId: parent._id };
    const children = await db.Argument.find(query);
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async function(child) {
      let categoryChanged = false, oldCategoryId = child.categoryId;
      if (!parentIsTopic) {
        child.ownerId = parent.ownerId;
        child.ownerType = parent.ownerType;
        child.threadId = parent.parentId ? parent.threadId : parent._id;
      }
      await async.series({
        syncCategoryId: async function() {
          await syncCategoryId(child, { entryType: constants.OBJECT_TYPES.argument });
        },
        update: async function() {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged || !parentIsTopic) {
            await db.Argument.updateOne({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async function() {
          if (categoryChanged || !parentIsTopic) {
            return await syncChildren(child, { entryType: constants.OBJECT_TYPES.argument });
          }
        },
      });
    });
  };

  const syncChildArtifacts = async function() {
    const parentIsTopic = options.entryType === constants.OBJECT_TYPES.topic;
    const query = parentIsTopic ? {
      ownerId: parent._id,
      ownerType: constants.OBJECT_TYPES.topic,
    } : { parentId: parent._id };
    const children = await db.Artifact.find(query);
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async function(child) {
      let categoryChanged = false, oldCategoryId = child.categoryId;
      if (!parentIsTopic) {
        child.ownerId = parent.ownerId;
        child.ownerType = parent.ownerType;
      }
      await async.series({
        syncCategoryId: async function() {
          await syncCategoryId(child, { entryType: constants.OBJECT_TYPES.artifact });
        },
        update: async function() {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged || !parentIsTopic) {
            await db.Artifact.update({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async function() {
          if (categoryChanged || !parentIsTopic) {
            await syncChildren(child, { entryType: constants.OBJECT_TYPES.artifact });
          }
        },
      });
    });
  };

  const syncChildArgumentLinks = async function() {
    const children = await db.ArgumentLink.find({ ownerId: parent._id, ownerType: options.entryType });
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async function(child) {
      let categoryChanged = false, oldCategoryId = child.categoryId;
      /*
        child.ownerId = parent.ownerId;
        child.ownerType = parent.ownerType;
        child.threadId = parent.parentId ? parent.threadId : parent._id;
      */
      await async.series({
        syncCategoryId: async function() {
          await syncCategoryId(child, { entryType: constants.OBJECT_TYPES.argumentLink });
        },
        update: async function() {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged) {
            await db.ArgumentLink.update({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async function() {
          if (categoryChanged) {
            await syncChildren(child, { entryType: constants.OBJECT_TYPES.argumentLink });
          }
        },
      });
    });
  };

  const syncChildAnswers = async function() {
    const children = await db.Answer.find({ questionId: parent._id });
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async function(child) {
      let categoryChanged = false, oldCategoryId = child.categoryId;
      await async.series({
        syncCategoryId: async function() {
          await syncCategoryId(child, { entryType: constants.OBJECT_TYPES.answer });
        },
        update: async function() {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged) {
            return await db.Answer.update({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async function() {
          if (categoryChanged) {
            return await syncChildren(child, { entryType: constants.OBJECT_TYPES.answer });
          }
        },
      });
    });
  };

  // @ts-ignore TS(7006): Parameter 'childrenEntryType' implicitly has an 'a... Remove this comment to see the full error message
  const syncOwnerChildren = async function(childrenEntryType) {
    const dbModel = getDbModelByObjectType(childrenEntryType);
    const children = await dbModel.find({ ownerId: parent._id, ownerType: options.entryType });
    if (children.length === 0) return;
    // @ts-ignore TS(7006): Parameter 'child' implicitly has an 'any' type.
    await async.each(children, async function(child) {
      let categoryChanged = false, oldCategoryId = child.categoryId;
      await async.series({
        syncCategoryId: async function() {
          await syncCategoryId(child, { entryType: childrenEntryType });
        },
        update: async function() {
          categoryChanged = oldCategoryId !== child.categoryId;
          if (categoryChanged) {
            await dbModel.updateOne({ _id: child._id }, child, { upsert: true });
          }
        },
        syncChildren: async function() {
          if (categoryChanged) {
            await syncChildren(child, { entryType: childrenEntryType });
          }
        },
      });
    });
  };

  switch (options.entryType) { // type of the parent

    case constants.OBJECT_TYPES.topic:
      await async.parallel({
        topics: async function() {
          await syncChildTopics();
        },
        topicLinks: async function() {
          await syncChildTopicLinks();
        },
        arguments: async function() {
          await syncChildArguments();
        },
        argumentLinks: async function() {
          await syncChildArgumentLinks();
        },
        artifacts: async function() {
          await syncChildArtifacts();
        },
        questions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.question);
        },
        issues: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.issue);
        },
        opinions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.opinion);
        },
      });
      break;

    case constants.OBJECT_TYPES.argument:
      await async.parallel({
        arguments: async function() {
          await syncChildArguments();
        },
        argumentLinks: async function() {
          await syncChildArgumentLinks();
        },
        questions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.question);
        },
        issues: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.issue);
        },
        opinions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.opinion);
        },
      });
      break;

    case constants.OBJECT_TYPES.artifact:
      await async.parallel({
        artifacts: async function() {
          await syncChildArtifacts();
        },
        arguments: async function() {
          await syncChildArguments();
        },
        argumentLinks: async function() {
          await syncChildArgumentLinks();
        },
        questions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.question);
        },
        issues: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.issue);
        },
        opinions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.opinion);
        },
      });
      break;

    case constants.OBJECT_TYPES.question:
      await async.parallel({
        answers: async function() {
          await syncChildAnswers();
        },
        issues: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.issue);
        },
        opinions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.opinion);
        },
      });
      break;

    case constants.OBJECT_TYPES.answer:
      await async.parallel({
        issues: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.issue);
        },
        opinions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.opinion);
        },
      });
      break;

    case constants.OBJECT_TYPES.topicLink:
    case constants.OBJECT_TYPES.argumentLink:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      await async.parallel({
        issues: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.issue);
        },
        opinions: async function() {
          await syncOwnerChildren(constants.OBJECT_TYPES.opinion);
        },
      });
      break;

    default:
  }
}

// Set or update categoryId
// @ts-ignore TS(7006): Parameter 'entry' implicitly has an 'any' type.
async function syncCategoryId(entry, options) {
  /*if(!options) {
        options = {
            update: false,
            recursive: false
        };
    }*/
  switch (options.entryType) { // type of the entry
    case constants.OBJECT_TYPES.topic:
      if (!entry.parentId) { // A root category, set category to null
        entry.categoryId = null;
      } else {
        let parent = await db.Topic.findOne({ _id: entry.parentId });
        if (!parent.parentId || isCategoryTopic(parent)) {
          entry.categoryId = parent._id;
        } else {
          // this applies regardless entry is a category or not
          entry.categoryId = parent.categoryId;
        }
      }
      return;

    case constants.OBJECT_TYPES.topicLink:
      let parent = await db.Topic.findOne({ _id: entry.parentId });
      if (!parent.parentId || isCategoryTopic(parent)) {
        entry.categoryId = parent._id;
      } else {
        entry.categoryId = parent.categoryId;
      }
      entry.private = parent.private;
      entry.groupId = parent.groupId;
      return;

    case constants.OBJECT_TYPES.answer:
      let question = await db.Question.findOne({ _id: entry.questionId });
      entry.categoryId = question.categoryId;
      entry.private = question.private;
      entry.groupId = question.groupId;
      return;

    case constants.OBJECT_TYPES.artifact:
    case constants.OBJECT_TYPES.argument:
    case constants.OBJECT_TYPES.argumentLink:
    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      let owner = await getDbModelByObjectType(entry.ownerType).findOne({ _id: entry.ownerId });
      if (entry.ownerType === constants.OBJECT_TYPES.topic && (!owner.parentId || isCategoryTopic(owner))) {
        // owner is a root or category topic
        entry.categoryId = owner._id;
      } else {
        entry.categoryId = owner.categoryId;
      }
      entry.private = owner.private;
      entry.groupId = owner.groupId;
      return;

    default:
      return;
  }
}

// @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
function setVerdictModel(result) {
  if (!result.verdict || !result.verdict.status) {
    result.verdict = {
      status: constants.VERDICT_STATUS.pending,
    };
  }
  const status = result.verdict.status;
  const theme = constants.VERDICT_STATUS.getTheme(status);
  const category = constants.VERDICT_STATUS.getCategory(status);
  switch (category) {
    case constants.VERDICT_STATUS.categories.true:
      result.verdict.true = true;
      break;
    case constants.VERDICT_STATUS.categories.false:
      result.verdict.false = true;
      break;
    case constants.VERDICT_STATUS.categories.pending:
      result.verdict.pending = true;
      break;
  }
  result.verdict.category = category;
  result.verdict.label = constants.VERDICT_STATUS.getLabel(status);
  result.verdict.theme = theme.theme;
  result.verdict.icon = theme.icon;

  if (typeof result.typeId !== 'undefined' && result.typeId !== constants.ARGUMENT_TYPES.factual) {
    result.typeUX = constants.ARGUMENT_TYPES.getUXInfo(result.typeId);
  }
}

// @ts-ignore TS(7006): Parameter 'results' implicitly has an 'any' type.
function sortArguments(results) {
  // @ts-ignore TS(7006): Parameter 'a' implicitly has an 'any' type.
  results.sort(function(a, b) {
    if (a.typeId === constants.ARGUMENT_TYPES.artifact && b.typeId !== constants.ARGUMENT_TYPES.artifact) {
      return 1;
    }
    if (a.typeId !== constants.ARGUMENT_TYPES.artifact && b.typeId === constants.ARGUMENT_TYPES.artifact) {
      return -1;
    }
    if (a.verdict.category > b.verdict.category) {
      return -1;
    }
    if (a.verdict.category < b.verdict.category) {
      return 1;
    }
    if (a.title > b.title) {
      return 1;
    }
    if (a.title < b.title) {
      return -1;
    }
    return 0;
  });
}

// @ts-ignore TS(7006): Parameter 'args' implicitly has an 'any' type.
function getVerdictCount(args) {
  const verdictCount = {
    true: 0,
    false: 0,
    pending: 0,
  };
  // @ts-ignore TS(7006): Parameter 'arg' implicitly has an 'any' type.
  args.forEach(function(arg) {
    const varg = arg.verdict && arg.verdict.status ? arg.verdict.status : constants.VERDICT_STATUS.pending;
    const category = constants.VERDICT_STATUS.getCategory(varg);
    switch (category) {
      case constants.VERDICT_STATUS.categories.true:
        verdictCount.true++;
        break;
      case constants.VERDICT_STATUS.categories.false:
        verdictCount.false++;
        break;
      case constants.VERDICT_STATUS.categories.pending:
        verdictCount.pending++;
        break;
    }
  });
  if (verdictCount.true === 0) {
    // @ts-ignore TS(2790): The operand of a 'delete' operator must be optiona... Remove this comment to see the full error message
    delete verdictCount.true;
  }
  if (verdictCount.false === 0) {
    // @ts-ignore TS(2790): The operand of a 'delete' operator must be optiona... Remove this comment to see the full error message
    delete verdictCount.false;
  }
  if (verdictCount.pending === 0) {
    // @ts-ignore TS(2790): The operand of a 'delete' operator must be optiona... Remove this comment to see the full error message
    delete verdictCount.pending;
  }
  return verdictCount;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function ensureEntryIdParam(req, entry) {
  if (!req.query[entry]) {
    if (req.params.id) {
      req.query[entry] = req.params.id;
    } else {
      const friendlyId = req.params.friendlyUrl;
      if (friendlyId) {
        if (utils.isObjectIdString(friendlyId)) {
          req.query[entry] = friendlyId;
        } else {
          req.query.friendlyUrl = friendlyId;
        }
      }
    }
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function createOwnerQueryFromQuery(req) {
  if (req.query.opinion) {
    return {
      ownerType: constants.OBJECT_TYPES.opinion,
      ownerId: req.query.opinion,
    };
  } else if (req.query.issue) {
    return {
      ownerType: constants.OBJECT_TYPES.issue,
      ownerId: req.query.issue,
    };
  } else if (req.query.answer) {
    return {
      ownerType: constants.OBJECT_TYPES.answer,
      ownerId: req.query.answer,
    };
  } else if (req.query.question) {
    return {
      ownerType: constants.OBJECT_TYPES.question,
      ownerId: req.query.question,
    };
  } else if (req.query.artifact) {
    return {
      ownerType: constants.OBJECT_TYPES.artifact,
      ownerId: req.query.artifact,
    };
  } else if (req.query.argumentLink) {
    return {
      ownerType: constants.OBJECT_TYPES.argumentLink,
      ownerId: req.query.argumentLink,
    };
  } else if (req.query.argument) {
    return {
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: req.query.argument,
    };
  } else if (req.query.topicLink) {
    return {
      ownerType: constants.OBJECT_TYPES.topicLink,
      ownerId: req.query.topicLink,
    };
  } else if (req.query.topic) {
    return {
      ownerType: constants.OBJECT_TYPES.topic,
      ownerId: req.query.topic,
    };
  }
  return {};
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function setModelOwnerEntry(req, res, model, options) {
  if (!options) options = {};

  if (model.opinion && (!model.issue || model.opinion.ownerType === constants.OBJECT_TYPES.issue)) {
    model.entry = model.opinion;
    model.entryType = constants.OBJECT_TYPES.opinion;
    model.isEntryOwner = model.isOpinionOwner;
    model.isOpinionEntry = true;
  } else if (model.parentOpinion && (!model.issue || model.parentOpinion.ownerType === constants.OBJECT_TYPES.issue)) {
    model.entry = model.parentOpinion;
    model.entryType = constants.OBJECT_TYPES.opinion;
    model.isEntryOwner = model.isOpinionOwner;
    model.isOpinionEntry = true;
  } else if (model.issue) {
    model.entry = model.issue;
    model.entryType = constants.OBJECT_TYPES.issue;
    model.isEntryOwner = model.isIssueOwner;
    model.isIssueEntry = true;
    model.issueType = constants.ISSUE_TYPES['type' + model.issue.issueType];
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.issue);
  } else if (model.answer) {
    model.entry = model.answer;
    model.entryType = constants.OBJECT_TYPES.answer;
    model.isEntryOwner = model.isAnswerOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.answer);
  } else if (model.question) {
    model.entry = model.question;
    model.entryType = constants.OBJECT_TYPES.question;
    model.isEntryOwner = model.isQuestionOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.question);
  } else if (model.artifact) {
    model.entry = model.artifact;
    model.entryType = constants.OBJECT_TYPES.artifact;
    model.isEntryOwner = model.isArtifactOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.artifact);
  } else if (model.argumentLink) {
    model.entry = model.argumentLink;
    model.entryType = constants.OBJECT_TYPES.argumentLink;
    model.isEntryOwner = model.isArgumentLinkOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.argumentLink);
    setVerdictModel(model.argumentLink);
  } else if (model.argument) {
    model.entry = model.argument;
    model.entryType = constants.OBJECT_TYPES.argument;
    model.isEntryOwner = model.isArgumentOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.argument);
    setVerdictModel(model.argument);
    // Argument Tags
    const tags = model.argument.tags;
    if (tags && tags.length > 0) {
      const tagLabels = [];
      if (model.argument.ethicalStatus.hasValue) {
        tagLabels.push(constants.ARGUMENT_TAGS.tag10);
        model.hasValue = true;
      }
      // @ts-ignore TS(7006): Parameter 'tag' implicitly has an 'any' type.
      tags.forEach(function(tag) {
        tagLabels.push(constants.ARGUMENT_TAGS['tag' + tag]);
        if (!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
          model.hasValue = true;
        }
      });
      model.tagLabels = tagLabels;
    }
    if (!model.hasValue && (model.argument.ethicalStatus.hasValue || model.argument.typeId === constants.ARGUMENT_TYPES.ethical)) {
      model.hasValue = true;
    }
  } else if (model.topicLink) {
    model.entry = model.topicLink;
    model.entryType = constants.OBJECT_TYPES.topicLink;
    model.isEntryOwner = model.isTopicLinkOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.topicLink);
    setVerdictModel(model.topicLink);
    // Topic Tags
    const topicLinkTags = model.topicLink.topic.tags;
    if (topicLinkTags && topicLinkTags.length > 0) {
      const topicLinkTagLabels = [];
      if (model.topicLink.topic.ethicalStatus.hasValue) {
        topicLinkTagLabels.push(constants.TOPIC_TAGS.tag10);
        model.hasValue = true;
      }
      // @ts-ignore TS(7006): Parameter 'tag' implicitly has an 'any' type.
      topicLinkTags.forEach(function(tag) {
        topicLinkTagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
        if (tag === constants.TOPIC_TAGS.tag520.code) {
          model.mainTopic = true;
        }
        if (!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
          model.hasValue = true;
        }
      });
      model.tagLabels = topicLinkTagLabels;
    } else if (model.topicLink.topic.ethicalStatus.hasValue) {
      model.hasValue = true;
    }
  } else if (model.topic) {
    model.entry = model.topic;
    model.entryType = constants.OBJECT_TYPES.topic;
    model.isEntryOwner = model.isTopicOwner;
    if (!options.hideClipboard)
      setClipboardModel(req, model, constants.OBJECT_TYPES.topic);
    setVerdictModel(model.topic);
    // Topic Tags
    const topicTags = model.topic.tags;
    if (topicTags && topicTags.length > 0) {
      const topicTagLabels = [];
      if (model.topic.ethicalStatus.hasValue) {
        topicTagLabels.push(constants.TOPIC_TAGS.tag10);
        model.hasValue = true;
      }
      // @ts-ignore TS(7006): Parameter 'tag' implicitly has an 'any' type.
      topicTags.forEach(function(tag) {
        topicTagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
        if (tag === constants.TOPIC_TAGS.tag520.code) {
          model.mainTopic = true;
        }
        if (!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
          model.hasValue = true;
        }
      });
      model.tagLabels = topicTagLabels;
    } else if (model.topic.ethicalStatus.hasValue) {
      model.hasValue = true;
    }
  }

  // @ts-ignore TS(2554): Expected 4 arguments, but got 3.
  setModelContext(req, res, model);
}

// @ts-ignore TS(7006): Parameter 'type' implicitly has an 'any' type.
function getDbModelByObjectType(type) {
  switch (type) {
    case constants.OBJECT_TYPES.topic:
      return db.Topic;
    case constants.OBJECT_TYPES.topicLink:
      return db.TopicLink;
    case constants.OBJECT_TYPES.argument:
      return db.Argument;
    case constants.OBJECT_TYPES.argumentLink:
      return db.ArgumentLink;
    case constants.OBJECT_TYPES.artifact:
      return db.Artifact;
    case constants.OBJECT_TYPES.question:
      return db.Question;
    case constants.OBJECT_TYPES.answer:
      return db.Answer;
    case constants.OBJECT_TYPES.issue:
      return db.Issue;
    case constants.OBJECT_TYPES.opinion:
      return db.Opinion;
  }
  return null;
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
function getEntryByObjectType(model, type) {
  switch (type) {
    case constants.OBJECT_TYPES.topic:
      return model.topic;
    case constants.OBJECT_TYPES.topicLink:
      return model.topicLink;
    case constants.OBJECT_TYPES.argument:
      return model.argument;
    case constants.OBJECT_TYPES.argumentLink:
      return model.argumentLink;
    case constants.OBJECT_TYPES.artifact:
      return model.artifact;
    case constants.OBJECT_TYPES.question:
      return model.question;
    case constants.OBJECT_TYPES.answer:
      return model.answer;
    case constants.OBJECT_TYPES.issue:
      return model.issue;
    case constants.OBJECT_TYPES.opinion:
      return model.opinion;
  }
  return null;
}

// @ts-ignore TS(7006): Parameter 'type' implicitly has an 'any' type.
function getObjectName(type) {
  switch (type) {
    case constants.OBJECT_TYPES.topic:
      return 'topic';
    case constants.OBJECT_TYPES.topicLink:
      return 'topicLink';
    case constants.OBJECT_TYPES.argument:
      return 'argument';
    case constants.OBJECT_TYPES.argumentLink:
      return 'argumentLink';
    case constants.OBJECT_TYPES.artifact:
      return 'artifact';
    case constants.OBJECT_TYPES.question:
      return 'question';
    case constants.OBJECT_TYPES.answer:
      return 'answer';
    case constants.OBJECT_TYPES.issue:
      return 'issue';
    case constants.OBJECT_TYPES.opinion:
      return 'opinion';
  }
  return '';
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
function createOwnerQueryFromModel(model) {
  if (model.issue) {
    return {
      ownerType: constants.OBJECT_TYPES.issue,
      ownerId: model.issue._id,
    };
  } else if (model.opinion) {
    return {
      ownerType: constants.OBJECT_TYPES.opinion,
      ownerId: model.opinion._id,
    };
  } else if (model.question) {
    return {
      ownerType: constants.OBJECT_TYPES.question,
      ownerId: model.question._id,
    };
  } else if (model.artifact) {
    return {
      ownerType: constants.OBJECT_TYPES.artifact,
      ownerId: model.artifact._id,
    };
  } else if (model.argumentLink) {
    return {
      ownerType: constants.OBJECT_TYPES.argumentLink,
      ownerId: model.argumentLink._id,
    };
  } else if (model.argument) {
    return {
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: model.argument._id,
    };
  } else if (model.topicLink) {
    return {
      ownerType: constants.OBJECT_TYPES.topicLink,
      ownerId: model.topicLink._id,
    };
  } else if (model.topic) {
    return {
      ownerType: constants.OBJECT_TYPES.topic,
      ownerId: model.topic._id,
    };
  }
  return {};
}

/**
 *
 * @param req
 * @param model
 * @param mixedMode The place this is called may display both public and private entries (e.g. clipboard)
 */
// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function setModelContext(req, res, model, mixedMode) {
  if (res.locals.group) {
    model.group = res.locals.group;
    model.wikiBaseUrl = buildGroupUrl(model.group) + paths.groups.group.posts;
  } else if (req.params.username || (mixedMode && req.user && req.user.username) || (model.entry && model.entry.private)) {
    model.username = req.params.username || req.user.username;
    model.profileBaseUrl = paths.members.index + '/' + model.username;
    model.wikiBaseUrl = model.profileBaseUrl + (paths.members.profile.journal || paths.members.profile.diary);
  } else {
    model.username = '';
    model.profileBaseUrl = '';
    model.wikiBaseUrl = '';
  }
}

// @ts-ignore TS(7006): Parameter 'content' implicitly has an 'any' type.
function getEditorContent(content) {
  if (!content) return '';
  const { sanitizeContent } = require('./sanitizeHtml');
  let c = sanitizeContent(content.trim());
  if (c === '<p><br></p>') {
    c = '';
  }
  return c;
}

// @ts-ignore TS(7006): Parameter 'baseUrl' implicitly has an 'any' type.
function buildEntryUrl(baseUrl, entry) {
  return baseUrl + '/' + entry.friendlyUrl + '/' + entry._id;
}

// @ts-ignore TS(7006): Parameter 'username' implicitly has an 'any' type.
function getDiaryBaseUrl(username) {
  return paths.members.index + '/' + username + (paths.members.profile.journal || paths.members.profile.diary);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function buildReturnUrl(req, defaultBaseUrl) {
  const nextUrl = url.parse(req.originalUrl);
  const nextQuery = querystring.parse(nextUrl.query);
  delete nextQuery.id;
  if (nextQuery.source) {
    nextUrl.pathname = nextQuery.source;
    delete nextQuery.source;
  } else if (defaultBaseUrl) {
    nextUrl.pathname = defaultBaseUrl;
  }
  nextUrl.query = nextQuery;
  nextUrl.search = null; // important, ensures new 'query' to take effect
  return url.format(nextUrl);
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
function buildTopicReturnUrl(model, cancelBaseUrl, entry, parent) {
  return entry ? buildEntryUrl(cancelBaseUrl, entry) :
    parent ? buildEntryUrl(cancelBaseUrl, parent) :
      (model.username || model.group) ? model.wikiBaseUrl : '/';
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function buildParentUrl(req, entry) {
  // @ts-ignore TS(7006): Parameter 'entry' implicitly has an 'any' type.
  const getBaseUrl = function(entry) {
    return entry.private ? paths.members.index + '/' + req.user.username + (paths.members.profile.journal || paths.members.profile.diary) : '';
  };
  // @ts-ignore TS(7006): Parameter 'entry' implicitly has an 'any' type.
  const buildRedirectUrl = function(entry) {
    const wikiBaseUrl = getBaseUrl(entry);
    switch (entry.ownerType) {
      case constants.OBJECT_TYPES.topicLink:
        return wikiBaseUrl + '/topic/link/' + entry.ownerId;
      case constants.OBJECT_TYPES.argumentLink:
        return wikiBaseUrl + '/argument/link/' + entry.ownerId;
      default:
        return wikiBaseUrl + '/' + constants.OBJECT_ID_NAME_MAP[entry.ownerType] + '/' + entry.ownerId;
    }
  };

  switch (entry.getType()) {
    case constants.OBJECT_TYPES.topic:
      return getBaseUrl(entry) + (entry.parentId ? '/topic/' + entry.parentId : '/');

    case constants.OBJECT_TYPES.topicLink:
      return getBaseUrl(entry) + '/topic/' + entry.parentId;

    case constants.OBJECT_TYPES.argument:
    case constants.OBJECT_TYPES.argumentLink:
      return entry.parentId ? getBaseUrl(entry) + '/argument/' + entry.parentId : buildRedirectUrl(entry);

    case constants.OBJECT_TYPES.artifact:
      return entry.parentId ? getBaseUrl(entry) + '/artifact/' + entry.parentId : buildRedirectUrl(entry);

    case constants.OBJECT_TYPES.answer:
      return getBaseUrl(entry) + '/question/' + entry.questionId;

    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      return buildRedirectUrl(entry);
  }

  return '/';
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function buildEntryReturnUrl(req, model) {
  const fallbackBaseUrl = model && model.wikiBaseUrl ? model.wikiBaseUrl : '/';
  if (!model || !model.entry || !model.entryType) {
    return fallbackBaseUrl;
  }

  const entry = model.entry;
  const entryTitle = entry && entry.title ? entry.title : '';
  const entryId = entry && entry._id ? entry._id : '';

  switch (model.entryType) {
    case constants.OBJECT_TYPES.topic:
      if (!entryTitle || !entryId) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki.topics.entry + '/' + utils.urlify(entryTitle) + '/' + entryId;
    case constants.OBJECT_TYPES.topicLink:
      if (!entry.topic || !entry.topic.title || !entryId) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki.topics.entry + '/' + utils.urlify(entry.topic.title) + '/link/' + entryId;
    case constants.OBJECT_TYPES.argument:
      if (!entryTitle) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(entryTitle) + '/' + (req.query.argument || entryId);
    case constants.OBJECT_TYPES.argumentLink:
      if (!entry.argument || !entry.argument.title) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(entry.argument.title) + '/link/' + (req.query.argument || entryId);
    default: {
      const ownerName = constants.OBJECT_NAMES_MAP[model.ownerType];
      if (!ownerName || !paths.wiki[ownerName] || !paths.wiki[ownerName].entry || !entryTitle || !entryId) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki[ownerName].entry + '/' + utils.urlify(entryTitle) + '/' + entryId;
    }
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function setScreeningModel(req, model) {
  if (!model.screening) {
    model.screening = {};
  }

  const baseUrl = url.parse(req.originalUrl);
  const newQuery = querystring.parse(baseUrl.query);
  baseUrl.search = null; // important, ensures new 'query' to take effect

  newQuery.screening = 'pending';
  baseUrl.query = newQuery;
  model.screening.pendingUrl = url.format(baseUrl);

  newQuery.screening = 'approved';
  baseUrl.query = newQuery;
  model.screening.approvedUrl = url.format(baseUrl);

  newQuery.screening = 'rejected';
  baseUrl.query = newQuery;
  model.screening.rejectedUrl = url.format(baseUrl);

  newQuery.screening = 'archived';
  baseUrl.query = newQuery;
  model.screening.archivedUrl = url.format(baseUrl);

  if (req.query.screening) {
    if (req.query.screening === 'pending') {
      model.screening.pending = true;
      model.screening.status = constants.SCREENING_STATUS.status0.code;
      return;
    } else if (req.query.screening === 'rejected') {
      model.screening.rejected = true;
      model.screening.status = constants.SCREENING_STATUS.status2.code;
      return;
    } else if (req.query.screening === 'archived') {
      model.screening.archived = true;
      model.screening.status = constants.SCREENING_STATUS.status3.code;
      return;
    }
  }
  model.screening.approved = true;
  model.screening.status = constants.SCREENING_STATUS.status1.code;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function initScreeningStatus(req, entity) {
  if (req.user.roles.reviewer || req.params.username || req.body.username) { /* req.body.username is used by clipboard */
    entity.screening = {
      status: constants.SCREENING_STATUS.status1.code,
      history: [],
    };
  }
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
function setScreeningModelCount(model, childrenCount) {
  model.childrenCount = childrenCount;
  if (model.childrenCount.pending === 0 && model.childrenCount.rejected === 0) {
    model.screening.hidden = true;
  } else {
    model.childrenCount.archived = utils.randomInt(1, 9);
  }
}

// @ts-ignore TS(7006): Parameter 'entity' implicitly has an 'any' type.
function getParent(entity, type) {
  switch (type) {
    case constants.OBJECT_TYPES.topic:
      if (entity.parentId) {
        return {
          entryId: entity.parentId,
          entryType: constants.OBJECT_TYPES.topic,
        };
      } else if (entity.ownerId) {
        return {
          entryId: entity.ownerId,
          entryType: entity.ownerType,
        };
      }
      break;
    case constants.OBJECT_TYPES.topicLink:
      if (entity.parentId) {
        return {
          entryId: entity.parentId,
          entryType: constants.OBJECT_TYPES.topic,
        };
      } else if (entity.ownerId) {
        return {
          entryId: entity.ownerId,
          entryType: entity.ownerType,
        };
      }
      break;
    case constants.OBJECT_TYPES.artifact:
      if (entity.parentId) {
        return {
          entryId: entity.parentId,
          entryType: constants.OBJECT_TYPES.artifact,
        };
      } else if (entity.ownerId) {
        return {
          entryId: entity.ownerId,
          entryType: entity.ownerType,
        };
      }
      break;
    case constants.OBJECT_TYPES.argument:
      if (entity.parentId) {
        return {
          entryId: entity.parentId,
          entryType: constants.OBJECT_TYPES.argument,
        };
      } else if (entity.ownerId) {
        return {
          entryId: entity.ownerId,
          entryType: entity.ownerType,
        };
      }
      break;
    case constants.OBJECT_TYPES.argumentLink:
      if (entity.parentId) {
        return {
          entryId: entity.parentId,
          entryType: constants.OBJECT_TYPES.argument,
        };
      } else if (entity.ownerId) {
        return {
          entryId: entity.ownerId,
          entryType: entity.ownerType,
        };
      }
      break;
    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.issue:
      return {
        entryId: entity.ownerId,
        entryType: entity.ownerType,
      };
    case constants.OBJECT_TYPES.answer:
      return {
        entryId: entity.questionId,
        entryType: constants.OBJECT_TYPES.question,
      };
    case constants.OBJECT_TYPES.opinion:
      if (entity.parentId) {
        return {
          entryId: entity.parentId,
          entryType: constants.OBJECT_TYPES.opinion,
        };
      } else if (entity.ownerId) {
        return {
          entryId: entity.ownerId,
          entryType: entity.ownerType,
        };
      }
      break;
  }
  return null;
}

// @ts-ignore TS(7006): Parameter 'member' implicitly has an 'any' type.
function setMemberFullname(member) {
  if (member.roles.account) {
    const fullname = member.roles.account.name.full;
    if (fullname && fullname !== member.username) {
      member.fullname = fullname;
    }
  }
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function isEntryOnIntendedUrl(req, res, entry) {
  return !entry.private && !req.params.username || entry.private && (res.locals.group || req.params.username && entry.createUserId.equals(req.user.id));
}

// @ts-ignore TS(7006): Parameter 'content' implicitly has an 'any' type.
function createContentPreview(content) {
  return utils.getShortText(
    htmlToText.fromString(content,
      {
        wordwrap: false,
        hideLinkHrefIfSameAsText: true,
        ignoreImage: true,
        ignoreHref: true,
      }),
    constants.SETTINGS.contentPreviewLength,
  );
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
async function getCategories(model, topicId, req) {
  let results = await getTopics({
    parentId: topicId,
    private: false,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  }, {
    limit: 0,
    shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
    req: req,
  });
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  await async.each(results, async function(result) {
    let subTopics = await getTopics({ parentId: result._id }, {
      limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
      shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
      req: req,
    });
    result.subtopics = subTopics;
    if (subTopics.length < constants.SETTINGS.SUBCATEGORY_LIST_SIZE) {
      // if subtopics are less than 3, get some arguments
      const query = {
        parentId: null,
        ownerId: result._id,
        ownerType: constants.OBJECT_TYPES.topic,
        'screening.status': constants.SCREENING_STATUS.status1.code,
      };
      let subArguments = await getArguments(query, {
        limit: constants.SETTINGS.SUBCATEGORY_LIST_SIZE,
        rq: req,
        shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
      });
      subArguments.forEach(function(subArgument) {
        setVerdictModel(subArgument);
      });
      sortArguments(subArguments);
      result.subarguments = subArguments;
    }
  });
  model.categories = results;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function getDiaryCategories(req) {
  let results = await db.Topic
    .find({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: req.user.id })
    .sort({ title: 1 })
    .lean();
  // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
  await async.each(results, function(result) {
    result.friendlyUrl = utils.urlify(result.title);
  });
  return results;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function getUserGroups(req) {
  return await db.Group.find({ 'members.userId': req.user.id }).sort({ title: 1 }).lean();
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
function createEntrySet(model) {
  const entries = []
    .concat(model.topics)
    .concat(model.arguments)
    .concat(model.questions)
    .concat(model.answers)
    .concat(model.issues)
    .concat(model.opinions)
    .concat(model.artifacts)
    .sort(function(a, b) {
      // @ts-ignore TS(2339): Property 'editDate' does not exist on type 'never'... Remove this comment to see the full error message
      if (a.editDate < b.editDate) {
        return 1;
      }
      // @ts-ignore TS(2339): Property 'editDate' does not exist on type 'never'... Remove this comment to see the full error message
      if (a.editDate > b.editDate) {
        return -1;
      }
      return 0;
    });
  if (entries.length > 1) {
    const midIndex = Math.floor(entries.length / 2);
    model.entrySet = [{ entries: entries.slice(0, midIndex - 1) }];
    model.entrySet.push({ entries: entries.slice(midIndex) });
  } else {
    model.entrySet = [{ entries: entries }];
  }
}

// @ts-ignore TS(7006): Parameter 'model' implicitly has an 'any' type.
async function countEntries(model, groupFilter) {
  await async.parallel({
    topics: async function() {
      model.topics = await db.Topic
        .find(groupFilter)
        .countDocuments();
    },
    artifacts: async function() {
      model.artifacts = await db.Artifact
        .find(groupFilter)
        .countDocuments();
    },
    arguments: async function() {
      model.arguments = await db.Argument
        .find(groupFilter)
        .countDocuments();
    },
    questions: async function() {
      model.questions = await db.Question
        .find(groupFilter)
        .countDocuments();
    },
    answers: async function() {
      model.answers = await db.Answer
        .find(groupFilter)
        .countDocuments();
    },
    issues: async function() {
      model.issues = await db.Issue
        .find(groupFilter)
        .countDocuments();
    },
    opinions: async function() {
      model.opinions = await db.Opinion
        .find(groupFilter)
        .countDocuments();
    },
  });
  model.totalCount = model.topics + model.arguments + model.questions + model.answers + model.issues + model.opinions;
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
function resetCache(req) {
  delete req.app.locals.appCategories;
  const apps = applications.getApplications();
  // @ts-ignore TS(7006): Parameter 'app' implicitly has an 'any' type.
  apps.forEach(function(app) {
    delete app.appCategories;
  });
}

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = {
  getBackupDir,
  createContentPreview,
  isEntryOwner,
  isEntryOnIntendedUrl,
  isCategoryTopic,
  appendOwnerFlag,
  appendEntryExtras,

  setArgumentModels,
  setTopicModels,
  setQuestionModel,
  setIssueModel,
  setOpinionModel,
  setEntryModels,
  setGroupModel,
  setEntryParents,
  setEntryParent,
  setEditorsUsername,
  setUsername,
  setClipboardModel,
  setupClipboard,
  getClipboard,

  getTopics,
  getArguments,
  getTopQuestions,
  getTopArtifacts,
  getTopIssues,
  getTopOpinions,

  sortArguments,
  updateChildrenCount,
  updateChildrenCountBatch,
  syncCategoryId,
  syncChildren,
  initScreeningStatus,
  setScreeningModelCount,
  setScreeningModel,
  setModelOwnerEntry,
  setModelContext,
  setVerdictModel,
  getVerdictCount,
  setMemberFullname,
  createOwnerQueryFromQuery,
  createOwnerQueryFromModel,
  ensureEntryIdParam,

  getEditorContent,
  buildEntryUrl,
  buildTopicReturnUrl,
  buildReturnUrl,
  buildParentUrl,
  buildEntryReturnUrl,
  buildGroupUrl,
  getDiaryBaseUrl,
  getDbModelByObjectType,
  getEntryByObjectType,
  getObjectName,
  getParent,
  getCategories,
  getDiaryCategories,
  getUserGroups,
  createEntrySet,
  countEntries,

  resetCache,
};
