// @ts-nocheck
'use strict';

const db = require('../../app').db.models;
const utils = require('../../utils/utils');
const constants = require('../../models/constants');

module.exports = function (router) {
  // Get all groups (public and private based on user)
  router.get('/', async function (req, res) {
    try {
      let results = await db.Group
        .find({})
        .sort({ title: 1 })
        .lean();
      
      results.forEach(function (result) {
        result.friendlyUrl = utils.urlify(result.title);
      });

      const model = {};
      
      if (req.user) {
        model.privateGroups = results.filter(function (group) {
          return group.privacyType !== constants.GROUP_PRIVACY_TYPES.type10.code
            && group.members && group.members.some(function (member) {
              return member.userId && member.userId.equals(req.user.id);
            });
        });
      }
      
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
  router.get('/entry/:id', async function (req, res) {
    try {
      const group = await db.Group
        .findById(req.params.id)
        .lean();

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      group.friendlyUrl = utils.urlify(group.title);
      
      res.json(group);
    } catch (err) {
      console.error('Error fetching group:', err);
      res.status(500).json({ error: 'Failed to fetch group' });
    }
  });
};
