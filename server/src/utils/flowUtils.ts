'use strict';

let db = require('../app').db.models,
  utils = require('./utils'),
  constants = require('../models/constants'),
  paths = require('../models/paths'),
  applications = require('../models/applications'),
  config = require('../config/config'),
  url = require('url'),
  querystring = require('querystring'),
  htmlToText = require('html-to-text'),
  dateFns = require('date-fns'),
  async = require('async');

const childrenCountGuardrails = require('../services/childrenCountGuardrails'),
  normalizeChildrenCountUpdateTasks = childrenCountGuardrails.normalizeChildrenCountUpdateTasks,
  assertChildrenCountInvariants = childrenCountGuardrails.assertChildrenCountInvariants;

function getBackupDir(isPrivate?: boolean): string {
  let backupRoot = isPrivate && config.mongodb.privateBackupRoot ? config.mongodb.privateBackupRoot : config.mongodb.backupRoot;
  if (backupRoot) {
    if (backupRoot.startsWith('~')) {
      return process.cwd() + backupRoot.substring(1);
    }
    return backupRoot;
  }
  return process.cwd() + '/config/mongodb' + (isPrivate ? '/users' : '');
}

function isEntryOwner(req?: { user?: { id?: unknown } }, item?: { createUserId?: { equals(id: unknown): boolean } }) {
  return !!item && !!item.createUserId && !!req?.user && !!req.user.id && item.createUserId.equals(req.user.id);
}

function appendOwnerFlag(req?: { user?: { id?: unknown } }, item?: { createUserId?: { equals(id: unknown): boolean }; isItemOwner?: boolean }, model?: { isItemOwner?: boolean }) {
  if (isEntryOwner(req, item)) {
    if (!model) {
      model = item;
    }
    if (model) model.isItemOwner = true;
  }
}

function isCategoryTopic(entry?: { tags?: string[] }): boolean {
  return !!entry?.tags && entry.tags.indexOf(constants.TOPIC_TAGS.tag510.code) > -1;
}

type EntryExtras = Record<string, unknown> & {
  title?: string;
  contextTitle?: string;
  friendlyUrl?: string;
  shortTitle?: string;
  objectType?: number;
  objectName?: string;
  getType?: () => number;
  content?: string;
  contentPreview?: string;
  showMore?: boolean;
  comments?: number;
  points?: number;
  editDate?: Date;
  createDate?: Date;
  editDateString?: string;
  createDateString?: string;
  createUserId?: { toString(): string; equals(id: unknown): boolean };
  editUserId?: { toString(): string };
  sameEditor?: boolean;
  sameEditDate?: boolean;
  referenceDate?: Date;
  referenceDateString?: string;
  referenceDateUTC?: string;
  referenceDateSimple?: string;
  childrenCount?: Record<string, { accepted?: number } | undefined>;
  hasChildren?: boolean;
  isItemOwner?: boolean;
};

function appendListExtras(item?: EntryExtras, objectType?: number, shortTitleLength?: number, _req?: unknown) {
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

function appendEntryExtras(item?: EntryExtras, objectType?: number, req?: { user?: { id?: unknown } }, shortTitleLength?: number) {
  if (!item) return;
  appendListExtras(item, objectType, shortTitleLength);
  item.comments = utils.randomInt(0, 999);
  item.points = utils.randomInt(0, 9999);

  //let editDateString = result.editDate.toUTCString();
  item.editDateString = utils.timeSince(item.editDate, true) + ' ago';
  item.createDateString = utils.timeSince(item.createDate, true) + ' ago';

  item.sameEditor = item.createUserId?.toString() === item.editUserId?.toString();
  item.sameEditDate = item.createDate?.valueOf() === item.editDate?.valueOf();

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
    if (item.referenceDateSimple && /,?\s*12:00 AM$/.test(item.referenceDateSimple)) {
      item.referenceDateSimple = item.referenceDateSimple.replace(/,?\s*12:00 AM$/, '');
    }
  }
  if (item.childrenCount) {
    const childrenCount = item.childrenCount;
    let hasChildren = function(objectName: string) {
      const c = childrenCount[objectName];
      return !!c && (c.accepted ?? 0) > 0;
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
    appendOwnerFlag(req, item);
  }
}

/*
    items: items to which to set the parents
    typeId: the typeId of the items
 */
async function setEntryParents(items: Array<Record<string, unknown>> | undefined, typeId: number) {
  if (!items || items.length === 0) {
    return;
  }

  type IdItem = { valueOf(): string };
  type ParentItem = { parentId?: IdItem; ownerId?: IdItem; ownerType?: number; questionId?: IdItem; parentTopic?: unknown; parentTopicLink?: unknown; parentArtifact?: unknown; parentArgument?: unknown; parentArgumentLink?: unknown; parentQuestion?: unknown; parentAnswer?: unknown; parentIssue?: unknown; parentOpinion?: unknown };
  type LeanDoc = Record<string, unknown> & { _id: IdItem; topicId?: IdItem; argumentId?: IdItem; topic?: { title?: string }; argument?: { title?: string }; title?: string; title2?: string };
  let topicIds: unknown[] = [], topicLinkIds: unknown[] = [], argumentIds: unknown[] = [], argumentLinkIds: unknown[] = [], artifactIds: unknown[] = [], questionIds: unknown[] = [],
    answerIds: unknown[] = [], issueIds: unknown[] = [], opinionIds: unknown[] = [];
  const idLookup = (arr: unknown[]) => arr as unknown as Record<string, unknown>;
  let topics: Record<string, LeanDoc> = {}, topicLinks: Record<string, LeanDoc> = {}, args: Record<string, LeanDoc> = {}, argumentLinks: Record<string, LeanDoc> = {}, artifacts: Record<string, LeanDoc> = {}, questions: Record<string, LeanDoc> = {}, answers: Record<string, LeanDoc> = {},
    issues: Record<string, LeanDoc> = {}, opinions: Record<string, LeanDoc> = {};
  switch (typeId) {
    case constants.OBJECT_TYPES.topic:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.parentId && !idLookup(topicIds)[item.parentId.valueOf()]) {
          topicIds.push(item.parentId.valueOf());
        }
      });
      break;
    case constants.OBJECT_TYPES.argument:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.parentId && !idLookup(argumentIds)[item.parentId.valueOf()]) {
          argumentIds.push(item.parentId.valueOf());
        } else if (item.ownerId && !idLookup(topicIds)[item.ownerId.valueOf()]) {
          topicIds.push(item.ownerId.valueOf());
        }
      });
      break;
    case constants.OBJECT_TYPES.artifact:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.parentId && !idLookup(artifactIds)[item.parentId.valueOf()]) {
          artifactIds.push(item.parentId.valueOf());
        } else if (item.ownerId && !idLookup(topicIds)[item.ownerId.valueOf()]) {
          topicIds.push(item.ownerId.valueOf());
        }
      });
      break;
    case constants.OBJECT_TYPES.answer:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.questionId) questionIds.push(item.questionId.valueOf());
      });
      break;
    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (!item.ownerId) return;
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
          .find({ _id: { $in: topicIds } })
          .exec();
        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          topics[result._id.valueOf()] = result;
        });
      }
    },
    topicLinks: async function() {
      if (topicLinkIds.length > 0) {
        let linkResults = await db.TopicLink
          .find({ _id: { $in: topicLinkIds } })
          .exec();
        let topicIds2: unknown[] = [], topics2: Record<string, LeanDoc> = {};
        linkResults.forEach(function(result: LeanDoc) {
          if (result.topicId) topicIds2.push(result.topicId.valueOf());
        });

        let topicResults = await db.Topic
          .find({ _id: { $in: topicIds2 } })
          .exec();
        topicResults.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          topics2[result._id.valueOf()] = result;
        });
        linkResults.forEach(function(result: LeanDoc) {
          if (result.topicId) result.topic = topics2[result.topicId.valueOf()] as { title?: string };
          result.title2 = result.title ? result.title : (result.topic?.title ?? '');
          topicLinks[result._id.valueOf()] = result;
        });
      }
    },
    arguments: async function() {
      if (argumentIds.length > 0) {
        let query = { _id: { $in: argumentIds } };
        let results = await db.Argument
          .find(query)
          .exec();
        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          args[result._id.valueOf()] = result;
        });
      }
    },
    argumentLinks: async function() {
      if (argumentLinkIds.length > 0) {
        let results = await db.ArgumentLink
          .find({ _id: { $in: argumentLinkIds } })
          .exec();

        let argumentIds2: unknown[] = [], arguments2: Record<string, LeanDoc> = {};
        results.forEach(function(result: LeanDoc) {
          if (result.argumentId) argumentIds2.push(result.argumentId.valueOf());
        });

        let results2 = await db.Argument
          .find({ _id: { $in: argumentIds2 } })
          .exec();
        results2.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          arguments2[result._id.valueOf()] = result;
        });
        results.forEach(function(result: LeanDoc) {
          if (result.argumentId) result.argument = arguments2[result.argumentId.valueOf()] as { title?: string };
          result.title2 = result.title ? result.title : (result.argument?.title ?? '');
          argumentLinks[result._id.valueOf()] = result;
        });
      }
    },
    questions: async function() {
      if (questionIds.length > 0) {
        let query = { _id: { $in: questionIds } };
        let results = await db.Question
          .find(query)
          .exec();

        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          questions[result._id.valueOf()] = result;
        });
      }
    },
    answers: async function() {
      if (answerIds.length > 0) {
        let query = { _id: { $in: answerIds } };
        let results = await db.Answer
          .find(query)
          .exec();

        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          answers[result._id.valueOf()] = result;
        });
      }
    },
    artifacts: async function() {
      if (artifactIds.length > 0) {
        let query = { _id: { $in: artifactIds } };
        let results = await db.Artifact
          .find(query)
          .exec();

        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          artifacts[result._id.valueOf()] = result;
        });
      }
    },
    issues: async function() {
      if (issueIds.length > 0) {
        let query = { _id: { $in: issueIds } };
        let results = await db.Issue
          .find(query)
          .exec();

        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          issues[result._id.valueOf()] = result;
        });
      }
    },
    opinions: async function() {
      if (opinionIds.length > 0) {
        let query = { _id: { $in: opinionIds } };
        let results = await db.Opinion
          .find(query)
          .exec();

        results.forEach(function(result: LeanDoc) {
          appendListExtras(result);
          opinions[result._id.valueOf()] = result;
        });
      }
    },
  });

  switch (typeId) {
    case constants.OBJECT_TYPES.topic:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.parentId) {
          item.parentTopic = topics[item.parentId.valueOf()];
        }
      });
      break;
    case constants.OBJECT_TYPES.argument:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.parentId) {
          item.parentArgument = args[item.parentId.valueOf()];
        } else if (item.ownerId) {
          item.parentTopic = topics[item.ownerId.valueOf()];
        }
      });
      break;
    case constants.OBJECT_TYPES.answer:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (item.questionId) item.parentQuestion = questions[item.questionId.valueOf()];
      });
      break;
    case constants.OBJECT_TYPES.question:
    case constants.OBJECT_TYPES.artifact:
    case constants.OBJECT_TYPES.issue:
    case constants.OBJECT_TYPES.opinion:
      (items as ParentItem[]).forEach(function(item: ParentItem) {
        if (!item.ownerId) return;
        switch (item.ownerType) {
          case constants.OBJECT_TYPES.topic:
            item.parentTopic = topics[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.topicLink:
            item.parentTopicLink = topicLinks[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.argument:
            item.parentArgument = args[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.argumentLink:
            item.parentArgumentLink = argumentLinks[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.artifact:
            item.parentArtifact = artifacts[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.question:
            item.parentQuestion = questions[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.answer:
            item.parentAnswer = answers[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.issue:
            item.parentIssue = issues[item.ownerId.valueOf()];
            break;
          case constants.OBJECT_TYPES.opinion:
            item.parentOpinion = opinions[item.ownerId.valueOf()];
            break;
        }
      });
      break;
  }
}

// Backward-compatible helper for service layers that enrich a single entry.
// Reuses the same parent resolution path as batch operations.
async function setEntryParent(item?: Record<string, unknown>, typeId?: number): Promise<void> {
  if (!item) {
    return;
  }
  if (typeId === undefined) return;
  await setEntryParents([item], typeId);
}

async function setEditorsUsername(items?: Record<string, unknown>[]): Promise<void> {
  if (items && items.length > 0) {
    let seen: Record<string, boolean> = {};
    let userIds = items
      .filter(function(item: Record<string, unknown>) {
        let id = item.editUserId ? (item.editUserId as { valueOf(): string }).valueOf() : null;
        if (!id || seen[id]) {
          return false;
        }
        seen[id] = true;
        return true;
        //return !!item.editUserId;
      }).map(function(item: Record<string, unknown>) {
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
    let userNames: Record<string, unknown> = {};
    results.forEach(function(result: Record<string, unknown>) {
      userNames[(result._id as { valueOf(): string }).valueOf()] = result.username;
    });
    items.forEach(function(item: Record<string, unknown>) {
      if (item.editUserId) {
        item.editUsername = userNames[(item.editUserId as { valueOf(): string }).valueOf()];
      }
    });
  }
}

async function setCreateUsername(item?: Record<string, unknown>): Promise<void> {
  if (!item || !item.createUserId) {
    return;
  }

  let user = await db.User.findOne({ _id: item.createUserId });
  if (user) {
    item.createUsername = user.username;
  }
}

async function setEditUsername(item?: Record<string, unknown>): Promise<void> {
  if (!item || !item.editUserId) {
    return;
  }

  let user = await db.User.findOne({ _id: item.editUserId });
  if (user) {
    item.editUsername = user.username;
  }
}

async function setUsername(item?: Record<string, unknown>): Promise<void> {
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

function buildGroupUrl(group?: { friendlyUrl?: unknown; _id?: unknown }): string {
  return paths.groups.index + '/' + group?.friendlyUrl + '/' + group?._id;
}

async function setGroupModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.group) {
    let result = await db.Group.findOne({ _id: req.query.group });
    model.group = result;
    await setUsername(result);
  }
}

async function setArtifactModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.artifact) {
    let result = await db.Artifact.findOne({ _id: req.query.artifact });
    model.artifact = result;
    result.setThumbnailPath(req.params.username);
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isArtifactOwner = true;
    }
    await setUsername(result);
  }
}

async function setQuestionModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.question) {
    let result = await db.Question.findOne({ _id: req.query.question });
    model.question = result;
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isQuestionOwner = true;
    }
    await setUsername(result);
  }
}

async function setAnswerModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.answer) {
    let result = await db.Answer.findOne({ _id: req.query.answer });
    model.answer = result;
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isAnswerOwner = true;
    }
    await setUsername(result);
  }
}

async function setIssueModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.issue) {
    let result = await db.Issue.findOne({ _id: req.query.issue });
    model.issue = result;
    appendEntryExtras(result);
    if (isEntryOwner(req, result)) {
      model.isIssueOwner = true;
    }
    await setUsername(result);
  }
}

async function setOpinionModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
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
        const opinion = (model.opinion2 || model.opinion) as { parentId?: unknown } | undefined;
        if (opinion && opinion.parentId) {
          let result = await db.Opinion.findOne({ _id: opinion.parentId });
          if (result) {
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
        const parentOpinion = (model.parentOpinion2 || model.parentOpinion) as { parentId?: unknown } | undefined;
        if (parentOpinion && parentOpinion.parentId) {
          let result = await db.Opinion.findOne({ _id: parentOpinion.parentId });
          if (result) {
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

async function setArgumentLinkModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.argumentLink) {
    await async.series({
      argumentLink: async function() {
        let result = await db.ArgumentLink.findOne({ _id: req.query.argumentLink });
        model.argumentLink = result;
        appendEntryExtras(result);
        if (isEntryOwner(req, result)) {
          model.isArgumentLinkOwner = true;
        }
        await setUsername(result);
      },
      argument: async function() {
        if (model.argumentLink) {
          const argumentLink = model.argumentLink as { argumentId?: unknown; argument?: unknown; references?: unknown; title?: unknown; title2?: unknown; content2?: unknown };
          let result = await db.Argument.findOne({ _id: argumentLink.argumentId });
          if (result) {
            appendEntryExtras(result);
            argumentLink.argument = result;
            argumentLink.references = result.references;
            argumentLink.title2 = argumentLink.title ? argumentLink.title : result.title;
            argumentLink.content2 = result.content;
          }
        }
      },
    });
  }
}

async function setArgumentModels(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
  if (req.query.argument) {
    await async.series({
      argument: async function() {
        let result = await db.Argument.findOne({ _id: req.query.argument });
        if (!result) {
          return;
        }
        model.argument = result;
        appendEntryExtras(result);
        if (isEntryOwner(req, result)) {
          model.isArgumentOwner = true;
        }
        await setUsername(result);
      },
      parentArgument: async function() {
        const arg = model.argument as { parentId?: unknown } | undefined;
        if (arg && arg.parentId) {
          let result = await db.Argument.findOne({ _id: arg.parentId });
          if (result) {
            appendEntryExtras(result);
            model.parentArgument = result;
          }
        }
      },
      grandParentArgument: async function() {
        const parentArg = model.parentArgument as { parentId?: unknown } | undefined;
        if (parentArg && parentArg.parentId) {
          let result = await db.Argument.findOne({ _id: parentArg.parentId });
          if (result) {
            appendEntryExtras(result);
            model.grandParentArgument = result;
          }
        }
      },
    });
  }
}

async function setTopicLinkModel(req: { query: Record<string, unknown>; params: { username?: string }; user?: { id?: unknown } }, model: Record<string, unknown>) {
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
          const topicLink = model.topicLink as { topicId?: unknown; topic?: unknown; references?: unknown; referenceDate?: unknown; title?: unknown; title2?: unknown; content2?: unknown };
          let result = await db.Topic.findOne({ _id: topicLink.topicId });
          if (result) {
            topicLink.topic = result;
            topicLink.references = result.references;
            topicLink.referenceDate = result.referenceDate;
            topicLink.title2 = topicLink.title ? topicLink.title : result.title;
            topicLink.content2 = result.content;
            appendEntryExtras(result);
            appendEntryExtras(model.topicLink as Record<string, unknown>);
          }
        }
      },
    });
  }
}

async function setTopicModels(req?: any, model?: any) {
  let query: any = { _id: model.argument ? model.argument.ownerId : req.query.topic ? req.query.topic : null };
  if (!query._id && req.query.friendlyUrl) {
    delete query._id;
    query.friendlyUrl = req.query.friendlyUrl;
  }
  if (query._id || query.friendlyUrl) {
    await async.series({
      topic: async function() {
        let result = await db.Topic.findOne(query);
        if (!result) {
          return;
        }
        model.topic = result;
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
          results.forEach(function(result?: any) {
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.topicChildren = results;
        }
      },
      topicSiblings: async function() {
        if (model.topic) {
          query = {
            parentId: model.topic.parentId,
            _id: { $ne: model.topic._id },
            private: model.topic.private,
            groupId: model.topic.groupId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          };
          if (!model.topic.parentId && model.topic.private) {
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
          results.forEach(function(result?: any) {
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.topicSiblings = results;
        }
      },
      parentTopic: async function() {
        if (model.topic && model.topic.parentId) {
          let result = await db.Topic.findOne({ _id: model.topic.parentId }).exec();
          if (result) {
            appendEntryExtras(result);
            model.parentTopic = result;
          }
        }
      },
      parentSiblings: async function() {
        if (model.parentTopic) {
          query = {
            parentId: model.parentTopic.parentId,
            _id: { $ne: model.parentTopic._id },
            private: model.parentTopic.private,
            groupId: model.parentTopic.groupId,
            'screening.status': constants.SCREENING_STATUS.status1.code,
          };
          if (!model.parentTopic.parentId && model.parentTopic.private) {
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
          results.forEach(function(result?: any) {
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, req);
          });
          model.parentSiblings = results;
        }
      },
      grandParentTopic: async function() {
        if (model.parentTopic && model.parentTopic.parentId) {
          let result = await db.Topic.findOne({ _id: model.parentTopic.parentId });
          if (result) {
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
async function setEntryModels(query?: any, req?: any, model?: any) {
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

type ClipboardMap = Record<string, string[]>;

function setupClipboard(req?: { session?: { clipboard?: ClipboardMap } }, type?: number): ClipboardMap {
  let clipboard = req?.session?.clipboard;
  if (!clipboard) {
    clipboard = {} as ClipboardMap;
    clipboard['object' + constants.OBJECT_TYPES.topic] = [];
    clipboard['object' + constants.OBJECT_TYPES.argument] = [];
  }
  if (!clipboard['object' + type]) {
    clipboard['object' + type] = [];
  }
  return clipboard;
}

function getClipboard(req?: { session?: { clipboard?: ClipboardMap } }): ClipboardMap | undefined {
  const clipboard = req?.session?.clipboard;
  if (clipboard && !clipboard['object' + constants.OBJECT_TYPES.artifact]) {
    clipboard['object' + constants.OBJECT_TYPES.artifact] = [];
  }
  return clipboard;
}

function setClipboardModel(req?: { session?: { clipboard?: ClipboardMap } }, model?: { clipboard?: { marked?: boolean; count?: number; canPaste?: boolean; visible?: boolean }; entry?: unknown } & Record<string, unknown>, entryType?: number) {
  if (!model) return;
  model.clipboard = {};
  const clipboard = getClipboard(req);
  if (clipboard) {
    let marked = false;
    let count = 0;
    for (const key in clipboard) {
      if (Object.prototype.hasOwnProperty.call(clipboard, key)) {
        const items = clipboard[key];
        if (!items) continue;
        const keyType = parseInt(key.substring('object'.length - 1));
        const keyEntry = getEntryByObjectType(model as { topic?: unknown; topicLink?: unknown; argument?: unknown; argumentLink?: unknown; artifact?: unknown; question?: unknown; answer?: unknown; issue?: unknown; opinion?: unknown }, keyType);
        if (entryType === keyType && keyEntry && items.indexOf((keyEntry as { _id: { toString(): string } })._id.toString()) > -1) {
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

async function getTopics(query: Record<string, unknown>, options?: { limit?: number; shortTitleLength?: number; req?: { user?: { id?: unknown } } }) {
  type TopicDoc = EntryExtras & { _id: { equals(id: unknown): boolean }; parentId?: unknown; parentTopic?: unknown; link?: unknown };
  type TopicLinkDoc = { topicId: { equals(id: unknown): boolean } };
  let children: TopicDoc[] = [], topicLinks: TopicDoc[] = [];
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
      results.forEach(function(result: EntryExtras) {
        appendEntryExtras(result, constants.OBJECT_TYPES.topic, options?.req, options?.shortTitleLength);
      });
      children = results as TopicDoc[];
    },
    links: async function() {
      if ((options?.limit ?? 0) > 0 && options?.limit === children.length) return;

      let newLimit = (options?.limit ?? 0) > 0 ? (options!.limit as number) - children.length : options?.limit;
      let links = await db.TopicLink
        .find(query)
        .limit(newLimit)
        .lean();

      if (links.length > 0) {
        const ids = links.map(function(link: TopicLinkDoc) {
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
          const parentIds = (results as TopicDoc[]).filter(function(result: TopicDoc) {
            return !!result.parentId;
          }).map(function(result: TopicDoc) {
            return result.parentId;
          });
          query = { _id: { $in: parentIds } };
          // query the parents of the actual topics
          let linkParents = await db.Topic
            .find(query)
            .lean();
          await setEditorsUsername(results);
          (results as TopicDoc[]).forEach(function(result: TopicDoc) {
            appendEntryExtras(result, constants.OBJECT_TYPES.topic, options?.req, options?.shortTitleLength);
            const link = (links as TopicLinkDoc[]).find(function(link: TopicLinkDoc) {
              return link.topicId.equals(result._id);
            });
            if (link) {
              const linkParent = (linkParents as TopicDoc[]).find(function(linkParent: TopicDoc) {
                return linkParent._id.equals(result.parentId);
              });
              if (linkParent) {
                (appendListExtras as (...args: unknown[]) => void)(linkParent, constants.OBJECT_TYPES.topic, options?.req, options?.shortTitleLength);
              }
              (appendListExtras as (...args: unknown[]) => void)(link, constants.OBJECT_TYPES.topicLink, options?.req, options?.shortTitleLength);
              result.parentTopic = linkParent;
              result.link = link;
            }
          });
        }
        topicLinks = results as TopicDoc[];
      }
    },
  });
  return children.concat(topicLinks).sort(utils.titleCompare);
}

async function getArguments(query: Record<string, unknown>, options?: { limit?: number; shortTitleLength?: number; req?: { user?: { id?: unknown } } }) {
  type ArgDoc = EntryExtras & { _id: { equals(id: unknown): boolean }; parentId?: unknown; ownerId?: unknown; ownerType?: number; parentArgument?: unknown; parentTopic?: unknown; link?: unknown; against?: unknown };
  type ArgLinkDoc = { argumentId: { equals(id: unknown): boolean }; against?: unknown };
  type TopicDoc = { _id: { equals(id: unknown): boolean } };
  let children: ArgDoc[] = [], argumentLinks: ArgDoc[] = [];
  if (!options) options = {};
  await async.series({
    children: async function() {
      let results = await db.Argument
        .find(query)
        .limit(options!.limit)
        .sort({ title: 1 })
        .lean();
      await setEditorsUsername(results);
      results.forEach(function(result: EntryExtras) {
        appendEntryExtras(result, constants.OBJECT_TYPES.argument, options?.req, options?.shortTitleLength);
        //result.against = false;
      });
      children = results as ArgDoc[];
    },
    links: async function() {
      if ((options?.limit ?? 0) > 0 && options?.limit === children.length) return;
      const newLimit = (options?.limit ?? 0) > 0 ? (options!.limit as number) - children.length : options?.limit;
      let links = await db.ArgumentLink
        .find(query)
        .limit(newLimit)
        .lean();

      if (links.length > 0) {
        const ids = links.map(function(link: ArgLinkDoc) {
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
              const topicIds = (results as ArgDoc[])
                .filter((result: ArgDoc) => !result.parentId && result.ownerId)
                .map((result: ArgDoc) => result.ownerId);
              // get the topics of actual arguments
              return await db.Topic
                .find({ _id: { $in: topicIds } })
                .lean();
            },
            parentArguments: async () => {
              const parentIds = (results as ArgDoc[])
                .filter((result: ArgDoc) => !!result.parentId)
                .map((result: ArgDoc) => result.parentId);
              query = { _id: { $in: parentIds } };
              return await db.Argument
                .find(query)
                .lean();
            },
          });
          await setEditorsUsername(results);
          (results as ArgDoc[]).forEach((result: ArgDoc) => {
            appendEntryExtras(
              result,
              constants.OBJECT_TYPES.argument,
              options?.req,
              options?.shortTitleLength
            );
            const link = (links as ArgLinkDoc[]).find((link: ArgLinkDoc) => link.argumentId.equals(result._id));
            if (link) {
              if (result.parentId) {
                const parentArgument = ((linkParents as { parentArguments: ArgDoc[] }).parentArguments).find((linkParent: ArgDoc) =>
                  linkParent._id.equals(result.parentId)
                );
                if (parentArgument) {
                  appendListExtras(parentArgument);
                }
                result.parentArgument = parentArgument;
              } else if (result.ownerType === constants.OBJECT_TYPES.topic && result.ownerId) {
                const linkParent = ((linkParents as { parentTopics: TopicDoc[] }).parentTopics).find((linkParent: TopicDoc) =>
                  linkParent._id.equals(result.ownerId)
                );
                if (linkParent) {
                  (appendListExtras as (...args: unknown[]) => void)(
                    linkParent,
                    constants.OBJECT_TYPES.argument,
                    options?.req,
                    options?.shortTitleLength
                  );
                }
                result.parentTopic = linkParent;
              }
              appendEntryExtras(
                link,
                constants.OBJECT_TYPES.argumentLink,
                options?.req,
                options?.shortTitleLength
              );
              result.link = link;
              result.against = link.against;
            }
          });
        }
        argumentLinks = results as ArgDoc[];
      }
    },
  });
  return children.concat(argumentLinks).sort(utils.titleCompare);
}

async function getTopQuestions(query: Record<string, unknown>, model: Record<string, unknown>, req: { user?: { id?: unknown } }) {
  let results = await db.Question
    .find(query)
    .limit(15)
    .lean();
  await setEditorsUsername(results);
  results.forEach((result: EntryExtras) => {
    appendEntryExtras(result, constants.OBJECT_TYPES.question, req);
  });
  model.questions = results;
}

async function getTopArtifacts(query: Record<string, unknown>, model: Record<string, unknown>, req: { user?: { id?: unknown }; params?: { username?: string } }) {
  let results = await db.Artifact
    .find(query)
    .limit(15)
    //.lean()
    .sort({ title: 1 });
  await setEditorsUsername(results);
  results.forEach((result: EntryExtras & { setThumbnailPath: (u?: string) => void }) => {
    result.setThumbnailPath(req.params?.username);
    appendEntryExtras(result, constants.OBJECT_TYPES.artifact, req);
  });
  model.artifacts = results;
}

async function getTopIssues(query: Record<string, unknown>, model: Record<string, unknown>, req: { user?: { id?: unknown } }) {
  let results = await db.Issue
    .find(query)
    .limit(15)
    .lean()
    .sort({ title: 1 });
  await setEditorsUsername(results);
  results.forEach((result: EntryExtras & { issueType?: unknown }) => {
    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
    appendEntryExtras(result, constants.OBJECT_TYPES.issue, req);
  });
  model.issues = results;
}

async function getTopOpinions(query: Record<string, unknown>, model: Record<string, unknown>, req: { user?: { id?: unknown } }) {
  let results = await db.Opinion
    .find(query)
    .limit(15)
    .sort({ title: 1 })
    .lean();
  await setEditorsUsername(results);
  results.forEach((result: EntryExtras) => {
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
function applySessionToQuery(query?: { session?: (s: unknown) => unknown } | unknown, session?: unknown) {
  if (session && query && typeof (query as { session?: unknown }).session === 'function') {
    return (query as { session: (s: unknown) => unknown }).session(session);
  }
  return query;
}

async function countDocumentsWithSession(dbModel?: { countDocuments: (q: unknown) => unknown }, query?: unknown, session?: unknown): Promise<number> {
  return await applySessionToQuery(dbModel?.countDocuments(query), session) as Promise<number> as unknown as number;
}

async function updateOneWithSession(dbModel?: { updateOne: (f: unknown, u: unknown) => unknown }, filter?: unknown, update?: unknown, session?: unknown) {
  return await applySessionToQuery(dbModel?.updateOne(filter, update), session);
}

function normalizeUpdateChildrenCountArgs(specificEntryType?: unknown, callbackOrOptions?: unknown, maybeOptions?: unknown) {
  let normalizedSpecificEntryType: unknown = specificEntryType;
  let callback: ((...args: unknown[]) => unknown) | null = null;
  let options: Record<string, unknown> = {};

  if (typeof normalizedSpecificEntryType === 'function') {
    callback = normalizedSpecificEntryType as (...args: unknown[]) => unknown;
    normalizedSpecificEntryType = null;
  } else if (normalizedSpecificEntryType && typeof normalizedSpecificEntryType === 'object') {
    options = normalizedSpecificEntryType as Record<string, unknown>;
    normalizedSpecificEntryType = null;
  }

  if (typeof callbackOrOptions === 'function') {
    callback = callbackOrOptions as (...args: unknown[]) => unknown;
  } else if (callbackOrOptions && typeof callbackOrOptions === 'object') {
    options = callbackOrOptions as Record<string, unknown>;
  }

  if (typeof maybeOptions === 'function') {
    callback = maybeOptions as (...args: unknown[]) => unknown;
  } else if (maybeOptions && typeof maybeOptions === 'object') {
    options = maybeOptions as Record<string, unknown>;
  }

  return {
    specificEntryType: normalizedSpecificEntryType,
    callback,
    options,
  };
}

function getDbConnectionForObjectType(entryType?: number) {
  const dbModel = getDbModelByObjectType(entryType);
  return dbModel && dbModel.db ? dbModel.db : null;
}

async function updateChildrenCount(entryId?: any, entryType?: any, specificEntryType?: any, callbackOrOptions?: any, maybeOptions?: any) {
  const normalizedArgs = normalizeUpdateChildrenCountArgs(specificEntryType, callbackOrOptions, maybeOptions);
  specificEntryType = normalizedArgs.specificEntryType;
  const callback = normalizedArgs.callback;
  const session = normalizedArgs.options && normalizedArgs.options.session ? normalizedArgs.options.session : null;

  let countNode: any = {};
  let model: any = {}, req: any = {};

  const updateTopics = async function() {
    if (!specificEntryType || specificEntryType === constants.OBJECT_TYPES.topic) {
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
      const args = countNode.childrenCount['arguments'];
      const q = {
        ownerId: model.argument ? model.argument.ownerId : entryId,
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
      const artifacts = countNode.childrenCount.artifacts;
      const q = {
        ownerId: model.artifact ? model.artifact.ownerId : entryId,
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
        countNode = { childrenCount: model.topic.childrenCount };
        await async.parallel({
          topics: updateTopics,
          arguments: updateArguments,
          artifacts: updateArtifacts,
          questions: updateQuestions,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Topic, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.topicLink:
        req = { query: { topicLink: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.topicLink.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.TopicLink, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.argument:
        req = { query: { argument: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.argument.childrenCount };
        await async.parallel({
          arguments: updateArguments,
          questions: updateQuestions,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Argument, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.argumentLink:
        req = { query: { argumentLink: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.argumentLink.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.ArgumentLink, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.artifact:
        req = { query: { artifact: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.artifact.childrenCount };
        await async.parallel({
          artifacts: updateArtifacts,
          arguments: updateArguments,
          questions: updateQuestions,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Artifact, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.question:
        req = { query: { question: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.question.childrenCount };
        await async.parallel({
          answers: updateAnswers,
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Question, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.answer:
        req = { query: { answer: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.answer.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Answer, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.issue:
        req = { query: { issue: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.issue.childrenCount };
        await async.parallel({
          opinions: updateOpinions,
        });
        assertChildrenCountInvariants(countNode.childrenCount, { entryId, entryType });
        await updateOneWithSession(db.Issue, { _id: entryId }, { $set: countNode }, session);
        break;

      case constants.OBJECT_TYPES.opinion:
        req = { query: { opinion: entryId } };
        await setEntryModels(createOwnerQueryFromQuery(req), req, model);
        countNode = { childrenCount: model.opinion.childrenCount };
        await async.parallel({
          issues: updateIssues,
          opinions: updateOpinions,
        });
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

async function updateChildrenCountBatch(tasks?: any, options?: any) {
  const normalizedTasks = normalizeChildrenCountUpdateTasks(tasks);
  if (normalizedTasks.length === 0) {
    return {
      processed: 0,
      unique: 0,
      skipped: Array.isArray(tasks) ? tasks.length : 0,
      transactional: false,
    };
  }

  const runBatch = async function(session?: any) {
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
async function syncChildren(parent?: any, options?: any) {
  const syncChildTopics = async () => {
    const children = await db.Topic.find({ parentId: parent._id });
    if (children.length === 0) return;
    await async.each(children, async (child: any) => {
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
    await async.each(children, async (child: any) => {
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
    await async.each(children, async function(child?: any) {
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
    await async.each(children, async function(child?: any) {
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
    await async.each(children, async function(child?: any) {
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
    await async.each(children, async function(child?: any) {
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

  const syncOwnerChildren = async function(childrenEntryType?: any) {
    const dbModel = getDbModelByObjectType(childrenEntryType);
    const children = await dbModel.find({ ownerId: parent._id, ownerType: options.entryType });
    if (children.length === 0) return;
    await async.each(children, async function(child?: any) {
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
async function syncCategoryId(entry?: any, options?: any) {
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

type VerdictResult = {
  verdict?: {
    status?: number;
    true?: boolean;
    false?: boolean;
    pending?: boolean;
    category?: number;
    label?: string;
    theme?: string;
    icon?: string;
  };
  typeId?: number;
  typeUX?: unknown;
  title?: string;
};

function setVerdictModel(result?: VerdictResult) {
  if (!result) return;
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

function sortArguments(results?: VerdictResult[]) {
  results?.sort(function(a: VerdictResult, b: VerdictResult) {
    if (a.typeId === constants.ARGUMENT_TYPES.artifact && b.typeId !== constants.ARGUMENT_TYPES.artifact) {
      return 1;
    }
    if (a.typeId !== constants.ARGUMENT_TYPES.artifact && b.typeId === constants.ARGUMENT_TYPES.artifact) {
      return -1;
    }
    if ((a.verdict?.category ?? 0) > (b.verdict?.category ?? 0)) {
      return -1;
    }
    if ((a.verdict?.category ?? 0) < (b.verdict?.category ?? 0)) {
      return 1;
    }
    if ((a.title ?? '') > (b.title ?? '')) {
      return 1;
    }
    if ((a.title ?? '') < (b.title ?? '')) {
      return -1;
    }
    return 0;
  });
}

function getVerdictCount(args?: VerdictResult[]) {
  const verdictCount: { true?: number; false?: number; pending?: number } = {
    true: 0,
    false: 0,
    pending: 0,
  };
  args?.forEach(function(arg: VerdictResult) {
    const varg = arg.verdict && arg.verdict.status ? arg.verdict.status : constants.VERDICT_STATUS.pending;
    const category = constants.VERDICT_STATUS.getCategory(varg);
    switch (category) {
      case constants.VERDICT_STATUS.categories.true:
        verdictCount.true = (verdictCount.true ?? 0) + 1;
        break;
      case constants.VERDICT_STATUS.categories.false:
        verdictCount.false = (verdictCount.false ?? 0) + 1;
        break;
      case constants.VERDICT_STATUS.categories.pending:
        verdictCount.pending = (verdictCount.pending ?? 0) + 1;
        break;
    }
  });
  if (verdictCount.true === 0) {
    delete verdictCount.true;
  }
  if (verdictCount.false === 0) {
    delete verdictCount.false;
  }
  if (verdictCount.pending === 0) {
    delete verdictCount.pending;
  }
  return verdictCount;
}

function ensureEntryIdParam(req?: { query?: Record<string, unknown>; params?: { id?: unknown; friendlyUrl?: string } }, entry?: string) {
  if (!req?.query || !entry) return;
  if (!req.query[entry]) {
    if (req.params?.id) {
      req.query[entry] = req.params.id;
    } else {
      const friendlyId = req.params?.friendlyUrl;
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

function createOwnerQueryFromQuery(req?: { query?: Record<string, unknown> }): { ownerType?: number; ownerId?: unknown } {
  const q = req?.query;
  if (!q) return {};
  if (q.opinion) {
    return {
      ownerType: constants.OBJECT_TYPES.opinion,
      ownerId: q.opinion,
    };
  } else if (q.issue) {
    return {
      ownerType: constants.OBJECT_TYPES.issue,
      ownerId: q.issue,
    };
  } else if (q.answer) {
    return {
      ownerType: constants.OBJECT_TYPES.answer,
      ownerId: q.answer,
    };
  } else if (q.question) {
    return {
      ownerType: constants.OBJECT_TYPES.question,
      ownerId: q.question,
    };
  } else if (q.artifact) {
    return {
      ownerType: constants.OBJECT_TYPES.artifact,
      ownerId: q.artifact,
    };
  } else if (q.argumentLink) {
    return {
      ownerType: constants.OBJECT_TYPES.argumentLink,
      ownerId: q.argumentLink,
    };
  } else if (q.argument) {
    return {
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: q.argument,
    };
  } else if (q.topicLink) {
    return {
      ownerType: constants.OBJECT_TYPES.topicLink,
      ownerId: q.topicLink,
    };
  } else if (q.topic) {
    return {
      ownerType: constants.OBJECT_TYPES.topic,
      ownerId: q.topic,
    };
  }
  return {};
}

type TaggedEntry = {
  tags?: number[];
  ethicalStatus?: { hasValue?: boolean };
  typeId?: number;
  topic?: { tags?: number[]; ethicalStatus?: { hasValue?: boolean } };
  ownerType?: number;
  issueType?: unknown;
};
type ModelOwnerEntryShape = Record<string, unknown> & {
  opinion?: TaggedEntry;
  parentOpinion?: TaggedEntry;
  issue?: TaggedEntry;
  answer?: TaggedEntry;
  question?: TaggedEntry;
  artifact?: TaggedEntry;
  argumentLink?: TaggedEntry;
  argument?: TaggedEntry;
  topicLink?: TaggedEntry;
  topic?: TaggedEntry;
};

function setModelOwnerEntry(req: { params?: { username?: string }; user?: { username?: string; id?: unknown }; body?: { username?: string }; session?: { clipboard?: ClipboardMap } }, res: { locals?: { group?: { _id?: unknown; title?: unknown } } }, model: ModelOwnerEntryShape, options?: { hideClipboard?: boolean }) {
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
      if (model.argument.ethicalStatus?.hasValue) {
        tagLabels.push(constants.ARGUMENT_TAGS.tag10);
        model.hasValue = true;
      }
      tags.forEach(function(tag: number) {
        tagLabels.push(constants.ARGUMENT_TAGS['tag' + tag]);
        if (!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
          model.hasValue = true;
        }
      });
      model.tagLabels = tagLabels;
    }
    if (!model.hasValue && (model.argument.ethicalStatus?.hasValue || model.argument.typeId === constants.ARGUMENT_TYPES.ethical)) {
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
    const topicLinkTags = model.topicLink.topic?.tags;
    if (topicLinkTags && topicLinkTags.length > 0) {
      const topicLinkTagLabels = [];
      if (model.topicLink.topic?.ethicalStatus?.hasValue) {
        topicLinkTagLabels.push(constants.TOPIC_TAGS.tag10);
        model.hasValue = true;
      }
      topicLinkTags.forEach(function(tag: number) {
        topicLinkTagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
        if (tag === constants.TOPIC_TAGS.tag520.code) {
          model.mainTopic = true;
        }
        if (!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
          model.hasValue = true;
        }
      });
      model.tagLabels = topicLinkTagLabels;
    } else if (model.topicLink.topic?.ethicalStatus?.hasValue) {
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
      if (model.topic.ethicalStatus?.hasValue) {
        topicTagLabels.push(constants.TOPIC_TAGS.tag10);
        model.hasValue = true;
      }
      topicTags.forEach(function(tag: number) {
        topicTagLabels.push(constants.TOPIC_TAGS['tag' + tag]);
        if (tag === constants.TOPIC_TAGS.tag520.code) {
          model.mainTopic = true;
        }
        if (!model.hasValue && tag === constants.ARGUMENT_TAGS.tag10.code) {
          model.hasValue = true;
        }
      });
      model.tagLabels = topicTagLabels;
    } else if (model.topic.ethicalStatus?.hasValue) {
      model.hasValue = true;
    }
  }

  setModelContext(req, res, model);
}

function getDbModelByObjectType(type?: number) {
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

function getEntryByObjectType(model?: { topic?: unknown; topicLink?: unknown; argument?: unknown; argumentLink?: unknown; artifact?: unknown; question?: unknown; answer?: unknown; issue?: unknown; opinion?: unknown }, type?: number) {
  switch (type) {
    case constants.OBJECT_TYPES.topic:
      return model?.topic;
    case constants.OBJECT_TYPES.topicLink:
      return model?.topicLink;
    case constants.OBJECT_TYPES.argument:
      return model?.argument;
    case constants.OBJECT_TYPES.argumentLink:
      return model?.argumentLink;
    case constants.OBJECT_TYPES.artifact:
      return model?.artifact;
    case constants.OBJECT_TYPES.question:
      return model?.question;
    case constants.OBJECT_TYPES.answer:
      return model?.answer;
    case constants.OBJECT_TYPES.issue:
      return model?.issue;
    case constants.OBJECT_TYPES.opinion:
      return model?.opinion;
  }
  return null;
}

function getObjectName(type?: number): string {
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

type EntryRef = { _id?: unknown };
type OwnerSourceModel = {
  issue?: EntryRef;
  opinion?: EntryRef;
  question?: EntryRef;
  artifact?: EntryRef;
  argumentLink?: EntryRef;
  argument?: EntryRef;
  topicLink?: EntryRef;
  topic?: EntryRef;
};

function createOwnerQueryFromModel(model?: OwnerSourceModel): { ownerType?: number; ownerId?: unknown } {
  if (model?.issue) {
    return {
      ownerType: constants.OBJECT_TYPES.issue,
      ownerId: model.issue._id,
    };
  } else if (model?.opinion) {
    return {
      ownerType: constants.OBJECT_TYPES.opinion,
      ownerId: model.opinion._id,
    };
  } else if (model?.question) {
    return {
      ownerType: constants.OBJECT_TYPES.question,
      ownerId: model.question._id,
    };
  } else if (model?.artifact) {
    return {
      ownerType: constants.OBJECT_TYPES.artifact,
      ownerId: model.artifact._id,
    };
  } else if (model?.argumentLink) {
    return {
      ownerType: constants.OBJECT_TYPES.argumentLink,
      ownerId: model.argumentLink._id,
    };
  } else if (model?.argument) {
    return {
      ownerType: constants.OBJECT_TYPES.argument,
      ownerId: model.argument._id,
    };
  } else if (model?.topicLink) {
    return {
      ownerType: constants.OBJECT_TYPES.topicLink,
      ownerId: model.topicLink._id,
    };
  } else if (model?.topic) {
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
function setModelContext(req: { params?: { username?: string }; user?: { username?: string } }, res: { locals?: { group?: { _id?: unknown; title?: unknown } } }, model: Record<string, unknown> & { group?: unknown; wikiBaseUrl?: string; username?: string; profileBaseUrl?: string; entry?: { private?: boolean } }, mixedMode?: boolean) {
  if (res.locals?.group) {
    model.group = res.locals.group;
    model.wikiBaseUrl = buildGroupUrl(res.locals.group) + paths.groups.group.posts;
  } else if (req.params?.username || (mixedMode && req.user && req.user.username) || (model.entry && model.entry.private)) {
    model.username = req.params?.username || req.user?.username;
    model.profileBaseUrl = paths.members.index + '/' + model.username;
    model.wikiBaseUrl = model.profileBaseUrl + (paths.members.profile.journal || paths.members.profile.diary);
  } else {
    model.username = '';
    model.profileBaseUrl = '';
    model.wikiBaseUrl = '';
  }
}

function getEditorContent(content?: string): string {
  if (!content) return '';
  const { sanitizeContent } = require('./sanitizeHtml');
  let c = sanitizeContent(content.trim());
  if (c === '<p><br></p>') {
    c = '';
  }
  return c;
}

function buildEntryUrl(baseUrl?: string, entry?: { friendlyUrl?: unknown; _id?: unknown }): string {
  return baseUrl + '/' + entry?.friendlyUrl + '/' + entry?._id;
}

function getDiaryBaseUrl(username?: string): string {
  return paths.members.index + '/' + username + (paths.members.profile.journal || paths.members.profile.diary);
}

function buildReturnUrl(req?: { originalUrl?: string }, defaultBaseUrl?: string): string {
  const nextUrl = url.parse(req?.originalUrl);
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

function buildTopicReturnUrl(model?: { username?: unknown; group?: unknown; wikiBaseUrl?: string }, cancelBaseUrl?: string, entry?: { friendlyUrl?: unknown; _id?: unknown }, parent?: { friendlyUrl?: unknown; _id?: unknown }): string {
  return entry ? buildEntryUrl(cancelBaseUrl, entry) :
    parent ? buildEntryUrl(cancelBaseUrl, parent) :
      (model?.username || model?.group) ? (model.wikiBaseUrl || '') : '/';
}

type ParentUrlEntry = {
  private?: boolean;
  ownerType?: number;
  ownerId?: unknown;
  parentId?: unknown;
  questionId?: unknown;
  getType: () => number;
};

function buildParentUrl(req: { user?: { username?: string } }, entry: ParentUrlEntry) {
  const getBaseUrl = function(entry: ParentUrlEntry) {
    return entry.private ? paths.members.index + '/' + req.user?.username + (paths.members.profile.journal || paths.members.profile.diary) : '';
  };
  const buildRedirectUrl = function(entry: ParentUrlEntry) {
    const wikiBaseUrl = getBaseUrl(entry);
    switch (entry.ownerType) {
      case constants.OBJECT_TYPES.topicLink:
        return wikiBaseUrl + '/topic/link/' + entry.ownerId;
      case constants.OBJECT_TYPES.argumentLink:
        return wikiBaseUrl + '/argument/link/' + entry.ownerId;
      default:
        return wikiBaseUrl + '/' + constants.OBJECT_ID_NAME_MAP[entry.ownerType as number] + '/' + entry.ownerId;
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

function buildEntryReturnUrl(req: { query?: { argument?: unknown } }, model: { wikiBaseUrl?: string; entry?: { title?: string; _id?: unknown; topic?: { title?: string }; argument?: { title?: string } }; entryType?: number; ownerType?: number }) {
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
      return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(entryTitle) + '/' + (req.query?.argument || entryId);
    case constants.OBJECT_TYPES.argumentLink:
      if (!entry.argument || !entry.argument.title) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki.arguments.entry + '/' + utils.urlify(entry.argument.title) + '/link/' + (req.query?.argument || entryId);
    default: {
      const ownerName = constants.OBJECT_NAMES_MAP[model.ownerType as number];
      if (!ownerName || !paths.wiki[ownerName] || !paths.wiki[ownerName].entry || !entryTitle || !entryId) {
        return fallbackBaseUrl;
      }
      return model.wikiBaseUrl + paths.wiki[ownerName].entry + '/' + utils.urlify(entryTitle) + '/' + entryId;
    }
  }
}

function setScreeningModel(req: { originalUrl?: string; query?: { screening?: string } }, model: Record<string, unknown> & { screening?: Record<string, unknown> }) {
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

  if (req.query?.screening) {
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

function initScreeningStatus(req: { user?: { roles?: { reviewer?: unknown } }; params?: { username?: string }; body?: { username?: string } }, entity: { screening?: unknown }) {
  if (req.user?.roles?.reviewer || req.params?.username || req.body?.username) { /* req.body.username is used by clipboard */
    entity.screening = {
      status: constants.SCREENING_STATUS.status1.code,
      history: [],
    };
  }
}

function setScreeningModelCount(model: { childrenCount?: { pending?: number; rejected?: number; archived?: number }; screening?: { hidden?: boolean } }, childrenCount: { pending?: number; rejected?: number; archived?: number }) {
  model.childrenCount = childrenCount;
  if (model.childrenCount?.pending === 0 && model.childrenCount?.rejected === 0) {
    if (model.screening) model.screening.hidden = true;
  } else if (model.childrenCount) {
    model.childrenCount.archived = utils.randomInt(1, 9);
  }
}

function getParent(entity: { parentId?: unknown; ownerId?: unknown; ownerType?: number; questionId?: unknown }, type: number) {
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

function setMemberFullname(member?: { username?: unknown; fullname?: unknown; roles?: { account?: { name?: { full?: unknown } } } }): void {
  if (member?.roles?.account) {
    const fullname = member.roles.account.name?.full;
    if (fullname && fullname !== member.username) {
      member.fullname = fullname;
    }
  }
}

function isEntryOnIntendedUrl(req?: { params?: { username?: unknown }; user?: { id?: unknown } }, res?: { locals?: { group?: unknown } }, entry?: { private?: boolean; createUserId?: { equals(id: unknown): boolean } }) {
  if (!entry) return false;
  return !entry.private && !req?.params?.username || !!entry.private && (!!res?.locals?.group || !!req?.params?.username && !!entry.createUserId?.equals(req.user?.id));
}

function createContentPreview(content?: string): string {
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

async function getCategories(model: Record<string, unknown>, topicId: unknown, req: { user?: { id?: unknown } }) {
  let results = await getTopics({
    parentId: topicId,
    private: false,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  }, {
    limit: 0,
    shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
    req: req,
  });
  await async.each(results, async function(result: EntryExtras & { _id?: unknown; subtopics?: unknown; subarguments?: unknown }) {
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
        req: req,
        shortTitleLength: constants.SETTINGS.TILE_MAX_SUB_ENTRY_LEN,
      });
      subArguments.forEach(function(subArgument: VerdictResult) {
        setVerdictModel(subArgument);
      });
      sortArguments(subArguments);
      result.subarguments = subArguments;
    }
  });
  model.categories = results;
}

async function getDiaryCategories(req: { user?: { id?: unknown } }) {
  let results = await db.Topic
    .find({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: req.user?.id })
    .sort({ title: 1 })
    .lean();
  await async.each(results, function(result: { friendlyUrl?: string; title?: string }) {
    result.friendlyUrl = utils.urlify(result.title);
  });
  return results;
}

async function getUserGroups(req?: { user?: { id?: unknown } }) {
  return await db.Group.find({ 'members.userId': req?.user?.id }).sort({ title: 1 }).lean();
}

function createEntrySet(model: Record<string, unknown> & { topics?: unknown[]; arguments?: unknown[]; questions?: unknown[]; answers?: unknown[]; issues?: unknown[]; opinions?: unknown[]; artifacts?: unknown[]; entrySet?: unknown }) {
  const entries = ([] as Array<{ editDate?: Date }>)
    .concat((model.topics || []) as Array<{ editDate?: Date }>)
    .concat((model.arguments || []) as Array<{ editDate?: Date }>)
    .concat((model.questions || []) as Array<{ editDate?: Date }>)
    .concat((model.answers || []) as Array<{ editDate?: Date }>)
    .concat((model.issues || []) as Array<{ editDate?: Date }>)
    .concat((model.opinions || []) as Array<{ editDate?: Date }>)
    .concat((model.artifacts || []) as Array<{ editDate?: Date }>)
    .sort(function(a: { editDate?: Date }, b: { editDate?: Date }) {
      if ((a.editDate ?? 0) < (b.editDate ?? 0)) {
        return 1;
      }
      if ((a.editDate ?? 0) > (b.editDate ?? 0)) {
        return -1;
      }
      return 0;
    });
  if (entries.length > 1) {
    const midIndex = Math.floor(entries.length / 2);
    const entrySet = [{ entries: entries.slice(0, midIndex - 1) }];
    entrySet.push({ entries: entries.slice(midIndex) });
    model.entrySet = entrySet;
  } else {
    model.entrySet = [{ entries: entries }];
  }
}

async function countEntries(model: Record<string, unknown>, groupFilter: Record<string, unknown>) {
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
  model.totalCount = (model.topics as number) + (model.arguments as number) + (model.questions as number) + (model.answers as number) + (model.issues as number) + (model.opinions as number);
}

function resetCache(req?: { app?: { locals?: { appCategories?: unknown } } }) {
  if (req?.app?.locals) delete req.app.locals.appCategories;
  const apps = applications.getApplications();
  apps.forEach(function(app?: { appCategories?: unknown }) {
    if (app) delete app.appCategories;
  });
}

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
