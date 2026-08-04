import {
  ADMIN_PERMISSIONS,
  buildAdminAuthorization,
  permissionForAdminRequest,
} from '../../server/src/services/adminAuthorizationService';

describe('admin authorization service', () => {
  it('keeps existing administrators operational until recognized permissions are assigned', () => {
    const authorization = buildAdminAuthorization(
      { _id: 'legacy', permissions: [{ name: 'old.permission', permit: true }] },
      [],
    );

    expect(authorization.legacySuperAdmin).toBe(true);
    expect(authorization.effectivePermissions).toEqual(ADMIN_PERMISSIONS);
  });

  it('combines group permissions with direct overrides', () => {
    const authorization = buildAdminAuthorization(
      {
        _id: 'bounded',
        permissions: [
          { name: 'users.manage', permit: false },
          { name: 'email.manage', permit: true },
        ],
      },
      [{ _id: 'operators', permissions: [{ name: 'users.manage', permit: true }, { name: 'system.read', permit: true }] }],
    );

    expect(authorization.legacySuperAdmin).toBe(false);
    expect(authorization.can('users.manage')).toBe(false);
    expect(authorization.can('email.manage')).toBe(true);
    expect(authorization.can('system.read')).toBe(true);
    expect(authorization.can('backups.restore')).toBe(false);
  });

  it('maps restore separately from backup creation and read-only health', () => {
    expect(permissionForAdminRequest('GET', '/db-backup')).toBe('backups.read');
    expect(permissionForAdminRequest('POST', '/db-backup', { action: 'backup' })).toBe('backups.create');
    expect(permissionForAdminRequest('POST', '/db-backup', { action: 'restore' })).toBe('backups.restore');
    expect(permissionForAdminRequest('GET', '/system-health')).toBe('system.read');
    expect(permissionForAdminRequest('GET', '/operational-telemetry')).toBe('system.read');
    expect(permissionForAdminRequest('PUT', '/operational-telemetry/rules/1')).toBe('security.manage');
    expect(permissionForAdminRequest('POST', '/people/actions')).toBe('users.manage');
  });
});
