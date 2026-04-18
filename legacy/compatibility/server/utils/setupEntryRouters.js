'use strict';

module.exports = function setupEntryRouters(router, prefix) {
  const topics = require('../controllers/topics');
  const argumentsController = require('../controllers/arguments');
  const artifacts = require('../controllers/artifacts');
  const questions = require('../controllers/questions');
  const answers = require('../controllers/answers');
  const issues = require('../controllers/issues');
  const opinions = require('../controllers/opinions');
  const visualize = require('../controllers/visualize');

  router.get(prefix + '/visualize(/topic)?(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await visualize.GET_index(req, res);
  });

  router.get(prefix + '/topics', async function(req, res) {
    await topics.GET_index(req, res);
  });

  router.get(prefix + '/topics/create', async function(req, res) {
    await topics.GET_create(req, res);
  });

  router.post(prefix + '/topics/create', async function(req, res) {
    await topics.POST_create(req, res);
  });

  router.get(prefix + '/topics/link/edit', async function(req, res) {
    await topics.GET_link_edit(req, res);
  });

  router.post(prefix + '/topics/link/edit', async function(req, res) {
    await topics.POST_link_edit(req, res);
  });

  router.get(prefix + '/topics/:friendlyUrl/:id', async function(req, res) {
    await topics.GET_index(req, res);
  });

  router.get(prefix + '/topic/:friendlyUrl/link/:id', async function(req, res) {
    await topics.GET_link_entry(req, res);
  });

  router.get(prefix + '/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await topics.GET_entry(req, res);
  });

  router.get(`${prefix}/arguments`, async function(req, res) {
    await argumentsController.GET_index(req, res);
  });

  router.get(`${prefix}/arguments/create`, async function(req, res) {
    await argumentsController.GET_create(req, res);
  });

  router.post(`${prefix}/arguments/create`, async function(req, res) {
    await argumentsController.POST_create(req, res);
  });

  router.get(`${prefix}/arguments/link/edit`, async function(req, res) {
    await argumentsController.GET_link_edit(req, res);
  });

  router.post(`${prefix}/arguments/link/edit`, async function(req, res) {
    await argumentsController.POST_link_edit(req, res);
  });

  router.get(`${prefix}/argument/:friendlyUrl/link/:id`, async function(req, res) {
    await argumentsController.GET_link_entry(req, res);
  });

  router.get(`${prefix}/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?`, async function(req, res) {
    await argumentsController.GET_entry(req, res);
  });

  router.get(prefix + '/artifacts', async function(req, res) {
    await artifacts.GET_index(req, res);
  });

  router.get(prefix + '/artifacts/create', async function(req, res) {
    await artifacts.GET_create(req, res);
  });

  router.post(prefix + '/artifacts/create', async function(req, res) {
    await artifacts.POST_create(req, res);
  });

  router.get(prefix + '/artifact(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await artifacts.GET_entry(req, res);
  });

  router.get(prefix + '/questions', async function(req, res) {
    await questions.GET_index(req, res);
  });

  router.get(prefix + '/questions/create', async function(req, res) {
    await questions.GET_create(req, res);
  });

  router.post(prefix + '/questions/create', async function(req, res) {
    await questions.POST_create(req, res);
  });

  router.get(prefix + '/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await questions.GET_entry(req, res);
  });

  router.get(prefix + '/answers', async function(req, res) {
    await answers.GET_index(req, res);
  });

  router.get(prefix + '/answers/create', async function(req, res) {
    await answers.GET_create(req, res);
  });

  router.post(prefix + '/answers/create', async function(req, res) {
    await answers.POST_create(req, res);
  });

  router.get(prefix + '/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await answers.GET_entry(req, res);
  });

  router.get(prefix + '/issues', async function(req, res) {
    await issues.GET_index(req, res);
  });

  router.get(prefix + '/issues/create', async function(req, res) {
    await issues.GET_create(req, res);
  });

  router.post(prefix + '/issues/create', async function(req, res) {
    await issues.POST_create(req, res);
  });

  router.get(prefix + '/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await issues.GET_entry(req, res);
  });

  router.get(prefix + '/opinions', async function(req, res) {
    await opinions.GET_index(req, res);
  });

  router.get(prefix + '/opinions/create', async function(req, res) {
    await opinions.GET_create(req, res);
  });

  router.post(prefix + '/opinions/create', async function(req, res) {
    await opinions.POST_create(req, res);
  });

  router.get(prefix + '/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', async function(req, res) {
    await opinions.GET_entry(req, res);
  });
};
