import React from 'react';
import userEvent from '@testing-library/user-event';
import SignupPage from './SignupPage';
import { render, screen } from '../../test-utils/render';

const mockNavigate = jest.fn();
const mockSignup = jest.fn();

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
      signup: mockSignup,
    }),
  };
});

describe('Signup flow integration', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSignup.mockReset();
    mockSignup.mockResolvedValue(undefined);
  });

  it('submits signup fields and redirects to home', async () => {
    const user = userEvent.setup();

    render(<SignupPage />, { route: '/signup' });

    await user.type(screen.getByLabelText(/username/i), 'newuser');
    await user.type(screen.getByLabelText(/^email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'secret12');
    await user.type(screen.getByLabelText(/confirm password/i), 'secret12');
    await user.click(screen.getByLabelText(/i agree to the terms/i));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockSignup).toHaveBeenCalledWith('newuser', 'newuser@example.com', 'secret12');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
