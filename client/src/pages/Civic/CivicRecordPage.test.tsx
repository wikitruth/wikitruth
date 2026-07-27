import React from 'react';
import { render, screen } from '../../test-utils/render';
import { useCivicTenant } from '../../context/CivicTenantContext';
import civicApi from '../../services/api/civic';
import type { CivicRecord, CivicTenantRole } from '../../types/civic';
import CivicRecordPage from './CivicRecordPage';

jest.mock('../../context/CivicTenantContext', () => ({ useCivicTenant: jest.fn() }));
jest.mock('../../services/api/civic', () => ({ __esModule: true, default: { entry: jest.fn(), transition: jest.fn(), addLink: jest.fn(), links: jest.fn(), removeLink: jest.fn(), update: jest.fn(), responses: jest.fn(), submitResponse: jest.fn(), reviewResponse: jest.fn() } }));
jest.mock('../../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));

const mockedContext = useCivicTenant as jest.MockedFunction<typeof useCivicTenant>;
const mockedApi = civicApi as jest.Mocked<typeof civicApi>;
const record = {
  _id: '66f000000000000000000001', tenantId: 'fixtheph', countryCode: 'PH', kind: 'incident', title: 'Reported incident', friendlyUrl: 'reported-incident', summary: 'Summary', status: 'pending', stage: 'reported', severity: 'high', createUserId: 'user-1', history: [],
} as CivicRecord;

function contextFor(roles: CivicTenantRole[], userId = 'user-1') {
  return {
    tenant: {
      tenantId: 'fixtheph', status: 'active' as const, countryCode: 'PH', title: 'FixPH', navTitle: 'FixPH', slogan: '', domains: ['fix.test'], branding: { logoIcon: '', favicon: '', primaryColor: '#123456', accentColor: '#abcdef', surfaceColor: '#ffffff', fontFamily: '' }, localization: { defaultLocale: 'en-PH', supportedLocales: ['en-PH'], timezone: 'Asia/Manila', currency: 'PHP' }, geography: { levels: [{ key: 'region', label: 'Region' }], addressFields: ['region'] }, sections: [{ slug: 'incidents', title: 'Incidents', description: '', icon: 'bolt', kinds: ['incident' as const], createKinds: ['incident' as const], enabled: true }], featureFlags: { knowledgeLinks: true }, extensionSchemas: {}, moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared' as const,
    },
    jurisdictions: [],
    actor: { authenticated: true, tenantId: 'fixtheph', userId, roles },
    hasRole: (...accepted: CivicTenantRole[]) => accepted.some((role) => roles.includes(role)),
    refreshJurisdictions: jest.fn().mockResolvedValue(undefined),
    refreshActor: jest.fn().mockResolvedValue(undefined),
  };
}

describe('CivicRecordPage tenant capabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.entry.mockResolvedValue({ record, links: [], children: [], related: [] });
    mockedApi.responses.mockResolvedValue({ responses: [], count: 0 });
  });

  it('shows edit and knowledge controls to the tenant contributor who owns the record', async () => {
    mockedContext.mockReturnValue(contextFor(['contributor']));
    render(<CivicRecordPage />, { route: `/civic/records/${record._id}` });
    expect(await screen.findByRole('button', { name: /edit record/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /link wikitruth knowledge/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /record a decision/i })).not.toBeInTheDocument();
  });

  it('shows lifecycle controls to a tenant reviewer without exposing contributor editing', async () => {
    mockedContext.mockReturnValue(contextFor(['reviewer'], 'reviewer-1'));
    render(<CivicRecordPage />, { route: `/civic/records/${record._id}` });
    expect(await screen.findByRole('heading', { name: /record a decision/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit record/i })).not.toBeInTheDocument();
  });
});
