'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = require('../../app').db.models;

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
