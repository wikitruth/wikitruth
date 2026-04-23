'use strict';

import type { LegacyControllerFactory } from '../../../server/src/types/legacyControllers';

import templates = require('../models/templates');
import app = require('../app');

const db = (app as { db: { models: { Page: { findOne: (query: Record<string, unknown>) => Promise<unknown> } } } }).db.models;

const mountAboutController: LegacyControllerFactory = function (router) {

    router.get('/:id', async function(req, res) {
      const model = {};
      model.page = await db.Page.findOne({ id: req.params.id });
      res.render(templates.about.index, model);
    });
};

export default mountAboutController;
