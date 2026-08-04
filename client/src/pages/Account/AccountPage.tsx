import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';
import authApi from '../../services/api/auth';
import type { User } from '../../types';

const AccountPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [verification, setVerification] = useState<{ required: boolean; isVerified: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const [meResult, verificationResult] = await Promise.all([authApi.me(), authApi.verificationStatus()]);
        setUser(meResult.user);
        setVerification({
          required: verificationResult.verification.required,
          isVerified: verificationResult.verification.isVerified,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account');
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading account..." />;
  }

  if (error) {
    return <Alert type="danger">{error}</Alert>;
  }

  return (
    <div className="container">
      <h2>Account Overview</h2>
      <p className="text-muted">Manage your account and verification status.</p>

      <div className="panel panel-default">
        <div className="panel-body">
          <p>
            <strong>Username:</strong> {user?.username || '-'}
          </p>
          <p>
            <strong>Email:</strong> {user?.email || '-'}
          </p>
          <p>
            <strong>Verification:</strong>{' '}
            {verification?.required ? (verification.isVerified ? 'Verified' : 'Pending verification') : 'Not required'}
          </p>
          <p>
            <strong>Contributor onboarding:</strong>{' '}
            {user?.onboarding?.contributor?.completed === false ? 'Required' : 'Complete'}
          </p>
          {user?.roles?.reviewer ? (
            <p>
              <strong>Reviewer onboarding:</strong>{' '}
              {user.onboarding?.reviewer?.completed === false ? 'Required' : 'Complete'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="btn-group">
        <Link to="/account/onboarding" className="btn btn-primary">
          <i className="fa fa-graduation-cap"></i> Role Onboarding
        </Link>
        <Link to="/account/settings" className="btn btn-default">
          <i className="fa fa-cog"></i> Settings
        </Link>
        <Link to="/account/verification" className="btn btn-default">
          <i className="fa fa-shield"></i> Verification
        </Link>
      </div>
    </div>
  );
};

export default AccountPage;
