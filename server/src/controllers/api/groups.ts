'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const utils = require('../../utils/utils');
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'constants'... Remove this comment to see the full error message
const constants = require('../../models/constants');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get all groups (public and private based on user)
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      let results = await db.Group
        .find({})
        .sort({ title: 1 })
        .lean();
      
      // @ts-ignore TS(7006): Parameter 'result' implicitly has an 'any' type.
      results.forEach(function (result) {
        result.friendlyUrl = utils.urlify(result.title);
      });

      const model = {};
      
      if (req.user) {
        // @ts-ignore TS(2339): Property 'privateGroups' does not exist on type '{... Remove this comment to see the full error message
        model.privateGroups = results.filter(function (group) {
          return group.privacyType !== constants.GROUP_PRIVACY_TYPES.type10.code
            // @ts-ignore TS(7006): Parameter 'member' implicitly has an 'any' type.
            && group.members && group.members.some(function (member) {
              return String(member.userId || '') === String(req.user.id || req.user._id || '');
            });
        });
      }
      
      // @ts-ignore TS(2339): Property 'publicGroups' does not exist on type '{}... Remove this comment to see the full error message
      model.publicGroups = results.filter(function (group) {
        return group.privacyType === constants.GROUP_PRIVACY_TYPES.type10.code;
      });

      res.json(model);
    } catch (err) {
      console.error('Error fetching groups:', err);
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  // Get single group details
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id', async function (req, res) {
    try {
      const group = await db.Group
        .findById(req.params.id)
        .populate('members.userId', 'username email')
        .lean();

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      if (!canViewGroup(group, req.user)) {
        return res.status(403).json({ error: 'Group is private' });
      }

      group.friendlyUrl = utils.urlify(group.title);

      res.json({ group: group });
    } catch (err) {
      console.error('Error fetching group:', err);
      res.status(500).json({ error: 'Failed to fetch group' });
    }
  });

  // Get group posts across entity types
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id/stats', async function (req, res) {
    try {
      const group = await db.Group.findById(req.params.id).lean();
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      if (!canViewGroup(group, req.user)) {
        return res.status(403).json({ error: 'Group is private' });
      }

      const filter = buildGroupContentFilter(group, req.user);
      const totals = await countGroupContributions(group._id, filter);

      res.json({
        success: true,
        group: {
          _id: group._id,
          title: group.title,
          friendlyUrl: group.friendlyUrl || utils.urlify(group.title || ''),
          privacyType: group.privacyType,
        },
        totals: totals,
      });
    } catch (err) {
      console.error('Error fetching group contribution stats:', err);
      res.status(500).json({ error: 'Failed to fetch group contribution stats' });
    }
  });

  // Get group posts across entity types
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/entry/:id/posts', async function (req, res) {
    try {
      const group = await db.Group.findById(req.params.id).lean();
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      if (!canViewGroup(group, req.user)) {
        return res.status(403).json({ error: 'Group is private' });
      }

      const limit = Math.min(Math.max(Number(req.query?.limit || 25), 1), 100);
      const filter = buildGroupContentFilter(group, req.user);

      const [topics, argumentsList, questions, issues, opinions, artifacts, answers] = await Promise.all([
        db.Topic
          .find({
            ...filter,
            $or: [
              { groupId: group._id },
              { ownerType: constants.OBJECT_TYPES.group, ownerId: group._id },
            ],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
        db.Argument
          .find({
            ...filter,
            $or: [{ groupId: group._id }, { private: true, createUserId: group._id }],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
        db.Question
          .find({
            ...filter,
            $or: [{ groupId: group._id }, { private: true, createUserId: group._id }],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
        db.Issue
          .find({
            ...filter,
            $or: [{ groupId: group._id }, { private: true, createUserId: group._id }],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
        db.Opinion
          .find({
            ...filter,
            $or: [{ groupId: group._id }, { private: true, createUserId: group._id }],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
        db.Artifact
          .find({
            ...filter,
            $or: [{ groupId: group._id }, { private: true, createUserId: group._id }],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
        db.Answer
          .find({
            ...filter,
            $or: [{ groupId: group._id }, { private: true, createUserId: group._id }],
          })
          .sort({ editDate: -1 })
          .limit(limit)
          .lean(),
      ]);

      const mapFriendlyUrl = function (entry: any) {
        if (!entry) return entry;
        return {
          ...entry,
          friendlyUrl: entry.friendlyUrl || utils.urlify(entry.title || ''),
        };
      };

      res.json({
        success: true,
        group: {
          _id: group._id,
          title: group.title,
          friendlyUrl: group.friendlyUrl || utils.urlify(group.title || ''),
          privacyType: group.privacyType,
        },
        posts: {
          topics: topics.map(mapFriendlyUrl),
          arguments: argumentsList.map(mapFriendlyUrl),
          questions: questions.map(mapFriendlyUrl),
          issues: issues.map(mapFriendlyUrl),
          opinions: opinions.map(mapFriendlyUrl),
          artifacts: artifacts.map(mapFriendlyUrl),
          answers: answers.map(mapFriendlyUrl),
        },
        totals: {
          topics: topics.length,
          arguments: argumentsList.length,
          questions: questions.length,
          issues: issues.length,
          opinions: opinions.length,
          artifacts: artifacts.length,
          answers: answers.length,
        },
      });
    } catch (err) {
      console.error('Error fetching group posts:', err);
      res.status(500).json({ error: 'Failed to fetch group posts' });
    }
  });

  // Create group
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const title = String(req.body?.title || '').trim();
      const description = String(req.body?.description || '').trim();
      const privacyType = Number(req.body?.privacyType || constants.GROUP_PRIVACY_TYPES.type10.code);

      if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Title must be at least 3 characters' });
      }

      const now = new Date();
      const group = await db.Group.create({
        title: title,
        description: description,
        friendlyUrl: utils.urlify(title),
        privacyType: privacyType,
        createDate: now,
        editDate: now,
        createUserId: req.user._id,
        editUserId: req.user._id,
        members: [
          {
            userId: req.user._id,
            roleType: constants.GROUP_ROLE_TYPES.type20.code,
          },
        ],
      });

      res.status(201).json({
        success: true,
        group: {
          _id: group._id,
          title: group.title,
          description: group.description,
          friendlyUrl: group.friendlyUrl || utils.urlify(group.title),
          privacyType: group.privacyType,
          members: group.members,
          createDate: group.createDate,
          editDate: group.editDate,
        },
      });
    } catch (err) {
      console.error('Error creating group:', err);
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  // Update group
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/entry/:id', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const group = await db.Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      if (!isGroupManager(group, req.user)) {
        return res.status(403).json({ error: 'Not allowed to manage this group' });
      }

      if (typeof req.body?.title !== 'undefined') {
        const title = String(req.body.title || '').trim();
        if (!title || title.length < 3) {
          return res.status(400).json({ error: 'Title must be at least 3 characters' });
        }
        group.title = title;
        group.friendlyUrl = utils.urlify(title);
      }

      if (typeof req.body?.description !== 'undefined') {
        group.description = String(req.body.description || '').trim();
      }

      if (typeof req.body?.privacyType !== 'undefined') {
        group.privacyType = Number(req.body.privacyType || constants.GROUP_PRIVACY_TYPES.type10.code);
      }

      group.editDate = new Date();
      group.editUserId = req.user._id;
      await group.save();

      res.json({
        success: true,
        group: {
          _id: group._id,
          title: group.title,
          description: group.description,
          friendlyUrl: group.friendlyUrl || utils.urlify(group.title),
          privacyType: group.privacyType,
          members: group.members,
          createDate: group.createDate,
          editDate: group.editDate,
        },
      });
    } catch (err) {
      console.error('Error updating group:', err);
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  // Join group as member
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/entry/:id/members', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const group = await db.Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const userId = String(req.body?.userId || req.user._id);
      const exists = (group.members || []).some(function (member: any) {
        return String(member.userId || '') === userId;
      });
      if (!exists) {
        group.members.push({
          userId: userId,
          roleType: constants.GROUP_ROLE_TYPES.type10.code,
        });
        group.editDate = new Date();
        group.editUserId = req.user._id;
        await group.save();
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error joining group:', err);
      res.status(500).json({ error: 'Failed to join group' });
    }
  });

  // Leave/remove group member
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.delete('/entry/:id/members/:userId', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const group = await db.Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const targetUserId = String(req.params.userId || '');
      const currentUserId = String(req.user._id || req.user.id || '');
      const canManage = isGroupManager(group, req.user);
      const isSelf = targetUserId === currentUserId;
      if (!canManage && !isSelf) {
        return res.status(403).json({ error: 'Not allowed to remove this member' });
      }

      group.members = (group.members || []).filter(function (member: any) {
        return String(member.userId || '') !== targetUserId;
      });
      group.editDate = new Date();
      group.editUserId = req.user._id;
      await group.save();

      res.json({ success: true });
    } catch (err) {
      console.error('Error removing group member:', err);
      res.status(500).json({ error: 'Failed to remove group member' });
    }
  });
};

function isGroupManager(group: any, user: any) {
  if (!group || !user) {
    return false;
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return true;
  }

  const userId = String(user._id || user.id || '');
  if (String(group.createUserId || '') === userId) {
    return true;
  }

  return (group.members || []).some(function (member: any) {
    return resolveMemberUserId(member) === userId
      && Number(member.roleType || constants.GROUP_ROLE_TYPES.type10.code) === constants.GROUP_ROLE_TYPES.type20.code;
  });
}

function resolveUserId(user: any): string {
  return String(user?._id || user?.id || '');
}

function resolveMemberUserId(member: any): string {
  if (!member) {
    return '';
  }
  if (typeof member.userId === 'object' && member.userId !== null) {
    return String(member.userId._id || member.userId.id || '');
  }
  return String(member.userId || '');
}

function isGroupMember(group: any, user: any): boolean {
  const userId = resolveUserId(user);
  if (!userId || !group) {
    return false;
  }
  if (String(group.createUserId || '') === userId) {
    return true;
  }
  return (group.members || []).some(function (member: any) {
    return resolveMemberUserId(member) === userId;
  });
}

function canViewGroup(group: any, user: any): boolean {
  if (!group) {
    return false;
  }
  if (Number(group.privacyType || constants.GROUP_PRIVACY_TYPES.type10.code) === constants.GROUP_PRIVACY_TYPES.type10.code) {
    return true;
  }
  if (!user) {
    return false;
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return true;
  }
  return isGroupMember(group, user);
}

function buildGroupContentFilter(group: any, user: any): Record<string, unknown> {
  if (!user) {
    return { private: { $ne: true } };
  }
  if (user.canPlayRoleOf && user.canPlayRoleOf('admin')) {
    return {};
  }
  if (isGroupMember(group, user)) {
    return {};
  }
  return { private: { $ne: true } };
}

async function countGroupContributions(groupId: any, filter: Record<string, unknown>) {
  const groupOrPrivateOwnerQuery = {
    $or: [{ groupId: groupId }, { private: true, createUserId: groupId }],
  };
  const [topics, argumentsCount, questions, answers, artifacts, issues, opinions] = await Promise.all([
    db.Topic.countDocuments({
      ...filter,
      $or: [{ groupId: groupId }, { ownerType: constants.OBJECT_TYPES.group, ownerId: groupId }],
    }),
    db.Argument.countDocuments({
      ...filter,
      ...groupOrPrivateOwnerQuery,
    }),
    db.Question.countDocuments({
      ...filter,
      ...groupOrPrivateOwnerQuery,
    }),
    db.Answer.countDocuments({
      ...filter,
      ...groupOrPrivateOwnerQuery,
    }),
    db.Artifact.countDocuments({
      ...filter,
      ...groupOrPrivateOwnerQuery,
    }),
    db.Issue.countDocuments({
      ...filter,
      ...groupOrPrivateOwnerQuery,
    }),
    db.Opinion.countDocuments({
      ...filter,
      ...groupOrPrivateOwnerQuery,
    }),
  ]);

  return {
    topics,
    arguments: argumentsCount,
    questions,
    answers,
    artifacts,
    issues,
    opinions,
    contributions: topics + argumentsCount + questions + answers + artifacts + issues + opinions,
  };
}
