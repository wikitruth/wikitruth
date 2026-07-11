import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import moderationApi from '../../services/api/moderation';
import ArtifactQualityPanel from './ArtifactQualityPanel';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api/moderation', () => ({
  __esModule: true,
  default: { reviewArtifactQuality: jest.fn() },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedApi = moderationApi as jest.Mocked<typeof moderationApi>;

function authValue(reviewer: boolean) {
  return {
    user: { _id: 'user-1', username: 'reviewer', roles: reviewer ? { reviewer: true } : {} },
    isAuthenticated: true,
    isLoading: false,
    activeRole: (reviewer ? 'reviewer' : 'reader') as 'reviewer' | 'reader',
    setActiveRole: jest.fn(),
    availableRoles: [reviewer ? 'reviewer' as const : 'reader' as const],
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  };
}

describe('ArtifactQualityPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows review evidence without exposing controls to readers', () => {
    mockedUseAuth.mockReturnValue(authValue(false));
    render(<ArtifactQualityPanel artifactId="artifact-1" initialQuality={{ total: 14, notes: 'Reviewed source.' }} />);

    expect(screen.getByText('14/20')).toBeInTheDocument();
    expect(screen.getByText('Reviewed source.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save quality review/i })).not.toBeInTheDocument();
  });

  it('lets reviewers submit all five dimensions', async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue(authValue(true));
    mockedApi.reviewArtifactQuality.mockResolvedValue({
      success: true,
      sourceQuality: {
        identity: 4,
        proximity: 3,
        integrity: 4,
        recency: 2,
        reproducibility: 3,
        total: 16,
        reviewUsername: 'reviewer',
      },
    });
    render(<ArtifactQualityPanel artifactId="artifact-1" />);

    await user.selectOptions(screen.getByLabelText('Identity'), '4');
    await user.selectOptions(screen.getByLabelText('Proximity'), '3');
    await user.selectOptions(screen.getByLabelText('Integrity'), '4');
    await user.selectOptions(screen.getByLabelText('Recency'), '2');
    await user.selectOptions(screen.getByLabelText('Reproducibility'), '3');
    await user.type(screen.getByLabelText(/review notes/i), 'Independently reviewed source.');
    await user.click(screen.getByRole('button', { name: /save quality review \(16\/20\)/i }));

    await waitFor(() => expect(mockedApi.reviewArtifactQuality).toHaveBeenCalledWith(
      { key: 'artifact', id: 'artifact-1' },
      {
        scores: { identity: 4, proximity: 3, integrity: 4, recency: 2, reproducibility: 3 },
        notes: 'Independently reviewed source.',
      },
    ));
    expect(screen.getByText('16/20')).toBeInTheDocument();
  });
});
