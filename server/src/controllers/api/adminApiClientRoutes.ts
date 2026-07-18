'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import appModForDb from '../../app';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import {
  generateApiClientToken,
  normalizeApiClientScopes,
  toApiClientIdentity,
} from '../../services/apiClientService';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;

type EnsureAdmin = (req: WikitruthRequest, res: WikitruthResponse) => boolean;

function canManage(req: WikitruthRequest, res: WikitruthResponse, ensureAdmin: EnsureAdmin): boolean {
  if (req.apiClient) {
    res.status(403).json({ success: false, message: 'Agent credentials cannot manage agent credentials' });
    return false;
  }
  return ensureAdmin(req, res);
}

function expiry(value: unknown): Date | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value === 'undefined') return undefined;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) && date.getTime() > Date.now() ? date : undefined;
}

function publicClient(client: Record<string, unknown>) {
  const identity = toApiClientIdentity(client);
  return {
    ...identity,
    description: String(client.description || ''),
    status: String(client.status || 'active'),
    lastUsedAt: client.lastUsedAt || null,
    requestCount: Number(client.requestCount || 0),
    createDate: client.createDate || null,
    editDate: client.editDate || null,
    revokedAt: client.revokedAt || null,
    accountableUser: client.userId && typeof client.userId === 'object'
      ? {
        id: String((client.userId as Record<string, unknown>)._id || ''),
        username: String((client.userId as Record<string, unknown>).username || ''),
        email: String((client.userId as Record<string, unknown>).email || ''),
      }
      : undefined,
  };
}

async function audit(req: WikitruthRequest, eventType: string, userId: string, message: string, payload: Record<string, unknown>) {
  await logEntryEvent({
    scope: 'privileged',
    eventType,
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'user',
    objectId: userId,
    actorUserId: String(req.user?._id || req.user?.id || ''),
    actorUsername: String(req.user?.username || ''),
    message,
    payload,
  });
}

export function registerAdminApiClientRoutes(router: Router, ensureAdmin: EnsureAdmin): void {
  router.get('/api-clients', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canManage(req, res, ensureAdmin)) return;
    const clients = await db.ApiClient.find().sort({ createDate: -1 }).populate('userId', 'username email').lean();
    res.json({ success: true, clients: clients.map(publicClient) });
  });

  router.post('/api-clients', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canManage(req, res, ensureAdmin)) return;
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const userId = String(req.body?.userId || '').trim();
    const scopes = normalizeApiClientScopes(req.body?.scopes, { allowAdmin: process.env.ALLOW_AGENT_ADMIN_SCOPE === 'true' });
    const expiresAt = expiry(req.body?.expiresAt);
    const rateLimitPerMinute = Math.max(10, Math.min(600, Number(req.body?.rateLimitPerMinute || 60)));
    if (name.length < 3 || !userId || !scopes.length) {
      res.status(400).json({ success: false, message: 'name, accountable user, and at least one valid scope are required' });
      return;
    }
    if (typeof req.body?.expiresAt !== 'undefined' && req.body.expiresAt !== null && !expiresAt) {
      res.status(400).json({ success: false, message: 'expiresAt must be a future date' });
      return;
    }
    const user = await db.User.findById(userId).lean();
    if (!user || (user.isActive && user.isActive !== 'yes')) {
      res.status(400).json({ success: false, message: 'Accountable user must be active' });
      return;
    }
    const credential = generateApiClientToken();
    const actorId = String(req.user?._id || req.user?.id || '');
    const client = await db.ApiClient.create({
      clientId: credential.clientId,
      name,
      description,
      userId,
      tokenPrefix: credential.tokenPrefix,
      secretHash: credential.secretHash,
      scopes,
      status: 'active',
      expiresAt: expiresAt || null,
      rateLimitPerMinute,
      createUserId: actorId,
      editUserId: actorId,
      createDate: new Date(),
      editDate: new Date(),
    });
    await audit(req, 'agent.credential.created', userId, `Agent credential created: ${name}`, {
      apiClientId: String(client._id || ''), clientId: credential.clientId, scopes,
    });
    res.status(201).json({
      success: true,
      client: publicClient(client.toObject ? client.toObject() : client),
      token: credential.token,
      tokenReturnedOnce: true,
    });
  });

  router.post('/api-clients/:id/rotate', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canManage(req, res, ensureAdmin)) return;
    const client = await db.ApiClient.findById(req.params.id).select('+secretHash');
    if (!client) {
      res.status(404).json({ success: false, message: 'API client not found' });
      return;
    }
    if (client.status !== 'active') {
      res.status(409).json({ success: false, message: 'Revoked API clients cannot be rotated' });
      return;
    }
    const credential = generateApiClientToken(String(client.clientId));
    client.secretHash = credential.secretHash;
    client.tokenPrefix = credential.tokenPrefix;
    client.editUserId = req.user?._id || req.user?.id;
    client.editDate = new Date();
    await client.save();
    await audit(req, 'agent.credential.rotated', String(client.userId || ''), `Agent credential rotated: ${client.name}`, {
      apiClientId: String(client._id || ''), clientId: String(client.clientId || ''),
    });
    res.json({ success: true, client: publicClient(client.toObject()), token: credential.token, tokenReturnedOnce: true });
  });

  router.delete('/api-clients/:id', async function (req: WikitruthRequest, res: WikitruthResponse) {
    if (!canManage(req, res, ensureAdmin)) return;
    const now = new Date();
    const client = await db.ApiClient.findByIdAndUpdate(req.params.id, {
      $set: {
        status: 'revoked', revokedAt: now, revokedByUserId: req.user?._id || req.user?.id,
        editUserId: req.user?._id || req.user?.id, editDate: now,
      },
    }, { new: true }).lean();
    if (!client) {
      res.status(404).json({ success: false, message: 'API client not found' });
      return;
    }
    await audit(req, 'agent.credential.revoked', String(client.userId || ''), `Agent credential revoked: ${client.name}`, {
      apiClientId: String(client._id || ''), clientId: String(client.clientId || ''),
    });
    res.json({ success: true, client: publicClient(client) });
  });
}
