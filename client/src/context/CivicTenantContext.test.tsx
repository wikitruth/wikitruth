import React from 'react';
import { render, screen, waitFor } from '../test-utils/render';
import civicApi from '../services/api/civic';
import type { CivicTenant } from '../types/civic';
import { CivicTenantProvider, useCivicTenant } from './CivicTenantContext';
import { civicSectionsForTenant } from '../pages/Civic/civicSections';

jest.mock('../services/api/civic', () => ({
  __esModule: true,
  default: { tenant: jest.fn(), jurisdictions: jest.fn() },
}));

const mockedApi = civicApi as jest.Mocked<typeof civicApi>;
const tenant: CivicTenant = {
  tenantId: 'fix-example', status: 'active', countryCode: 'XZ', title: 'Fix Example', navTitle: 'FixXZ', slogan: 'Example accountability',
  domains: ['fix.example'], branding: { logoIcon: '/example.png', favicon: '', primaryColor: '#123456', accentColor: '#abcdef', surfaceColor: '#f0eadc', fontFamily: 'Georgia' },
  localization: { defaultLocale: 'en-XZ', supportedLocales: ['en-XZ'], timezone: 'UTC', currency: 'XZD' },
  geography: { levels: [{ key: 'district', label: 'District' }], addressFields: ['district'] },
  sections: [{ slug: 'projects', title: 'Public Works', description: 'Track public works.', icon: 'building', kinds: ['project'], createKinds: ['project'], enabled: true }],
  featureFlags: { knowledgeLinks: true }, moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared',
};

const Consumer = () => {
  const value = useCivicTenant();
  return <div data-testid="tenant">{value.tenant.title}:{value.jurisdictions[0]?.name}</div>;
};

describe('CivicTenantProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.tenant.mockResolvedValue({ tenant });
    mockedApi.jurisdictions.mockResolvedValue({ jurisdictions: [{ _id: 'j1', tenantId: 'fix-example', code: 'D1', countryCode: 'XZ', levelKey: 'district', name: 'North District', friendlyUrl: 'north-district' }], count: 1 });
  });

  it('loads tenant and jurisdiction configuration in parallel and applies scoped branding', async () => {
    const { container } = render(<CivicTenantProvider><Consumer /></CivicTenantProvider>);
    await waitFor(() => expect(screen.getByTestId('tenant')).toHaveTextContent('Fix Example:North District'));
    expect(mockedApi.tenant).toHaveBeenCalledTimes(1);
    expect(mockedApi.jurisdictions).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.wt-civic-tenant')).toHaveStyle({ '--civic-primary': '#123456', '--civic-accent': '#abcdef' });
  });

  it('uses tenant-defined section names and order', () => {
    expect(civicSectionsForTenant(tenant).map((section) => section.title)).toEqual(['Public Works']);
  });
});
