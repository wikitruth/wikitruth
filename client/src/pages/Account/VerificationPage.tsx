import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Input from '../../components/Form/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import authApi from '../../services/api/auth';

const VerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromQuery);
  const [required, setRequired] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await authApi.verificationStatus();
      setRequired(Boolean(result.verification.required));
      setIsVerified(Boolean(result.verification.isVerified));
      setEmail(result.verification.email || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleResend = async () => {
    try {
      setError(null);
      setMessage(null);
      const result = await authApi.resendVerification(email);
      const debugToken = result.debug?.token;
      setMessage(debugToken ? `Verification token generated (dev): ${debugToken}` : 'Verification email was re-issued.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification');
    }
  };

  const handleVerify = async () => {
    try {
      setError(null);
      setMessage(null);
      await authApi.confirmVerification(token);
      setMessage('Account verified successfully.');
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify account');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading verification status..." />;
  }

  return (
    <div className="container">
      <h2>Email Verification</h2>
      <p className="text-muted">Verify your email to unlock full account access.</p>

      {error && <Alert type="danger">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {!required && (
        <Alert type="info">Account verification is not required in this environment.</Alert>
      )}

      {required && isVerified && (
        <Alert type="success">Your account is already verified.</Alert>
      )}

      {required && !isVerified && (
        <div className="panel panel-default">
          <div className="panel-body">
            <Input
              name="email"
              label="Verification email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="button" variant="default" onClick={handleResend} icon="envelope">
              Resend Verification
            </Button>

            <hr />

            <Input
              name="token"
              label="Verification token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from verification email"
            />

            <Button type="button" variant="primary" onClick={handleVerify} icon="check">
              Confirm Verification
            </Button>
          </div>
        </div>
      )}

      <Link to="/account" className="btn btn-default">
        <i className="fa fa-arrow-left"></i> Back to Account
      </Link>
    </div>
  );
};

export default VerificationPage;
