import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test-utils/render';
import VerdictsPage from './VerdictsPage';
import moderationApi from '../../../services/api/moderation';
import { useAuth } from '../../../context/AuthContext';

jest.mock('../../../services/api/moderation', () => ({
  __esModule: true,
  default: {
    listVerdicts: jest.fn(),
    bulkUpdateVerdicts: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedModerationApi = moderationApi as jest.Mocked<typeof moderationApi>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('VerdictsPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: {
        _id: 'admin-1',
        username: 'admin',
        roles: { admin: 'role-1' },
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'admin',
      setActiveRole: jest.fn(),
      availableRoles: ['admin'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    mockedModerationApi.listVerdicts.mockResolvedValue({
      success: true,
      entries: [
        {
          _id: 'topic-1',
          objectName: 'topic',
          objectType: 1,
          title: 'Climate Policy',
          verdict: { status: 0 },
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      verdictStatuses: [
        { code: 0, text: 'unverified' },
        { code: 1, text: 'verified' },
      ],
    });
    mockedModerationApi.bulkUpdateVerdicts.mockResolvedValue({
      success: true,
      results: [{ id: 'topic-1', success: true }],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads verdict queue and renders entry row', async () => {
    render(<VerdictsPage />);

    await waitFor(() => expect(mockedModerationApi.listVerdicts).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Climate Policy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply to selected/i })).toBeInTheDocument();
  });

  it('applies filters and reloads queue', async () => {
    const user = userEvent.setup();
    render(<VerdictsPage />);
    await waitFor(() => expect(mockedModerationApi.listVerdicts).toHaveBeenCalledTimes(1));

    await user.selectOptions(screen.getByLabelText(/entity type/i), '1');
    await user.selectOptions(screen.getByLabelText(/current verdict/i), '1');
    await user.type(screen.getByLabelText(/search title/i), 'climate');
    await user.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() =>
      expect(mockedModerationApi.listVerdicts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          objectType: 1,
          status: 1,
          q: 'climate',
        }),
      ),
    );
  });

  it('bulk-updates selected rows', async () => {
    const user = userEvent.setup();
    render(<VerdictsPage />);

    await waitFor(() => expect(mockedModerationApi.listVerdicts).toHaveBeenCalledTimes(1));

    await user.click(await screen.findByLabelText(/select climate policy/i));
    await user.selectOptions(screen.getByLabelText(/bulk verdict status/i), '1');
    await user.type(screen.getByLabelText(/required final-say reason/i), 'Reviewed evidence requires an exceptional correction.');
    await user.click(screen.getByLabelText(/acknowledge these changes/i));
    await user.click(screen.getByRole('button', { name: /apply to selected/i }));

    await waitFor(() =>
      expect(mockedModerationApi.bulkUpdateVerdicts).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'topic-1',
          type: 1,
          status: 1,
          overrideReason: 'Reviewed evidence requires an exceptional correction.',
          acknowledgeOverride: true,
        }),
      ]),
    );
    expect(await screen.findByText(/applied bulk verdict update/i)).toBeInTheDocument();
  });
});
