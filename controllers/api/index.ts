// @ts-nocheck
'use strict';

const express = require('express');
const { wrapAsyncRouter } = require('../../middlewares/apiError');

module.exports = function (router) {
  // Create sub-routers for API endpoints
  const homeRouter = wrapAsyncRouter(express.Router());
  const topicsRouter = wrapAsyncRouter(express.Router());
  const argumentsRouter = wrapAsyncRouter(express.Router());
  const questionsRouter = wrapAsyncRouter(express.Router());
  const searchRouter = wrapAsyncRouter(express.Router());
  const issuesRouter = wrapAsyncRouter(express.Router());
  const opinionsRouter = wrapAsyncRouter(express.Router());
  const answersRouter = wrapAsyncRouter(express.Router());
  const artifactsRouter = wrapAsyncRouter(express.Router());
  const groupsRouter = wrapAsyncRouter(express.Router());
  const membersRouter = wrapAsyncRouter(express.Router());

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
