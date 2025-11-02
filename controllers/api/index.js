'use strict';

const express = require('express');

module.exports = function (router) {
  // Create sub-routers for API endpoints
  const homeRouter = express.Router();
  const topicsRouter = express.Router();
  const argumentsRouter = express.Router();
  const questionsRouter = express.Router();
  const searchRouter = express.Router();
  const issuesRouter = express.Router();
  const opinionsRouter = express.Router();
  const answersRouter = express.Router();
  const artifactsRouter = express.Router();
  const groupsRouter = express.Router();
  const membersRouter = express.Router();

  // Load route handlers
  require('./home')(homeRouter);
  require('./topics')(topicsRouter);
  require('./arguments')(argumentsRouter);
  require('./questions')(questionsRouter);
  require('./search')(searchRouter);
  require('./issues')(issuesRouter);
  require('./opinions')(opinionsRouter);
  require('./answers')(answersRouter);
  require('./artifacts')(artifactsRouter);
  require('./groups')(groupsRouter);
  require('./members')(membersRouter);

  // Mount sub-routers
  router.use('/home', homeRouter);
  router.use('/topics', topicsRouter);
  router.use('/arguments', argumentsRouter);
  router.use('/questions', questionsRouter);
  router.use('/search', searchRouter);
  router.use('/issues', issuesRouter);
  router.use('/opinions', opinionsRouter);
  router.use('/answers', answersRouter);
  router.use('/artifacts', artifactsRouter);
  router.use('/groups', groupsRouter);
  router.use('/members', membersRouter);
};
