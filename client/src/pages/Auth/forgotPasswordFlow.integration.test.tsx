import React from 'react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from './ForgotPasswordPage';
import authApi from '../../services/api/auth';
import { render, screen } from '../../test-utils/render';

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    forgotPassword: jest.fn(),
  },
}));

describe('Forgot password flow integration', () => {
  const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

  beforeEach(() => {
    mockedAuthApi.forgotPassword.mockReset();
    mockedAuthApi.forgotPassword.mockResolvedValue({
      success: true,
      message: 'If an account exists, reset instructions were generated.',
      debug: {
        email: 'newuser@example.com',
        token: 'debug-token',
      },
    });
  });

  it('requests reset token and renders response message', async () => {
    const user = userEvent.setup();

    render(<ForgotPasswordPage />, { route: '/forgot-password' });

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(mockedAuthApi.forgotPassword).toHaveBeenCalledWith('newuser@example.com');
    expect(screen.getByText(/reset instructions were generated/i)).toBeInTheDocument();
    expect(screen.getByText(/dev token/i)).toBeInTheDocument();
  });
});
