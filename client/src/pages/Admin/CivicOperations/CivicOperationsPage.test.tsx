import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import { useCivicTenant } from '../../../context/CivicTenantContext';
import civicApi from '../../../services/api/civic';
import CivicOperationsPage from './CivicOperationsPage';

jest.mock('../../../context/CivicTenantContext', () => ({ useCivicTenant: jest.fn() }));
jest.mock('../../../services/api/civic', () => ({
  __esModule: true,
  default: {
    adminMemberships: jest.fn(), searchMembershipCandidates: jest.fn(), updateMembership: jest.fn(),
    createJurisdiction: jest.fn(), updateJurisdiction: jest.fn(), deactivateJurisdiction: jest.fn(),
  },
}));
jest.mock('../../../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const mockedContext = useCivicTenant as jest.MockedFunction<typeof useCivicTenant>;
const mockedApi = civicApi as jest.Mocked<typeof civicApi>;
const refreshJurisdictions = jest.fn().mockResolvedValue(undefined);
const tenant = {
  tenantId: 'fix-example', status: 'active' as const, countryCode: 'XZ', title: 'Fix Example', navTitle: 'FixXZ', slogan: '', domains: ['fix.example'],
  branding: { logoIcon: '', favicon: '', primaryColor: '#123456', accentColor: '#abcdef', surfaceColor: '#f0eadc', fontFamily: '' },
  localization: { defaultLocale: 'en-XZ', supportedLocales: ['en-XZ'], timezone: 'UTC', currency: 'XZD' },
  geography: { levels: [{ key: 'district', label: 'District' }], addressFields: ['district'] }, sections: [], featureFlags: {}, extensionSchemas: {}, moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared' as const,
};

describe('CivicOperationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContext.mockReturnValue({
      tenant,
      actor: { authenticated: true, tenantId: tenant.tenantId, userId: 'admin-1', roles: ['admin'] },
      jurisdictions: [{ _id: 'j1', tenantId: tenant.tenantId, code: 'D1', countryCode: 'XZ', levelKey: 'district', name: 'North District', friendlyUrl: 'north-district' }],
      hasRole: (...roles) => roles.includes('admin'),
      refreshJurisdictions,
      refreshActor: jest.fn().mockResolvedValue(undefined),
    });
    mockedApi.adminMemberships.mockResolvedValue({ memberships: [{ _id: 'm1', tenantId: tenant.tenantId, userId: 'user-1', roles: ['contributor'], active: true, user: { _id: 'user-1', username: 'citizen', email: 'citizen@example.test' } }] });
    mockedApi.updateMembership.mockResolvedValue({ membership: { _id: 'm1', tenantId: tenant.tenantId, userId: 'user-1', roles: ['contributor'], active: true } });
    mockedApi.createJurisdiction.mockResolvedValue({ jurisdiction: { _id: 'j2', tenantId: tenant.tenantId, code: 'D2', countryCode: 'XZ', levelKey: 'district', name: 'South District', friendlyUrl: 'south-district' } });
  });

  it('edits tenant-scoped membership roles', async () => {
    const user = userEvent.setup();
    render(<CivicOperationsPage />);
    await user.click(await screen.findByRole('button', { name: /citizen/i }));
    await user.click(screen.getByRole('checkbox', { name: /reviewer/i }));
    await user.click(screen.getByRole('button', { name: /save tenant access/i }));
    await waitFor(() => expect(mockedApi.updateMembership).toHaveBeenCalledWith('user-1', {
      roles: ['contributor', 'reviewer'], active: true,
    }));
  });

  it('creates a configured jurisdiction and refreshes the hierarchy', async () => {
    const user = userEvent.setup();
    render(<CivicOperationsPage />);
    await screen.findByRole('heading', { name: /fix example operations/i });
    await user.type(screen.getByLabelText(/^code$/i), 'D2');
    await user.type(screen.getByLabelText(/^name$/i), 'South District');
    await user.click(screen.getByRole('button', { name: /create jurisdiction/i }));
    await waitFor(() => expect(mockedApi.createJurisdiction).toHaveBeenCalledWith(expect.objectContaining({
      code: 'D2', levelKey: 'district', name: 'South District', metadata: {},
    })));
    expect(refreshJurisdictions).toHaveBeenCalledTimes(1);
  });
});
