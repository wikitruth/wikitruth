import React from 'react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { render, screen } from '../../test-utils/render';

const mockNavigate = jest.fn();
const mockLogin = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
    }),
  };
});

describe('Login flow integration', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
    mockLogin.mockResolvedValue(undefined);
  });

  it('submits credentials and redirects to home', async () => {
    const user = userEvent.setup();

    render(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/username or email/i), 'demo-user');
    await user.type(screen.getByLabelText(/^password/i), 'secret12');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith('demo-user', 'secret12');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
