import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buildSignInPath } from '../../utils/authFlow';
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
    return <Navigate replace to={buildSignInPath(returnUrl, 'protected')} />;
  }

  if (allowedRoles.length > 0 && !hasAllowedRole(user?.roles, allowedRoles)) {
    return (
      <section className="panel panel-warning wt-access-message" role="alert">
        <div className="panel-body">
          <div className="wt-access-message-icon" aria-hidden="true">
            <i className="fa fa-lock"></i>
          </div>
          <h2>Access restricted</h2>
          <p>Your account does not have the role required to use this page.</p>
          <Link className="btn btn-default" to="/">
            Return Home
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
