import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import { useCivicTenant } from '../../context/CivicTenantContext';
import civicApi from '../../services/api/civic';
import CivicResponsesPanel from './CivicResponsesPanel';

jest.mock('../../context/CivicTenantContext', () => ({ useCivicTenant: jest.fn() }));
jest.mock('../../services/api/civic', () => ({ __esModule: true, default: { responses: jest.fn(), submitResponse: jest.fn(), reviewResponse: jest.fn() } }));
const mockedContext = useCivicTenant as jest.MockedFunction<typeof useCivicTenant>;
const mockedApi = civicApi as jest.Mocked<typeof civicApi>;

describe('CivicResponsesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContext.mockReturnValue({
      tenant: { localization: { defaultLocale: 'en-PH', timezone: 'Asia/Manila' } },
      hasRole: (...roles: string[]) => roles.includes('contributor'),
    } as ReturnType<typeof useCivicTenant>);
    mockedApi.responses.mockResolvedValue({ responses: [], count: 0 });
    mockedApi.submitResponse.mockResolvedValue({ response: {} as never });
  });

  it('submits subject responses into tenant review rather than publishing directly', async () => {
    const user = userEvent.setup(); render(<CivicResponsesPanel recordId="record-1" />);
    await user.click(await screen.findByRole('button', { name: /Submit response/i }));
    await user.type(screen.getByLabelText('Claimed relationship to this record'), 'Agency representative');
    await user.type(screen.getByLabelText('Title'), 'Official response');
    await user.type(screen.getByLabelText('Response or requested correction'), 'This response provides the agency position and supporting context.');
    await user.click(screen.getByRole('button', { name: /Submit for review/i }));
    await waitFor(() => expect(mockedApi.submitResponse).toHaveBeenCalledWith('record-1', expect.objectContaining({
      requestType: 'subject_response', claimedRelationship: 'Agency representative',
    })));
  });
});
