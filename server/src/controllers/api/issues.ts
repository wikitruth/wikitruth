'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'flowUtils'... Remove this comment to see the full error message
const flowUtils = require('../../utils/flowUtils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const issuesService = require('../../services/issuesService');
const { applyViewModeFilter } = require('./viewFilter');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;
const { logEntryEvent } = require('../../services/entryEventsService');
const { notifySubscribers } = require('../../services/notificationsService');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get issues list
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      await GET_issues(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get issue entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      await GET_issue_entry(req, res);
    } catch (error) {
      console.error('Error in GET /api/issues/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create issue entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      await POST_issue_create(req, res);
    } catch (error) {
      console.error('Error in POST /api/issues:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update issue entry
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/entry/:id', async function (req, res) {
    try {
      await PUT_issue_update(req, res);
    } catch (error) {
      console.error('Error in PUT /api/issues/entry/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_issues(req, res) {
  let model = {};
  flowUtils.setScreeningModel(req, model);
  
  const query = {
    ownerType: constants.OBJECT_TYPES.topic,
    private: false,
  };
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  applyViewModeFilter(req, query, model.screening.status);
  
  if (req.query.topic) {
    // @ts-ignore TS(2339): Property 'ownerId' does not exist on type '{ owner... Remove this comment to see the full error message
    query.ownerId = req.query.topic;
  }
  
  const results = await issuesService.getIssuesList(query, { limit: 50 });
  
  // @ts-ignore TS(2339): Property 'issues' does not exist on type '{}'.
  model.issues = results;
  
  // Remove screening model from response (it's server-side only)
  // @ts-ignore TS(2339): Property 'screening' does not exist on type '{}'.
  delete model.screening;
  
  res.json(model);
}

// @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
async function GET_issue_entry(req, res) {
  const issueId = String(req.params.id || '').trim();
  if (!issueId) {
    return res.status(400).json({ error: 'Issue id is required' });
  }

  const issue = await issuesService.getIssueEntry(issueId, req);
  
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const opinions = await db.Opinion.find({
    parentId: null,
    ownerType: constants.OBJECT_TYPES.issue,
    ownerId: issueId,
    private: false,
    'screening.status': constants.SCREENING_STATUS.status1.code,
  }).sort({ editDate: -1 }).limit(5).lean();

  await flowUtils.setEditorsUsername(opinions);
  opinions.forEach(function (result: any) {
    flowUtils.appendEntryExtras(result, constants.OBJECT_TYPES.opinion, req);
  });
  
  res.json({
    issue: issue,
    opinions: opinions,
  });
}

function canEditEntry(entry: any, user: any): boolean {
  if (!entry || !user) {
    return false;
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return true;
  }
  return String(entry.createUserId || '') === String(user._id || user.id || '');
}

async function POST_issue_create(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || req.body?.content || '').trim();
  const ownerId = req.body?.topicId || req.body?.ownerId || req.query?.topic || null;
  const issueType = Number(req.body?.issueType || constants.ISSUE_TYPES.type100.code);
  const isPrivate = Boolean(req.body?.private);

  if (!title || title.length < 3) {
    return res.status(400).json({ error: 'Title must be at least 3 characters' });
  }

  if (!description || description.length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  const now = new Date();
  const issue = await db.Issue.create({
    title: title,
    content: description,
    contentPreview: description.slice(0, 240),
    friendlyUrl: utils.urlify(title),
    issueType: issueType,
    ownerType: constants.OBJECT_TYPES.topic,
    ownerId: ownerId,
    categoryId: ownerId,
    createDate: now,
    editDate: now,
    createUserId: req.user._id,
    editUserId: req.user._id,
    screening: {
      status: constants.SCREENING_STATUS.status0.code,
    },
    private: isPrivate,
  });

  await logEntryEvent({
    eventType: 'issue.created',
    objectType: constants.OBJECT_TYPES.topic,
    objectName: 'topic',
    objectId: String(ownerId || issue._id),
    actorUserId: String(req.user._id),
    actorUsername: String(req.user.username || ''),
    message: `Issue reported (type ${issueType})`,
    payload: {
      issueId: String(issue._id),
      issueType,
      title,
    },
  });

  if (ownerId) {
    await notifySubscribers({
      target: {
        objectType: constants.OBJECT_TYPES.topic,
        objectName: 'topic',
        objectId: String(ownerId),
      },
      type: 'issue',
      trigger: 'issue',
      title: 'New issue reported',
      body: title,
      link: `/issues/entry/${encodeURIComponent(String(issue.friendlyUrl || issue._id))}/${encodeURIComponent(String(issue._id))}`,
      excludeUserIds: [String(req.user._id)],
      payload: {
        issueId: String(issue._id),
        issueType,
      },
    });
  }

  res.status(201).json({
    success: true,
    issue: {
      _id: issue._id,
      title: issue.title,
      friendlyUrl: issue.friendlyUrl || utils.urlify(issue.title),
      content: issue.content,
      issueType: issue.issueType,
      ownerId: issue.ownerId,
      private: issue.private,
      createDate: issue.createDate,
      editDate: issue.editDate,
    },
  });
}

async function PUT_issue_update(req: any, res: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const issue = await db.Issue.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  if (!canEditEntry(issue, req.user)) {
    return res.status(403).json({ error: 'Not allowed to edit this issue' });
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = String(req.body.title || '').trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    issue.title = title;
    issue.friendlyUrl = utils.urlify(title);
  }

  if (typeof req.body?.description !== 'undefined' || typeof req.body?.content !== 'undefined') {
    const content = String(req.body?.description || req.body?.content || '').trim();
    if (!content || content.length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }
    issue.content = content;
    issue.contentPreview = content.slice(0, 240);
  }

  if (typeof req.body?.private !== 'undefined') {
    issue.private = Boolean(req.body.private);
  }

  if (typeof req.body?.issueType !== 'undefined') {
    issue.issueType = Number(req.body.issueType || constants.ISSUE_TYPES.type100.code);
  }

  if (typeof req.body?.topicId !== 'undefined' || typeof req.body?.ownerId !== 'undefined') {
    issue.ownerId = req.body.topicId || req.body.ownerId || null;
    issue.categoryId = issue.ownerId;
  }

  issue.editDate = new Date();
  issue.editUserId = req.user._id;
  await issue.save();

  res.json({
    success: true,
    issue: {
      _id: issue._id,
      title: issue.title,
      friendlyUrl: issue.friendlyUrl || utils.urlify(issue.title),
      content: issue.content,
      issueType: issue.issueType,
      ownerId: issue.ownerId,
      private: issue.private,
      createDate: issue.createDate,
      editDate: issue.editDate,
    },
  });
}
