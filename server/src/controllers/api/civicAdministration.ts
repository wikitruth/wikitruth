'use strict';

import type { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import appModForDb from '../../app';
import constants from '../../models/constants';
import { BUILT_IN_CIVIC_TENANTS } from '../../config/civicTenants';
import { ensureCivicTenantRole } from '../../services/civicAuthorizationService';
import { bootstrapBuiltInCivicTenants, publicCivicTenant } from '../../services/civicTenantService';
import { logEntryEvent } from '../../services/entryEventsService';
import { requirePrivilegedPasskeyAssurance } from '../../services/privilegedAuthService';
import { civicExtensionSchemasInput } from '../../services/civicExtensionService';
import { CIVIC_RECORD_KINDS } from '../../types/civic';
import {
  CIVIC_DEPLOYMENT_MODES,
  CIVIC_TENANT_ROLES,
  CIVIC_TENANT_STATUSES,
} from '../../types/civicTenancy';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import * as utils from '../../utils/utils';
import {
  buildTenantConfigurationPreview,
  buildTenantLaunchReadiness,
  portableTenantConfiguration,
} from '../../services/civicTenantReadinessService';

const db = (appModForDb as unknown as { db: { models: Record<string, any> } }).db.models;
const tenantIdSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,62}$/);
const colorSchema = z.string().trim().regex(/^#[0-9a-f]{6}$/i);
const siteUrlSchema = z.string().trim().max(500).refine(
  (value) => !value || /^\/(?!\/)/.test(value) || /^https:\/\//i.test(value),
  'Site URLs must be same-origin paths or HTTPS URLs',
);
const sectionSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(''),
  icon: z.string().trim().max(60).default('circle'),
  kinds: z.array(z.enum(CIVIC_RECORD_KINDS)).min(1),
  createKinds: z.array(z.enum(CIVIC_RECORD_KINDS)).default([]),
  enabled: z.boolean().default(true),
});
const tenantSchema = z.object({
  tenantId: tenantIdSchema,
  status: z.enum(CIVIC_TENANT_STATUSES).default('active'),
  countryCode: z.string().trim().length(2).toUpperCase(),
  title: z.string().trim().min(2).max(120),
  navTitle: z.string().trim().max(60).default(''),
  slogan: z.string().trim().max(500).default(''),
  site: z.object({
    homeTitle: z.string().trim().max(160).default(''),
    homeDescription: z.string().trim().max(700).default(''),
    aboutUrl: siteUrlSchema.default('/civic'),
    exploreUrl: siteUrlSchema.default('/explore'),
    knowledgeRootTopicId: z.string().trim().refine(
      (value) => !value || mongoose.isValidObjectId(value),
      'Invalid knowledge root topic id',
    ).default(''),
  }).default({
    homeTitle: '',
    homeDescription: '',
    aboutUrl: '/civic',
    exploreUrl: '/explore',
    knowledgeRootTopicId: '',
  }),
  domains: z.array(z.string().trim().toLowerCase().min(3)).min(1).max(20),
  branding: z.object({
    logoIcon: z.string().trim().default(''),
    favicon: z.string().trim().default(''),
    primaryColor: colorSchema.default('#1f6f50'),
    accentColor: colorSchema.default('#d96b27'),
    surfaceColor: colorSchema.default('#f5f1e8'),
    fontFamily: z.string().trim().max(200).default(''),
  }),
  localization: z.object({
    defaultLocale: z.string().trim().min(2).max(35),
    supportedLocales: z.array(z.string().trim().min(2).max(35)).min(1),
    timezone: z.string().trim().min(1).max(80),
    currency: z.string().trim().length(3).toUpperCase(),
  }),
  geography: z.object({
    levels: z.array(z.object({
      key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
      label: z.string().trim().min(1).max(80),
    })).min(1).max(12),
    addressFields: z.array(z.string().trim().regex(/^[a-z][a-z0-9_]*$/)).max(20),
  }),
  sections: z.array(sectionSchema).min(1).max(20),
  featureFlags: z.record(z.string(), z.boolean()).default({}),
  extensionSchemas: civicExtensionSchemasInput.optional().default({}),
  moderationPolicyVersion: z.string().trim().min(1).max(50).default('1'),
  electionSystem: z.string().trim().max(200).default(''),
  deploymentMode: z.enum(CIVIC_DEPLOYMENT_MODES).default('shared'),
});
const tenantUpdateSchema = tenantSchema.partial().omit({ tenantId: true });
const jurisdictionSchema = z.object({
  code: z.string().trim().min(1).max(80),
  levelKey: z.string().trim().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().trim().min(1).max(180),
  parentId: z.string().trim().refine((value) => !value || mongoose.isValidObjectId(value), 'Invalid parent id').optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});
const jurisdictionUpdateSchema = jurisdictionSchema.partial();
const membershipSchema = z.object({
  userId: z.string().trim().refine((value) => mongoose.isValidObjectId(value), 'Invalid user id'),
  roles: z.array(z.enum(CIVIC_TENANT_ROLES)).min(1),
  active: z.boolean().default(true),
});
const membershipCandidateQuerySchema = z.string().trim().min(2).max(120);

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

function ensurePlatformAdmin(req: WikitruthRequest, res: WikitruthResponse): boolean {
  if (req.user?.canPlayRoleOf?.('admin')) return true;
  res.status(req.user ? 403 : 401).json({ success: false, message: req.user ? 'Platform administrator privileges required' : 'Authentication required' });
  return false;
}

async function ensureUniqueDomains(tenantId: string, domains: string[]): Promise<void> {
  const existing = await db.CivicTenant.findOne({ tenantId: { $ne: tenantId }, domains: { $in: domains } }).lean();
  if (existing) throw new Error(`Domain is already assigned to tenant ${existing.tenantId}`);
}

async function managedTenant(tenantId: string) {
  const persisted = await db.CivicTenant.findOne({ tenantId }).lean();
  if (persisted) return publicCivicTenant(persisted as never);
  const builtIn = BUILT_IN_CIVIC_TENANTS.find((tenant) => tenant.tenantId === tenantId);
  return builtIn ? publicCivicTenant(builtIn) : null;
}

async function auditTenantChange(req: WikitruthRequest, tenant: Record<string, any>, eventType: string, message: string): Promise<void> {
  await logEntryEvent({
    scope: 'privileged',
    eventType,
    objectType: constants.OBJECT_TYPES.civicTenant,
    objectName: 'civicTenant',
    objectId: String(tenant._id),
    actorUserId: actorId(req),
    actorUsername: String(req.user?.username || ''),
    message,
    payload: { tenantId: tenant.tenantId },
  });
}

function membershipUser(user: Record<string, unknown>): Record<string, string> {
  return {
    _id: String(user._id),
    username: String(user.username || ''),
    email: String(user.email || ''),
  };
}

function escapedSearchExpression(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

async function createsJurisdictionCycle(tenantId: string, jurisdictionId: string, parentId: string): Promise<boolean> {
  let currentId = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === jurisdictionId || visited.has(currentId)) return true;
    visited.add(currentId);
    const current = await db.Jurisdiction.findOne({ _id: currentId, tenantId, active: true }).select('parentId').lean();
    currentId = current?.parentId ? String(current.parentId) : '';
  }
  return false;
}

export function registerCivicAdministrationRoutes(router: Router): void {
  router.get('/platform/tenants', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    const persisted = await db.CivicTenant.find({}).sort({ tenantId: 1 }).lean();
    const byId = new Map(BUILT_IN_CIVIC_TENANTS.map((tenant) => [tenant.tenantId, publicCivicTenant(tenant)]));
    persisted.forEach((tenant: Record<string, any>) => byId.set(String(tenant.tenantId), publicCivicTenant(tenant as never)));
    res.json({ tenants: [...byId.values()] });
  });

  router.post('/platform/tenants/bootstrap', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const count = await bootstrapBuiltInCivicTenants(actorId(req));
    res.json({ success: true, count });
  });

  router.post('/platform/tenants', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const parsed = tenantSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid civic tenant configuration', details: parsed.error.issues });
      return;
    }
    await ensureUniqueDomains(parsed.data.tenantId, parsed.data.domains);
    const tenant = await db.CivicTenant.create({
      ...parsed.data,
      createUserId: actorId(req),
      editUserId: actorId(req),
      createDate: new Date(),
      editDate: new Date(),
    });
    await auditTenantChange(req, tenant, 'civic.tenant.created', 'Civic tenant created');
    res.status(201).json({ tenant });
  });

  router.post('/platform/tenants/preview', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    const parsed = tenantSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid civic tenant configuration', details: parsed.error.issues });
      return;
    }
    const tenant = publicCivicTenant(parsed.data as never);
    res.json({ success: true, preview: buildTenantConfigurationPreview(tenant) });
  });

  router.get('/platform/tenants/:managedTenantId/readiness', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    const parsed = tenantIdSchema.safeParse(req.params.managedTenantId);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid civic tenant id' });
      return;
    }
    const tenant = await managedTenant(parsed.data);
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Civic tenant not found' });
      return;
    }
    res.json({ success: true, readiness: await buildTenantLaunchReadiness(tenant) });
  });

  router.get('/platform/tenants/:managedTenantId/export', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    const parsed = tenantIdSchema.safeParse(req.params.managedTenantId);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid civic tenant id' });
      return;
    }
    const tenant = await managedTenant(parsed.data);
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Civic tenant not found' });
      return;
    }
    const readiness = await buildTenantLaunchReadiness(tenant);
    if (String(req.query.download || '') === 'true') res.attachment(`${tenant.tenantId}-civic-tenant.json`);
    res.json(portableTenantConfiguration(tenant, readiness));
  });

  router.put('/platform/tenants/:managedTenantId', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const parsed = tenantUpdateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid civic tenant configuration', details: parsed.error.issues });
      return;
    }
    const managedTenantId = tenantIdSchema.parse(req.params.managedTenantId);
    if (parsed.data.domains) await ensureUniqueDomains(managedTenantId, parsed.data.domains);
    const tenant = await db.CivicTenant.findOneAndUpdate(
      { tenantId: managedTenantId },
      { $set: { ...parsed.data, editUserId: actorId(req), editDate: new Date() } },
      { new: true },
    );
    if (!tenant) {
      res.status(404).json({ success: false, message: 'Civic tenant not found' });
      return;
    }
    await auditTenantChange(req, tenant, 'civic.tenant.updated', 'Civic tenant configuration updated');
    res.json({ tenant });
  });

  router.put('/platform/tenants/:managedTenantId/memberships/:userId', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensurePlatformAdmin(req, res)) return;
    if (!(await requirePrivilegedPasskeyAssurance(req, res))) return;
    const managedTenantId = tenantIdSchema.safeParse(req.params.managedTenantId);
    const parsed = membershipSchema.safeParse({ ...req.body, userId: req.params.userId });
    if (!managedTenantId.success || !parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid explicit tenant membership', details: parsed.success ? [] : parsed.error.issues });
      return;
    }
    const builtIn = BUILT_IN_CIVIC_TENANTS.some((tenant) => tenant.tenantId === managedTenantId.data);
    const persisted = builtIn ? true : await db.CivicTenant.findOne({ tenantId: managedTenantId.data }).select('_id').lean();
    const user = await db.User.findById(parsed.data.userId).select('_id username').lean();
    if (!persisted || !user) {
      res.status(404).json({ success: false, message: persisted ? 'User not found' : 'Civic tenant not found' });
      return;
    }
    const membership = await db.TenantMembership.findOneAndUpdate(
      { tenantId: managedTenantId.data, userId: parsed.data.userId },
      {
        $set: { roles: parsed.data.roles, active: parsed.data.active, editUserId: actorId(req), editDate: new Date() },
        $setOnInsert: { createUserId: actorId(req), createDate: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'civic.membership.platform_provisioned',
      objectType: constants.OBJECT_TYPES.tenantMembership,
      objectName: 'tenantMembership',
      objectId: String(membership._id),
      actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''),
      message: 'Platform administrator explicitly provisioned civic tenant access',
      payload: { tenantId: managedTenantId.data, userId: parsed.data.userId, roles: parsed.data.roles, active: parsed.data.active },
    });
    res.json({ membership });
  });

  router.get('/admin/memberships', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['admin'])) return;
    const memberships = await db.TenantMembership.find({ tenantId: req.civicTenant!.tenantId }).sort({ createDate: 1 }).lean();
    const userIds = memberships.map((membership: Record<string, unknown>) => membership.userId).filter(Boolean);
    const users = userIds.length
      ? await db.User.find({ _id: { $in: userIds } }).select('_id username email').lean()
      : [];
    const usersById = new Map(users.map((user: Record<string, unknown>) => [String(user._id), membershipUser(user)]));
    res.json({
      memberships: memberships.map((membership: Record<string, unknown>) => ({
        ...membership,
        user: usersById.get(String(membership.userId)) || null,
      })),
    });
  });

  router.get('/admin/membership-candidates', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['admin'])) return;
    const parsed = membershipCandidateQuerySchema.safeParse(req.query.q);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Enter at least two characters to search users' });
      return;
    }
    const search = escapedSearchExpression(parsed.data);
    const users = await db.User.find({
      isActive: 'yes',
      $or: [{ username: search }, { email: search }],
    }).select('_id username email').sort({ username: 1 }).limit(20).lean();
    res.json({ users: users.map(membershipUser) });
  });

  router.put('/admin/memberships/:userId', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['admin'])) return;
    const parsed = membershipSchema.safeParse({ ...req.body, userId: req.params.userId });
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid tenant membership', details: parsed.error.issues });
      return;
    }
    const user = await db.User.findById(parsed.data.userId).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const membership = await db.TenantMembership.findOneAndUpdate(
      { tenantId: req.civicTenant!.tenantId, userId: parsed.data.userId },
      {
        $set: { roles: parsed.data.roles, active: parsed.data.active, editUserId: actorId(req), editDate: new Date() },
        $setOnInsert: { createUserId: actorId(req), createDate: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await logEntryEvent({
      scope: 'privileged',
      eventType: 'civic.membership.updated',
      objectType: constants.OBJECT_TYPES.tenantMembership,
      objectName: 'tenantMembership',
      objectId: String(membership._id),
      actorUserId: actorId(req),
      actorUsername: String(req.user?.username || ''),
      message: 'Civic tenant membership updated',
      payload: { tenantId: req.civicTenant!.tenantId, userId: parsed.data.userId, roles: parsed.data.roles, active: parsed.data.active },
    });
    res.json({ membership });
  });

  router.post('/admin/jurisdictions', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['admin'])) return;
    const parsed = jurisdictionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid jurisdiction', details: parsed.error.issues });
      return;
    }
    if (parsed.data.parentId) {
      const parent = await db.Jurisdiction.findOne({ _id: parsed.data.parentId, tenantId: req.civicTenant!.tenantId }).lean();
      if (!parent) {
        res.status(400).json({ success: false, message: 'Parent jurisdiction was not found in this tenant' });
        return;
      }
    }
    const allowedLevelKeys = new Set(req.civicTenant!.geography.levels.map((level) => level.key));
    if (!allowedLevelKeys.has(parsed.data.levelKey)) {
      res.status(400).json({ success: false, message: 'Jurisdiction level is not configured for this tenant' });
      return;
    }
    const jurisdiction = await db.Jurisdiction.create({
      ...parsed.data,
      tenantId: req.civicTenant!.tenantId,
      countryCode: req.civicTenant!.countryCode,
      friendlyUrl: utils.urlify(parsed.data.name),
      parentId: parsed.data.parentId || null,
      active: true,
      createUserId: actorId(req),
      editUserId: actorId(req),
      createDate: new Date(),
      editDate: new Date(),
    });
    await logEntryEvent({
      scope: 'privileged', eventType: 'civic.jurisdiction.created', objectType: constants.OBJECT_TYPES.jurisdiction,
      objectName: 'jurisdiction', objectId: String(jurisdiction._id), actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
      message: 'Civic jurisdiction created', payload: { tenantId: req.civicTenant!.tenantId, code: parsed.data.code },
    });
    res.status(201).json({ jurisdiction });
  });

  router.put('/admin/jurisdictions/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['admin'])) return;
    const parsed = jurisdictionUpdateSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid jurisdiction', details: parsed.error.issues });
      return;
    }
    if (parsed.data.parentId) {
      const parent = await db.Jurisdiction.findOne({ _id: parsed.data.parentId, tenantId: req.civicTenant!.tenantId, active: true }).lean();
      if (!parent || await createsJurisdictionCycle(req.civicTenant!.tenantId, String(req.params.id || ''), parsed.data.parentId)) {
        res.status(400).json({ success: false, message: 'Invalid parent jurisdiction for this tenant' });
        return;
      }
    }
    if (parsed.data.levelKey) {
      const allowed = req.civicTenant!.geography.levels.some((level) => level.key === parsed.data.levelKey);
      if (!allowed) {
        res.status(400).json({ success: false, message: 'Jurisdiction level is not configured for this tenant' });
        return;
      }
    }
    const update = {
      ...parsed.data,
      ...(parsed.data.name ? { friendlyUrl: utils.urlify(parsed.data.name) } : {}),
      editUserId: actorId(req),
      editDate: new Date(),
    };
    const jurisdiction = await db.Jurisdiction.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.civicTenant!.tenantId },
      { $set: update },
      { new: true },
    );
    if (!jurisdiction) {
      res.status(404).json({ success: false, message: 'Jurisdiction not found' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged', eventType: 'civic.jurisdiction.updated', objectType: constants.OBJECT_TYPES.jurisdiction,
      objectName: 'jurisdiction', objectId: String(jurisdiction._id), actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
      message: 'Civic jurisdiction updated', payload: { tenantId: req.civicTenant!.tenantId, code: jurisdiction.code },
    });
    res.json({ jurisdiction });
  });

  router.delete('/admin/jurisdictions/:id', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!await ensureCivicTenantRole(req, res, ['admin'])) return;
    const hasChildren = await db.Jurisdiction.countDocuments({ tenantId: req.civicTenant!.tenantId, parentId: req.params.id, active: true });
    if (hasChildren) {
      res.status(409).json({ success: false, message: 'Deactivate child jurisdictions first' });
      return;
    }
    const jurisdiction = await db.Jurisdiction.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.civicTenant!.tenantId },
      { $set: { active: false, editUserId: actorId(req), editDate: new Date() } },
      { new: true },
    );
    if (!jurisdiction) {
      res.status(404).json({ success: false, message: 'Jurisdiction not found' });
      return;
    }
    await logEntryEvent({
      scope: 'privileged', eventType: 'civic.jurisdiction.deactivated', objectType: constants.OBJECT_TYPES.jurisdiction,
      objectName: 'jurisdiction', objectId: String(jurisdiction._id), actorUserId: actorId(req), actorUsername: String(req.user?.username || ''),
      message: 'Civic jurisdiction deactivated', payload: { tenantId: req.civicTenant!.tenantId, code: jurisdiction.code },
    });
    res.json({ success: true, jurisdiction });
  });
}
