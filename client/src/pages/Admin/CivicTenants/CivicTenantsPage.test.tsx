import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import civicApi from '../../../services/api/civic';
import type { CivicTenant } from '../../../types/civic';
import CivicTenantsPage from './CivicTenantsPage';

jest.mock('../../../services/api/civic', () => ({
  __esModule: true,
  default: { platformTenants: jest.fn(), bootstrapTenants: jest.fn(), createTenant: jest.fn(), updateTenant: jest.fn() },
}));
jest.mock('../../../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const mockedApi = civicApi as jest.Mocked<typeof civicApi>;
const tenant = {
  tenantId: 'fix-example', status: 'active', countryCode: 'XZ', title: 'Fix Example', navTitle: 'FixXZ', slogan: '', domains: ['fix.example'],
  branding: { logoIcon: '', favicon: '', primaryColor: '#123456', accentColor: '#abcdef', surfaceColor: '#f0eadc', fontFamily: '' },
  localization: { defaultLocale: 'en-XZ', supportedLocales: ['en-XZ'], timezone: 'UTC', currency: 'XZD' },
  geography: { levels: [{ key: 'district', label: 'District' }], addressFields: ['district'] }, sections: [], featureFlags: {},
  moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared',
} as CivicTenant;

describe('CivicTenantsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.platformTenants.mockResolvedValue({ tenants: [tenant] });
    mockedApi.bootstrapTenants.mockResolvedValue({ success: true, count: 1 });
  });

  it('lists configured tenants and loads one into the editor', async () => {
    const user = userEvent.setup();
    render(<CivicTenantsPage />, { route: '/admin/civic-tenants' });
    await user.click(await screen.findByRole('button', { name: /fix example/i }));
    expect(screen.getByLabelText(/tenant id/i)).toHaveValue('fix-example');
    expect(screen.getByLabelText(/public title/i)).toHaveValue('Fix Example');
    expect(screen.getByRole('button', { name: /update tenant/i })).toBeInTheDocument();
  });

  it('bootstraps built-in tenants and refreshes the list', async () => {
    const user = userEvent.setup();
    render(<CivicTenantsPage />);
    await user.click(await screen.findByRole('button', { name: /bootstrap built-ins/i }));
    await waitFor(() => expect(mockedApi.bootstrapTenants).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Bootstrapped 1');
  });
});
