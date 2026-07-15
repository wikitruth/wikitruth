import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../LoadingSpinner';

export type ProtectedRole = 'admin' | 'reviewer' | 'screener';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: ProtectedRole[];
};

function hasAllowedRole(
  roles: { admin?: string; reviewer?: boolean; screener?: boolean } | undefined,
  allowedRoles: ProtectedRole[]
): boolean {
  return allowedRoles.some(role => Boolean(roles?.[role]));
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner message="Checking access..." />;
  }

  if (!isAuthenticated) {
    const returnUrl = `${location.pathname}${location.search}`;
    return (
      <div className="alert alert-info wt-protected-route-message" role="status">
        <h3>Sign in required</h3>
        <p>This page contains account or operational information.</p>
        <Link className="btn btn-primary" to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}>
          <i className="fa fa-sign-in" aria-hidden="true"></i> Sign In
        </Link>
      </div>
    );
  }

  if (allowedRoles.length > 0 && !hasAllowedRole(user?.roles, allowedRoles)) {
    return (
      <div className="alert alert-warning wt-protected-route-message" role="alert">
        <h3>Access restricted</h3>
        <p>Your account does not have the role required to use this page.</p>
        <Link className="btn btn-default" to="/">
          Return Home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
