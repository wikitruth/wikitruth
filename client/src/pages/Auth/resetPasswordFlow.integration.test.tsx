import React from 'react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from './ResetPasswordPage';
import authApi from '../../services/api/auth';
import { render, screen } from '../../test-utils/render';

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    resetPassword: jest.fn(),
  },
}));

describe('Reset password flow integration', () => {
  const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

  beforeEach(() => {
    mockedAuthApi.resetPassword.mockReset();
    mockedAuthApi.resetPassword.mockResolvedValue({
      success: true,
      message: 'Password updated successfully',
    });
  });

  it('submits reset token payload and renders success', async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />, {
      route: '/reset-password?email=newuser@example.com&token=reset-token',
    });

    await user.type(screen.getByLabelText(/new password/i), 'secret12');
    await user.type(screen.getByLabelText(/confirm password/i), 'secret12');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(mockedAuthApi.resetPassword).toHaveBeenCalledWith('newuser@example.com', 'reset-token', 'secret12');
    expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
  });
});
