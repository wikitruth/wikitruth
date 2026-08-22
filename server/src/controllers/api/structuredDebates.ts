'use strict';

import type { Router } from 'express';
import type { AuthUser } from '../../types/auth';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import {
  StructuredDebateError,
  buildPublicStructuredDebate,
  createStructuredDebate,
  findStructuredDebateForEntry,
  joinStructuredDebate,
  submitStructuredDebateContribution,
  transitionStructuredDebate,
  withdrawStructuredDebate,
} from '../../services/structuredDebateService';
import { agentAttributionFromRequest } from '../../services/agentAttributionService';

function authenticatedUser(req: WikitruthRequest): AuthUser {
  if (!req.user) {
    throw new StructuredDebateError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to participate in a structured debate.');
  }
  return req.user;
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function sendError(res: WikitruthResponse, error: unknown): void {
  if (error instanceof StructuredDebateError) {
    res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
      message: error.message,
    });
    return;
  }
  throw error;
}

export = function (router: Router) {
  router.get('/entry/:objectName/:entryId', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await findStructuredDebateForEntry({
        entryObjectName: req.params.objectName,
        entryId: req.params.entryId,
        user: req.user,
      });
      res.json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await createStructuredDebate({
        entryObjectName: req.body?.entryObjectName,
        entryId: req.body?.entryId,
        proposition: req.body?.proposition,
        participantLimit: req.body?.participantLimit,
        phaseWindowHours: req.body?.phaseWindowHours,
        user: authenticatedUser(req),
      });
      res.status(201).json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await buildPublicStructuredDebate(routeParam(req.params.id), req.user);
      res.json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:id/join', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await joinStructuredDebate({
        pilotId: routeParam(req.params.id),
        stance: req.body?.stance,
        consentAccepted: req.body?.consentAccepted,
        publicAttributionAccepted: req.body?.publicAttributionAccepted,
        consentVersion: req.body?.consentVersion,
        user: authenticatedUser(req),
      });
      res.status(201).json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:id/withdraw', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await withdrawStructuredDebate({
        pilotId: routeParam(req.params.id),
        user: authenticatedUser(req),
      });
      res.json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:id/contributions', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await submitStructuredDebateContribution({
        pilotId: routeParam(req.params.id),
        contributionType: req.body?.contributionType,
        content: req.body?.content,
        evidenceLinks: req.body?.evidenceLinks,
        user: authenticatedUser(req),
        attribution: agentAttributionFromRequest(req),
      });
      res.status(201).json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:id/transitions', async function (req: WikitruthRequest, res: WikitruthResponse) {
    try {
      const debate = await transitionStructuredDebate({
        pilotId: routeParam(req.params.id),
        action: req.body?.action,
        publicReason: req.body?.publicReason,
        user: authenticatedUser(req),
      });
      res.json({ success: true, debate });
    } catch (error) {
      sendError(res, error);
    }
  });
};
