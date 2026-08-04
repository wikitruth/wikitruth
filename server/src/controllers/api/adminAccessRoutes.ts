import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import constants from '../../models/constants';
import { logEntryEvent } from '../../services/entryEventsService';
import { buildAdminAuthorization } from '../../services/adminAuthorizationService';
import {
  type AdminAccessModels,
  getAdminAccessSnapshot,
  getGroupAccessSnapshot,
  normalizeGroupIds,
  normalizePermissionRows,
  preservesCapableAdministrator,
} from '../../services/adminAccessService';

type AdminDocument = {
  _id: unknown;
  user?: { id?: unknown; name?: unknown };
  name?: Record<string, unknown>;
  groups?: unknown[];
  permissions?: Array<{ name?: unknown; permit?: unknown }>;
  save: () => Promise<unknown>;
};
type GroupDocument = {
  _id: unknown;
  name?: unknown;
  permissions?: Array<{ name?: unknown; permit?: unknown }>;
  save: () => Promise<unknown>;
};
type MutableModels = {
  Admin: {
    findById: (id: unknown) => { lean: () => Promise<AdminDocument | null>; exec: () => Promise<AdminDocument | null> };
    find: AdminAccessModels['Admin']['find'];
  };
  AdminGroup: {
    findById: (id: unknown) => { lean: () => Promise<GroupDocument | null>; exec: () => Promise<GroupDocument | null> };
    find: AdminAccessModels['AdminGroup']['find'];
  };
  User: AdminAccessModels['User'];
};

function actorId(req: WikitruthRequest): string {
  return String(req.user?._id || req.user?.id || '');
}

async function auditAccessChange(
  req: WikitruthRequest,
  eventType: string,
  objectId: string,
  message: string,
  payload: Record<string, unknown>,
) {
  await logEntryEvent({
    scope: 'privileged',
    eventType,
    objectType: constants.OBJECT_TYPES.user,
    objectName: 'administrator-access',
    objectId,
    actorUserId: actorId(req),
    actorUsername: String(req.user?.username || ''),
    message,
    payload,
  });
}

export function registerAdminAccessRoutes(
  router: Router,
  ensureAdmin: (req: WikitruthRequest, res: WikitruthResponse) => boolean,
  models: MutableModels,
) {
  router.get('/administrators/:id/access', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const access = await getAdminAccessSnapshot(models, String(req.params.id || ''), actorId(req));
    if (!access) {
      res.status(404).json({ success: false, message: 'Administrator not found' });
      return;
    }
    res.json({ success: true, access });
  });

  router.put('/administrators/:id/access', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const [admin, groups] = await Promise.all([
        models.Admin.findById(req.params.id).exec(),
        models.AdminGroup.find({}).lean(),
      ]);
      if (!admin) {
        res.status(404).json({ success: false, message: 'Administrator not found' });
        return;
      }
      if (String(admin.user?.id || '') === actorId(req)) {
        res.status(409).json({ success: false, message: 'You cannot change your own administrator access.' });
        return;
      }
      const permissions = normalizePermissionRows(req.body?.permissions);
      const groupIds = normalizeGroupIds(req.body?.groups, groups.map((group: { _id?: unknown }) => String(group._id || '')));
      const assignedGroups = groups.filter((group: { _id?: unknown }) => groupIds.includes(String(group._id || '')));
      if (buildAdminAuthorization({ _id: admin._id, permissions, groups: groupIds }, assignedGroups).legacySuperAdmin) {
        res.status(400).json({
          success: false,
          message: 'Choose at least one explicit permission or a group with a recognized grant before saving. Legacy full-access fallback cannot be created by this editor.',
        });
        return;
      }
      const safe = await preservesCapableAdministrator(models, {
        admin: { id: String(admin._id), permissions, groups: groupIds },
      });
      if (!safe) {
        res.status(409).json({
          success: false,
          message: 'This change would remove security management from the last active capable administrator.',
        });
        return;
      }
      const before = {
        permissions: (admin.permissions || []).map((row: { name?: unknown; permit?: unknown }) => ({ name: row.name, permit: row.permit })),
        groups: (admin.groups || []).map(String),
      };
      admin.permissions = permissions;
      admin.groups = groupIds;
      await admin.save();
      await auditAccessChange(req, 'admin.access.updated', String(admin._id), 'Administrator access updated', {
        administratorId: String(admin._id),
        before,
        after: { permissions, groups: groupIds },
      });
      res.json({
        success: true,
        access: await getAdminAccessSnapshot(models, String(admin._id), actorId(req)),
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid administrator access' });
    }
  });

  router.get('/groups/:id/access', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    const access = await getGroupAccessSnapshot(models, String(req.params.id || ''));
    if (!access) {
      res.status(404).json({ success: false, message: 'Admin group not found' });
      return;
    }
    res.json({ success: true, access });
  });

  router.put('/groups/:id/access', async (req: WikitruthRequest, res: WikitruthResponse) => {
    if (!ensureAdmin(req, res)) return;
    try {
      const [group, affectedAdmins, allGroups] = await Promise.all([
        models.AdminGroup.findById(req.params.id).exec(),
        models.Admin.find({ groups: req.params.id }).lean(),
        models.AdminGroup.find({}).lean(),
      ]);
      if (!group) {
        res.status(404).json({ success: false, message: 'Admin group not found' });
        return;
      }
      if (affectedAdmins.some((admin: { user?: { id?: unknown } }) => String(admin.user?.id || '') === actorId(req))) {
        res.status(409).json({ success: false, message: 'You cannot change a group that controls your own administrator access.' });
        return;
      }
      const name = String(req.body?.name || '').trim();
      if (!name) throw new Error('Group name is required');
      const permissions = normalizePermissionRows(req.body?.permissions);
      if (permissions.some((row) => !row.permit)) {
        throw new Error('Groups grant permissions; direct administrator overrides are used for explicit denies');
      }
      const prospectiveGroups = allGroups.map((candidate) => String(candidate._id || '') === String(group._id)
        ? { ...candidate, permissions }
        : candidate);
      const createsFallback = affectedAdmins.some((admin) => {
        const assigned = new Set((admin.groups || []).map((value) => String(value || '')));
        return buildAdminAuthorization(admin, prospectiveGroups.filter((candidate) => assigned.has(String(candidate._id || ''))))
          .legacySuperAdmin;
      });
      if (createsFallback) {
        res.status(400).json({
          success: false,
          message: 'This change would return an assigned administrator to the legacy full-access fallback. Add an explicit assignment first.',
        });
        return;
      }
      const safe = await preservesCapableAdministrator(models, {
        group: { id: String(group._id), permissions },
      });
      if (!safe) {
        res.status(409).json({
          success: false,
          message: 'This change would remove security management from the last active capable administrator.',
        });
        return;
      }
      const before = { name: group.name, permissions: group.permissions || [] };
      group.name = name;
      group.permissions = permissions;
      await group.save();
      await auditAccessChange(req, 'admin.group.access.updated', actorId(req), 'Administrator group access updated', {
        groupId: String(group._id),
        before,
        after: { name, permissions },
      });
      res.json({ success: true, access: await getGroupAccessSnapshot(models, String(group._id)) });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid administrator group access' });
    }
  });
}
