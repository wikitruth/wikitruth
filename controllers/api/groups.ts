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
              return member.userId && member.userId.equals(req.user.id);
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
