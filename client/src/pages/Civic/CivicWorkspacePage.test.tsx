import React from 'react';
import { Route, Routes } from 'react-router';
import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import { useCivicTenant } from '../../context/CivicTenantContext';
import civicApi from '../../services/api/civic';
import type { CivicTenant } from '../../types/civic';
import CivicWorkspacePage from './CivicWorkspacePage';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/CivicTenantContext', () => ({ useCivicTenant: jest.fn() }));
jest.mock('../../services/api/civic', () => ({
  __esModule: true,
  default: {
    overview: jest.fn(),
    list: jest.fn(),
    compareCandidates: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseCivicTenant = useCivicTenant as jest.MockedFunction<typeof useCivicTenant>;
const mockedCivicApi = civicApi as jest.Mocked<typeof civicApi>;

const tenant = {
  tenantId: 'fix-example',
  status: 'active',
  countryCode: 'XZ',
  title: 'Fix Example',
  navTitle: 'FixXZ',
  slogan: 'Example accountability',
  domains: ['fix.example'],
  branding: {
    logoIcon: '',
    favicon: '',
    primaryColor: '#123456',
    accentColor: '#ba2d2d',
    surfaceColor: '#f5f1e8',
    fontFamily: '',
  },
  localization: {
    defaultLocale: 'en-XZ',
    supportedLocales: ['en-XZ'],
    timezone: 'UTC',
    currency: 'XZD',
  },
  geography: { levels: [{ key: 'region', label: 'Region' }], addressFields: ['region'] },
  sections: [
    {
      slug: 'people',
      title: 'People',
      description: 'Public people',
      icon: 'users',
      kinds: ['person'],
      createKinds: ['person'],
      enabled: true,
    },
    {
      slug: 'projects',
      title: 'Public Projects',
      description: 'Track projects',
      icon: 'building',
      kinds: ['project'],
      createKinds: ['project'],
      enabled: true,
    },
  ],
  featureFlags: {},
  extensionSchemas: {},
  moderationPolicyVersion: '1',
  electionSystem: '',
  deploymentMode: 'shared',
} as CivicTenant;

describe('CivicWorkspacePage navigation', () => {
  const scrollIntoView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    mockedUseCivicTenant.mockReturnValue({
      tenant,
      actor: { authenticated: false, tenantId: 'fix-example', userId: null, roles: ['reader'] },
      jurisdictions: [],
      hasRole: () => false,
      refreshJurisdictions: jest.fn(),
      refreshActor: jest.fn(),
    });
    mockedCivicApi.overview.mockResolvedValue({
      counts: {
        institution: 0,
        office: 0,
        person: 0,
        project: 0,
        observation: 0,
        incident: 0,
        action: 0,
        election: 0,
        candidate: 0,
        history: 0,
      },
      recent: [],
      urgent: [],
      kinds: [],
      statuses: [],
      stages: [],
    });
    mockedCivicApi.list.mockResolvedValue({ records: [], count: 0 });
  });

  it('marks and centers the active section while exposing the overflow hint', async () => {
    render(
      <Routes>
        <Route path="/civic/:section" element={<CivicWorkspacePage />} />
      </Routes>,
      { route: '/civic/projects' }
    );

    const active = screen.getByRole('link', { name: /public projects/i });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(/scroll horizontally/i)).toHaveClass('sr-only');
    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center',
      })
    );
  });
});
