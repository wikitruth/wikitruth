import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Input from '../../components/Form/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import authApi from '../../services/api/auth';
import PageMeta from '../../components/common/PageMeta';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const defaults = useMemo(
    () => ({
      email: searchParams.get('email') || '',
      token: searchParams.get('token') || '',
    }),
    [searchParams]
  );

  const [email, setEmail] = useState(defaults.email);
  const [token, setToken] = useState(defaults.token);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitMessage(null);

    if (!email.trim() || !token.trim()) {
      setSubmitError('Email and reset token are required');
      return;
    }

    if (!password || password.length < 6) {
      setSubmitError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmed) {
      setSubmitError('Passwords must match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.resetPassword(email.trim().toLowerCase(), token.trim(), password);
      setSubmitMessage(response.message || 'Password updated successfully');
      setPassword('');
      setConfirmed('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <PageMeta title="Reset Password" />
      <h2>Reset password</h2>

      {submitError ? <Alert type="danger">{submitError}</Alert> : null}
      {submitMessage ? <Alert type="success">{submitMessage}</Alert> : null}

      <form onSubmit={onSubmit}>
        <Input
          name="email"
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          name="token"
          type="text"
          label="Reset Token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />

        <Input
          name="password"
          type="password"
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <Input
          name="confirmPassword"
          type="password"
          label="Confirm password"
          value={confirmed}
          onChange={(event) => setConfirmed(event.target.value)}
          required
          error={confirmed && password !== confirmed ? 'Passwords must match' : undefined}
        />

        <Button type="submit" variant="primary" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
          {isSubmitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
