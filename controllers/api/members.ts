'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;
// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'utils'.
const utils = require('../../utils/utils');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {
  // Get all contributors (members with public profiles)
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/', async function (req, res) {
    try {
      const contributors = await db.User
        .find({ 'preferences.privateProfile': { $ne: true } })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ contributors });
    } catch (err) {
      console.error('Error fetching members:', err);
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  // Get screeners
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/screeners', async function (req, res) {
    try {
      const screeners = await db.User
        .find({ 
          'roles.screener': true, 
          'preferences.privateProfile': { $ne: true } 
        })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ screeners });
    } catch (err) {
      console.error('Error fetching screeners:', err);
      res.status(500).json({ error: 'Failed to fetch screeners' });
    }
  });

  // Get reviewers
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/reviewers', async function (req, res) {
    try {
      const reviewers = await db.User
        .find({ 
          'roles.reviewer': true, 
          'preferences.privateProfile': { $ne: true } 
        })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ reviewers });
    } catch (err) {
      console.error('Error fetching reviewers:', err);
      res.status(500).json({ error: 'Failed to fetch reviewers' });
    }
  });

  // Get administrators
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/administrators', async function (req, res) {
    try {
      const administrators = await db.User
        .find({ 
          'roles.admin': { $exists: true }, 
          'preferences.privateProfile': { $ne: true } 
        })
        .select('username name email roles preferences')
        .sort({ name: 1 })
        .lean();

      res.json({ administrators });
    } catch (err) {
      console.error('Error fetching administrators:', err);
      res.status(500).json({ error: 'Failed to fetch administrators' });
    }
  });

  // Get current member profile
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/me', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const member = await db.User
        .findById(req.user._id || req.user.id)
        .select('username email roles preferences createdDate')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      res.json({ member: member });
    } catch (err) {
      console.error('Error fetching current member:', err);
      res.status(500).json({ error: 'Failed to fetch member profile' });
    }
  });

  // Update current member profile preferences
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/me/preferences', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const privateProfile = Boolean(req.body?.privateProfile);
      const user = await db.User.findById(req.user._id || req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Member not found' });
      }

      user.preferences = {
        ...(user.preferences || {}),
        privateProfile: privateProfile,
      };
      await user.save();

      res.json({
        success: true,
        member: {
          _id: user._id,
          username: user.username,
          email: user.email,
          preferences: user.preferences,
        },
      });
    } catch (err) {
      console.error('Error updating member preferences:', err);
      res.status(500).json({ error: 'Failed to update member preferences' });
    }
  });

  // Get member custom pages
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/pages', async function (req, res) {
    try {
      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const pages = await db.Page
        .find({ createUserId: member._id })
        .sort({ editDate: -1 })
        .lean();

      res.json({
        member: {
          _id: member._id,
          username: member.username,
        },
        pages: pages.map(function (page: any) {
          return {
            ...page,
            friendlyUrl: page.friendlyUrl || utils.urlify(page.title || ''),
          };
        }),
      });
    } catch (err) {
      console.error('Error fetching member pages:', err);
      res.status(500).json({ error: 'Failed to fetch member pages' });
    }
  });

  // Create member custom page
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.post('/:username/pages', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const canManageProfile = req.user.username === req.params.username || req.user.canPlayRoleOf?.('admin');
      if (!canManageProfile) {
        return res.status(403).json({ error: 'Not allowed to create pages for this profile' });
      }

      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const title = String(req.body?.title || '').trim();
      const content = String(req.body?.content || '').trim();
      if (!title || title.length < 3) {
        return res.status(400).json({ error: 'Title must be at least 3 characters' });
      }
      if (!content || content.length < 10) {
        return res.status(400).json({ error: 'Content must be at least 10 characters' });
      }

      const now = new Date();
      const page = await db.Page.create({
        title: title,
        content: content,
        friendlyUrl: utils.urlify(title),
        createDate: now,
        editDate: now,
        createUserId: member._id,
        editUserId: req.user._id || req.user.id,
      });

      res.status(201).json({
        success: true,
        page: {
          _id: page._id,
          title: page.title,
          content: page.content,
          friendlyUrl: page.friendlyUrl || utils.urlify(page.title),
          createDate: page.createDate,
          editDate: page.editDate,
          createUserId: page.createUserId,
        },
      });
    } catch (err) {
      console.error('Error creating member page:', err);
      res.status(500).json({ error: 'Failed to create member page' });
    }
  });

  // Get member custom page
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username/pages/:id', async function (req, res) {
    try {
      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const page = await db.Page.findOne({ _id: req.params.id, createUserId: member._id }).lean();
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json({
        member: {
          _id: member._id,
          username: member.username,
        },
        page: {
          ...page,
          friendlyUrl: page.friendlyUrl || utils.urlify(page.title || ''),
        },
      });
    } catch (err) {
      console.error('Error fetching member page:', err);
      res.status(500).json({ error: 'Failed to fetch member page' });
    }
  });

  // Update member custom page
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.put('/:username/pages/:id', async function (req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const canManageProfile = req.user.username === req.params.username || req.user.canPlayRoleOf?.('admin');
      if (!canManageProfile) {
        return res.status(403).json({ error: 'Not allowed to update pages for this profile' });
      }

      const member = await db.User.findOne({ username: req.params.username }).select('_id username').lean();
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const page = await db.Page.findOne({ _id: req.params.id, createUserId: member._id });
      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      if (typeof req.body?.title !== 'undefined') {
        const title = String(req.body.title || '').trim();
        if (!title || title.length < 3) {
          return res.status(400).json({ error: 'Title must be at least 3 characters' });
        }
        page.title = title;
        page.friendlyUrl = utils.urlify(title);
      }

      if (typeof req.body?.content !== 'undefined') {
        const content = String(req.body.content || '').trim();
        if (!content || content.length < 10) {
          return res.status(400).json({ error: 'Content must be at least 10 characters' });
        }
        page.content = content;
      }

      page.editDate = new Date();
      page.editUserId = req.user._id || req.user.id;
      await page.save();

      res.json({
        success: true,
        page: {
          _id: page._id,
          title: page.title,
          content: page.content,
          friendlyUrl: page.friendlyUrl || utils.urlify(page.title),
          createDate: page.createDate,
          editDate: page.editDate,
          createUserId: page.createUserId,
        },
      });
    } catch (err) {
      console.error('Error updating member page:', err);
      res.status(500).json({ error: 'Failed to update member page' });
    }
  });

  // Get single member profile
  // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
  router.get('/:username', async function (req, res) {
    try {
      const member = await db.User
        .findOne({ username: req.params.username })
        .select('username name email roles preferences createdDate')
        .lean();

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (member.preferences?.privateProfile && (!req.user || req.user.username !== member.username)) {
        return res.status(403).json({ error: 'Profile is private' });
      }

      res.json(member);
    } catch (err) {
      console.error('Error fetching member:', err);
      res.status(500).json({ error: 'Failed to fetch member' });
    }
  });
};
