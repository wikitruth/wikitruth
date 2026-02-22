'use strict';

// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const express = require('express');
// @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
const { wrapAsyncRouter } = require('../../middlewares/apiError');

// @ts-ignore TS(2580): Cannot find name 'module'. Do you need to install ... Remove this comment to see the full error message
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
  const authRouter = wrapAsyncRouter(express.Router());
  const adminRouter = wrapAsyncRouter(express.Router());
  const monitoringRouter = wrapAsyncRouter(express.Router());

  // Load route handlers
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./home')(homeRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./topics')(topicsRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./arguments')(argumentsRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./questions')(questionsRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./search')(searchRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./issues')(issuesRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./opinions')(opinionsRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./answers')(answersRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./artifacts')(artifactsRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./groups')(groupsRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./members')(membersRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./auth')(authRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./admin')(adminRouter);
  // @ts-ignore TS(2580): Cannot find name 'require'. Do you need to install... Remove this comment to see the full error message
  require('./monitoring')(monitoringRouter);

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
  router.use('/auth', authRouter);
  router.use('/admin', adminRouter);
  router.use('/monitoring', monitoringRouter);
};
