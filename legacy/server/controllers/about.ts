'use strict';

const templates = require('../models/templates'),
  db = require('../app').db.models;

module.exports = function (router) {

    router.get('/:id', async function(req, res) {
      const model = {};
      model.page = await db.Page.findOne({ id: req.params.id });
      res.render(templates.about.index, model);
    });
};
