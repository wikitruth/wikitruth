import React, { useState } from 'react';
import Input from '../../components/Form/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import authApi from '../../services/api/auth';
import PageMeta from '../../components/common/PageMeta';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitMessage(null);
    setDebugToken(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setSubmitError('Email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authApi.forgotPassword(normalizedEmail);
      setSubmitMessage(result.message || 'If an account exists, reset instructions were generated.');
      if (result.debug?.token) {
        setDebugToken(result.debug.token);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <PageMeta title="Forgot Password" />
      <h2>Forgot password</h2>

      {submitError ? <Alert type="danger">{submitError}</Alert> : null}
      {submitMessage ? <Alert type="success">{submitMessage}</Alert> : null}

      <form onSubmit={onSubmit}>
        <Input
          name="email"
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <Button type="submit" variant="primary" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'envelope'}>
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      {debugToken ? (
        <div className="well" style={{ marginTop: '20px' }}>
          <p>
            <strong>Dev token:</strong> <code>{debugToken}</code>
          </p>
          <p>
            Use this local link:
            {' '}
            <a href={`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}&token=${encodeURIComponent(debugToken)}`}>
              Reset password now
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ForgotPasswordPage;
