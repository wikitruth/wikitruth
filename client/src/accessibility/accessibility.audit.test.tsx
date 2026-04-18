import React from 'react';
import { axe } from 'jest-axe';
import Header from '../components/Layout/Header';
import SocialLoginButtons from '../components/Auth/SocialLoginButtons';
import { ThemeProvider } from '../context/ThemeContext';
import { render } from '../test-utils/render';

jest.mock('../context/AuthContext', () => {
  const actual = jest.requireActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader', 'contributor'],
      signup: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    }),
  };
});

describe('accessibility audit', () => {
  it('header has no obvious axe violations', async () => {
    const { container } = render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('social login buttons have no obvious axe violations', async () => {
    const { container } = render(<SocialLoginButtons />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
