import {
  buildAccessSnapshot,
  countCapableActiveAdministrators,
  normalizeGroupIds,
  normalizePermissionRows,
} from '../../server/src/services/adminAccessService';

describe('administrator access management', () => {
  it('rejects unknown and duplicate catalog permissions', () => {
    expect(() => normalizePermissionRows([{ name: 'users.manage', permit: true }])).not.toThrow();
    expect(() => normalizePermissionRows([{ name: 'users.destroy', permit: true }])).toThrow(/unknown administrator permission/i);
    expect(() => normalizePermissionRows([
      { name: 'users.manage', permit: true },
      { name: 'users.manage', permit: false },
    ])).toThrow(/duplicate/i);
  });

  it('validates group assignments against current groups', () => {
    expect(normalizeGroupIds(['ops', 'ops', 'reviewers'], ['ops', 'reviewers']))
      .toEqual(['ops', 'reviewers']);
    expect(() => normalizeGroupIds(['unknown'], ['ops'])).toThrow(/unknown administrator group/i);
  });

  it('shows direct deny over inherited group grant in the access snapshot', () => {
    const snapshot = buildAccessSnapshot({
      _id: 'admin-1',
      user: { id: 'user-1', name: 'ada' },
      groups: ['operators'],
      permissions: [{ name: 'users.manage', permit: false }],
    }, [{
      _id: 'operators', name: 'Operators', permissions: [
        { name: 'users.manage', permit: true },
        { name: 'system.read', permit: true },
      ],
    }], 'user-2');

    const users = snapshot.catalog.find((row) => row.name === 'users.manage');
    expect(users).toMatchObject({ direct: 'deny', effective: false, inheritedFrom: ['Operators'] });
    expect(snapshot.catalog.find((row) => row.name === 'system.read'))
      .toMatchObject({ direct: 'inherit', effective: true, inheritedFrom: ['Operators'] });
  });

  it('detects a mutation that removes the last active security-capable administrator', () => {
    const input = {
      admins: [{
        _id: 'admin-1', user: { id: 'user-1' }, groups: ['security'],
        permissions: [{ name: 'users.manage', permit: true }],
      }],
      groups: [{ _id: 'security', permissions: [{ name: 'security.manage', permit: true }] }],
      activeUserIds: new Set(['user-1']),
    };
    expect(countCapableActiveAdministrators(input)).toBe(1);
    expect(countCapableActiveAdministrators({
      ...input,
      groupOverride: { id: 'security', permissions: [] },
    })).toBe(0);
  });

  it('does not count inactive linked users as capable administrators', () => {
    expect(countCapableActiveAdministrators({
      admins: [{
        _id: 'admin-1', user: { id: 'inactive-user' }, permissions: [{ name: 'admin.access', permit: true }],
      }],
      groups: [],
      activeUserIds: new Set(),
    })).toBe(0);
  });
});
