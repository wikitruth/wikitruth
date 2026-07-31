import React from 'react';
import { render, screen } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { Route, Routes, useLocation } from 'react-router-dom';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

function authState(
  overrides: Partial<ReturnType<typeof useAuth>> = {}
): ReturnType<typeof useAuth> {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    activeRole: 'reader',
    setActiveRole: jest.fn(),
    availableRoles: ['reader'],
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    ...overrides,
  };
}

describe('ProtectedRoute', () => {
  it('redirects directly to sign in without mounting protected content', () => {
    mockedUseAuth.mockReturnValue(authState());

    render(
      <Routes>
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute>
              <div>Secret form</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/login" element={<LocationDisplay />} />
      </Routes>,
      { route: '/notifications?view=unread' }
    );

    expect(screen.queryByText('Secret form')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/login?returnUrl=%2Fnotifications%3Fview%3Dunread&intent=protected',
    );
  });

  it('rejects an authenticated user without the required role', () => {
    mockedUseAuth.mockReturnValue(
      authState({
        user: { _id: 'user-1', username: 'reader', roles: {} },
        isAuthenticated: true,
      })
    );

    render(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin form</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.queryByText('Admin form')).not.toBeInTheDocument();
  });

  it('mounts content when any allowed role is present', () => {
    mockedUseAuth.mockReturnValue(
      authState({
        user: { _id: 'reviewer-1', username: 'reviewer', roles: { reviewer: true } },
        isAuthenticated: true,
      })
    );

    render(
      <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
        <div>Moderation queue</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Moderation queue')).toBeInTheDocument();
  });
});
