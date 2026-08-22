jest.mock('../../server/src/services/civicTenantService', () => ({
  getCivicTenant: jest.fn(async (tenantId: string) => tenantId === 'fixtest' ? ({
    tenantId: 'fixtest', status: 'active', moderationPolicyVersion: 'test-v1',
    sections: [{ enabled: true, createKinds: ['incident'] }],
    extensionSchemas: {
      incident: { fields: [{ key: 'reference_code', label: 'Reference code', type: 'text', required: true }] },
    },
  }) : null),
}));

import { validateAgentCivicDraft } from '../../server/src/services/agentCivicValidation';

describe('agent civic dry-run validation', () => {
  it('uses canonical kind and tenant extension schemas', async () => {
    const valid = await validateAgentCivicDraft('fixtest', {
      kind: 'incident', title: 'Road hazard report', extensions: { reference_code: 'DPWH-42' },
    }, ['fixtest']);
    expect(valid.errors).toEqual([]);

    const invalid = await validateAgentCivicDraft('fixtest', {
      kind: 'incident', title: 'Road hazard report', extensions: {},
    }, ['fixtest']);
    expect(invalid.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'extensions.reference_code' }),
    ]));
  });

  it('rejects out-of-policy tenants and disabled record kinds', async () => {
    const restricted = await validateAgentCivicDraft('fixtest', {
      kind: 'incident', title: 'Road hazard report', extensions: { reference_code: 'DPWH-42' },
    }, ['another-tenant']);
    expect(restricted.errors[0]?.field).toBe('tenantId');

    const disabled = await validateAgentCivicDraft('fixtest', {
      kind: 'project', title: 'Bridge project', extensions: {},
    }, ['fixtest']);
    expect(disabled.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'payload.kind' }),
    ]));
  });
});
