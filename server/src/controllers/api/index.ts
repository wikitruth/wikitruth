'use strict';

import type { Router } from 'express';

const express = require('express') as typeof import('express');
const apiError = require('../../middlewares/apiError') as {
  wrapAsyncRouter: (router: Router) => Router;
  apiEnvelopeMiddleware: import('express').RequestHandler;
};
const mobileContracts = require('../../middlewares/mobileApiContracts') as {
  mobileApiContractMiddleware: import('express').RequestHandler;
};
import { sanitizeContentMiddleware } from '../../middlewares/sanitizeContent';

module.exports = function (router: Router) {
  router.use(apiError.apiEnvelopeMiddleware);
  router.use(mobileContracts.mobileApiContractMiddleware);
  router.use(sanitizeContentMiddleware);

  const homeRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const topicsRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const argumentsRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const questionsRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const searchRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const issuesRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const opinionsRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const answersRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const artifactsRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const groupsRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const membersRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const authRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const contactRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const adminRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const moderationRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const monitoringRouter = apiError.wrapAsyncRouter(express.Router()) as Router;
  const realtimeRouter = apiError.wrapAsyncRouter(express.Router()) as Router;

  (require('./home') as (routerArg: Router) => void)(homeRouter);
  (require('./topics') as (routerArg: Router) => void)(topicsRouter);
  (require('./arguments') as (routerArg: Router) => void)(argumentsRouter);
  (require('./questions') as (routerArg: Router) => void)(questionsRouter);
  (require('./search') as (routerArg: Router) => void)(searchRouter);
  (require('./issues') as (routerArg: Router) => void)(issuesRouter);
  (require('./opinions') as (routerArg: Router) => void)(opinionsRouter);
  (require('./answers') as (routerArg: Router) => void)(answersRouter);
  (require('./artifacts') as (routerArg: Router) => void)(artifactsRouter);
  (require('./groups') as (routerArg: Router) => void)(groupsRouter);
  (require('./members') as (routerArg: Router) => void)(membersRouter);
  (require('./auth') as (routerArg: Router) => void)(authRouter);
  (require('./contact') as (routerArg: Router) => void)(contactRouter);
  (require('./admin') as (routerArg: Router) => void)(adminRouter);
  (require('./moderation') as (routerArg: Router) => void)(moderationRouter);
  (require('./monitoring') as (routerArg: Router) => void)(monitoringRouter);
  (require('./realtime') as (routerArg: Router) => void)(realtimeRouter);

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
  router.use('/contact', contactRouter);
  router.use('/admin', adminRouter);
  router.use('/moderation', moderationRouter);
  router.use('/monitoring', monitoringRouter);
  router.use('/realtime', realtimeRouter);
};
