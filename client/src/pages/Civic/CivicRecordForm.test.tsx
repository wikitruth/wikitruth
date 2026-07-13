import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import civicApi from '../../services/api/civic';
import type { CivicRecord, CivicTenant } from '../../types/civic';
import CivicRecordForm from './CivicRecordForm';

jest.mock('../../services/api/civic', () => ({ __esModule: true, default: { create: jest.fn(), update: jest.fn() } }));

const mockedApi = civicApi as jest.Mocked<typeof civicApi>;
const tenant = {
  tenantId: 'fixtheph', status: 'active', countryCode: 'PH', title: 'FixPH', navTitle: 'FixPH', slogan: '', domains: ['fix.test'],
  branding: { logoIcon: '', favicon: '', primaryColor: '#123456', accentColor: '#abcdef', surfaceColor: '#ffffff', fontFamily: '' },
  localization: { defaultLocale: 'en-PH', supportedLocales: ['en-PH'], timezone: 'Asia/Manila', currency: 'PHP' },
  geography: { levels: [{ key: 'region', label: 'Region' }, { key: 'city', label: 'City' }], addressFields: ['region', 'city'] }, sections: [], featureFlags: {}, extensionSchemas: {}, moderationPolicyVersion: '1', electionSystem: '', deploymentMode: 'shared',
} as CivicTenant;
const record = {
  _id: 'record-1', tenantId: 'fixtheph', countryCode: 'PH', kind: 'project', title: 'Existing project', friendlyUrl: 'existing-project', status: 'pending', stage: 'reported', severity: 'info',
  summary: 'Existing summary', description: 'Existing details', project: { budget: 1000, currency: 'PHP', contractor: 'Builder One', progressPercent: 10 }, location: { region: 'NCR', city: 'Manila' },
} as CivicRecord;

describe('CivicRecordForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates an existing record without attempting to change its kind', async () => {
    const user = userEvent.setup();
    const updated = { ...record, title: 'Updated project' };
    mockedApi.update.mockResolvedValue({ record: updated });
    const onUpdated = jest.fn();
    render(<CivicRecordForm record={record} kinds={['project']} tenant={tenant} jurisdictions={[]} onUpdated={onUpdated} />);
    expect(screen.getByLabelText(/record type/i)).toBeDisabled();
    await user.clear(screen.getByLabelText(/^title$/i));
    await user.type(screen.getByLabelText(/^title$/i), 'Updated project');
    await user.clear(screen.getByLabelText(/^city$/i));
    await user.click(screen.getByRole('button', { name: /save record details/i }));
    await waitFor(() => expect(mockedApi.update).toHaveBeenCalledWith('record-1', expect.objectContaining({
      location: expect.objectContaining({ city: '' }),
    })));
    expect(mockedApi.update).toHaveBeenCalledWith('record-1', expect.not.objectContaining({ kind: expect.anything() }));
    expect(onUpdated).toHaveBeenCalledWith(updated);
  });
});
