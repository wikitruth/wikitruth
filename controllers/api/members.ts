// @ts-nocheck
'use strict';

const db = require('../../app').db.models;

module.exports = function (router) {
  // Get all contributors (members with public profiles)
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
