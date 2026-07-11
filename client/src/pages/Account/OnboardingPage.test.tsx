import React from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import authApi from '../../services/api/auth';
import OnboardingPage from './OnboardingPage';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    onboarding: jest.fn(),
    completeOnboarding: jest.fn(),
  },
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const track = {
  key: 'contributor' as const,
  title: 'Contributor Foundations',
  policyVersion: '2026-07-11',
  acknowledgements: [
    'search_before_creating',
    'separate_fact_and_ethics',
    'record_source_provenance',
    'use_change_requests_for_protected_content',
  ],
  eligible: true,
  completed: false,
};

describe('OnboardingPage', () => {
  const updateUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { _id: 'user-1', username: 'alice' },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser,
    });
    mockedAuthApi.onboarding.mockResolvedValue({ success: true, tracks: [track] });
    mockedAuthApi.completeOnboarding.mockResolvedValue({
      success: true,
      tracks: [{ ...track, completed: true }],
      user: { _id: 'user-1', username: 'alice', onboarding: { contributor: { completed: true } } },
      activeRole: 'contributor',
    });
  });

  it('requires every responsibility before recording completion', async () => {
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const button = await screen.findByRole('button', { name: /complete contributor foundations/i });
    expect(button).toBeDisabled();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox);
    }
    expect(button).toBeEnabled();
    await user.click(button);

    await waitFor(() => expect(mockedAuthApi.completeOnboarding).toHaveBeenCalledWith(
      'contributor',
      track.acknowledgements,
    ));
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ username: 'alice' }));
    expect(await screen.findByText(/roles have been refreshed/i)).toBeInTheDocument();
  });
});
