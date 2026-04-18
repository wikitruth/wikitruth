'use strict';

// @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'templates'... Remove this comment to see the full error message
const templates = require('../models/templates'),
  // @ts-ignore TS(2451): Cannot redeclare block-scoped variable 'db'.
  db = require('../app').db.models;

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
module.exports = function (router) {

    // @ts-ignore TS(7006): Parameter 'req' implicitly has an 'any' type.
    router.get('/:id', async function(req, res) {
      const model = {};
      // @ts-ignore TS(2339): Property 'page' does not exist on type '{}'.
      model.page = await db.Page.findOne({ id: req.params.id });
      res.render(templates.about.index, model);
    });
};
