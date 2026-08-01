import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '../common/Alert';
import Button from '../common/Button';
import Input from '../Form/Input';
import { useAuth } from '../../context/AuthContext';
import authApi, { type EmailCodeAuthResponse, type EmailCodeRuntimeConfig } from '../../services/api/auth';
import useRecaptcha from '../../hooks/useRecaptcha';
import { trackEvent } from '../../utils/analytics';

interface PasswordlessEmailPanelProps {
  rememberMe: boolean;
  returnUrl: string;
  mode?: 'login' | 'signup';
  onAuthenticated: () => void;
  runtimeConfig?: EmailCodeRuntimeConfig | null;
  runtimeConfigLoading?: boolean;
  presentation?: 'panel' | 'plain';
  requestLabel?: string;
  description?: React.ReactNode;
  emailValue?: string;
  onEmailValueChange?: (value: string) => void;
  onStageChange?: (stage: PasswordlessEmailStage) => void;
}

export type PasswordlessEmailStage = 'request' | 'code' | 'link' | 'username';

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validEmail(value: string): boolean {
  return /^[a-zA-Z0-9\-_.+]+@[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+$/.test(value);
}

const PasswordlessEmailPanel: React.FC<PasswordlessEmailPanelProps> = ({
  rememberMe,
  returnUrl,
  mode = 'login',
  onAuthenticated,
  runtimeConfig,
  runtimeConfigLoading = false,
  presentation = 'panel',
  requestLabel = 'Email me a sign-in code',
  description,
  emailValue,
  onEmailValueChange,
  onStageChange,
}) => {
  const [searchParams] = useSearchParams();
  const { refreshAuth } = useAuth();
  const { execute: executeRecaptcha } = useRecaptcha();
  const magicChallenge = String(searchParams.get('emailChallenge') || '').trim();
  const magicToken = String(searchParams.get('emailToken') || '').trim();
  const targetOrigin = String(
    searchParams.get('targetOrigin') || searchParams.get('tenantOrigin') || ''
  ).trim();
  const [loadedConfig, setLoadedConfig] = useState<EmailCodeRuntimeConfig | null>(null);
  const config = runtimeConfig === undefined ? loadedConfig : runtimeConfig;
  const [stage, setStage] = useState<PasswordlessEmailStage>(magicChallenge && magicToken ? 'link' : 'request');
  const [internalEmail, setInternalEmail] = useState('');
  const email = emailValue === undefined ? internalEmail : emailValue;
  const [challengeId, setChallengeId] = useState(magicChallenge);
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [completionToken, setCompletionToken] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (runtimeConfig !== undefined || runtimeConfigLoading) return;
    let active = true;
    void authApi.emailCodeConfig()
      .then(value => {
        if (active) setLoadedConfig(value);
      })
      .catch(() => {
        if (active) setLoadedConfig(null);
      });
    return () => { active = false; };
  }, [runtimeConfig, runtimeConfigLoading]);

  useEffect(() => {
    onStageChange?.(stage);
  }, [onStageChange, stage]);

  useEffect(() => {
    if (!magicToken || typeof window === 'undefined') return;
    const safeUrl = new URL(window.location.href);
    safeUrl.searchParams.delete('emailToken');
    safeUrl.searchParams.delete('emailChallenge');
    window.history.replaceState({}, '', `${safeUrl.pathname}${safeUrl.search}${safeUrl.hash}`);
  }, [magicToken]);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const canonicalEmailUrl = useMemo(() => {
    if (!config?.canonicalOrigin || typeof window === 'undefined') return '';
    const url = new URL(mode === 'signup' ? '/signup' : '/login', config.canonicalOrigin);
    url.searchParams.set('targetOrigin', window.location.origin);
    url.searchParams.set('returnUrl', returnUrl);
    return url.toString();
  }, [config, mode, returnUrl]);

  const finish = async (result: EmailCodeAuthResponse) => {
    if (result.handoff?.callbackUrl) {
      window.location.assign(result.handoff.callbackUrl);
      return;
    }
    await refreshAuth?.();
    trackEvent(result.created ? 'signup' : 'login', 'auth', 'email-code');
    onAuthenticated();
  };

  const handleVerificationResult = async (result: EmailCodeAuthResponse) => {
    if (result.requiresUsername && result.challengeId && result.completionToken) {
      setChallengeId(result.challengeId);
      setCompletionToken(result.completionToken);
      setStage('username');
      setMessage('Email verified. Choose a username to finish creating your account.');
      return;
    }
    await finish(result);
  };

  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalized = normalizedEmail(email);
    if (!validEmail(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const recaptchaResponse = await executeRecaptcha('email_code_request');
      const result = await authApi.requestEmailCode({
        email: normalized,
        rememberMe,
        recaptchaResponse: recaptchaResponse || undefined,
        targetOrigin: targetOrigin || undefined,
        returnPath: returnUrl,
      });
      if (!result.challengeId) {
        setError('Please wait before requesting another email code.');
        return;
      }
      setChallengeId(result.challengeId);
      setResendAt(Date.now() + result.retryAfterSeconds * 1000);
      setDebugCode(result.debug?.code || '');
      setMessage(result.message);
      setStage('code');
      setCode('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send a sign-in code.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await handleVerificationResult(await authApi.verifyEmailCode({ challengeId, code }));
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify the email code.');
    } finally {
      setBusy(false);
    }
  };

  const confirmLink = async () => {
    setBusy(true);
    setError(null);
    try {
      await handleVerificationResult(await authApi.verifyEmailCode({
        challengeId: magicChallenge,
        linkToken: magicToken,
      }));
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to confirm the secure sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  const completeSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[a-zA-Z0-9\-_]+$/.test(username)) {
      setError('Use letters, numbers, dash, or underscore for your username.');
      return;
    }
    if (!agreeToTerms) {
      setError('Agree to the terms and responsible participation rules to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await finish(await authApi.completeEmailCodeSignup({
        challengeId,
        completionToken,
        username,
        agreeToTerms,
      }));
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : 'Unable to create the account.');
    } finally {
      setBusy(false);
    }
  };

  if (!config?.enabled) return null;
  if (!config.isCanonicalOrigin) {
    return (
      <div className="well well-sm wt-email-auth-panel">
        <strong>Passwordless email sign-in</strong>
        <p className="text-muted" style={{ marginTop: 6 }}>
          Use one shared identity across Wikitruth and this country application.
        </p>
        <a className="btn btn-info btn-block" href={canonicalEmailUrl}>
          <i className="fa fa-envelope" aria-hidden="true" /> Continue with email on Wikitruth
        </a>
      </div>
    );
  }

  const panelTitleId = `wt-email-auth-${mode}-title`;
  const resolvedDescription = description === undefined
    ? 'No password required. We will sign you in or help create your account after verifying your email.'
    : description;
  const isPlain = presentation === 'plain';

  return (
    <section
      className={isPlain ? 'wt-email-auth-panel wt-email-auth-panel-plain' : 'panel panel-info wt-email-auth-panel'}
      aria-labelledby={panelTitleId}
    >
      {isPlain ? (
        <h2 id={panelTitleId} className="sr-only">Continue with email</h2>
      ) : (
        <div className="panel-heading">
          <h2 id={panelTitleId} className="panel-title"><i className="fa fa-envelope" aria-hidden="true" /> Continue with email</h2>
        </div>
      )}
      <div className={isPlain ? 'wt-email-auth-body' : 'panel-body'}>
        {resolvedDescription ? (
          <p className={isPlain ? 'wt-auth-method-copy' : 'text-muted'}>{resolvedDescription}</p>
        ) : null}
        {error ? <Alert type="danger" dismissible onDismiss={() => setError(null)}>{error}</Alert> : null}
        {message ? <Alert type="info">{message}</Alert> : null}

        {stage === 'request' ? (
          <form onSubmit={requestCode}>
            <Input
              name="emailCodeEmail"
              type="email"
              label="Email"
              value={email}
              onChange={event => {
                if (emailValue === undefined) setInternalEmail(event.target.value);
                onEmailValueChange?.(event.target.value);
              }}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <Button type="submit" variant="info" className="btn-block" disabled={busy} icon={busy ? 'spinner fa-spin' : 'paper-plane'}>
              {busy ? 'Sending...' : requestLabel}
            </Button>
          </form>
        ) : null}

        {stage === 'code' ? (
          <form onSubmit={verifyCode}>
            <Input
              name="emailCode"
              label="Six-digit code"
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="000000"
              required
            />
            {debugCode ? <p className="help-block">Development code: <strong>{debugCode}</strong></p> : null}
            <Button type="submit" variant="info" disabled={busy} icon={busy ? 'spinner fa-spin' : 'check'}>
              {busy ? 'Checking...' : 'Verify and continue'}
            </Button>{' '}
            <Button type="button" variant="link" disabled={busy || remainingSeconds > 0} onClick={() => void requestCode()}>
              {remainingSeconds > 0 ? `Resend in ${remainingSeconds}s` : 'Resend code'}
            </Button>
          </form>
        ) : null}

        {stage === 'link' ? (
          <div>
            <p>This secure email link is ready. Confirm to use it once and continue.</p>
            <Button type="button" variant="info" className="btn-block" disabled={busy} onClick={() => void confirmLink()} icon={busy ? 'spinner fa-spin' : 'check-circle'}>
              {busy ? 'Confirming...' : 'Confirm secure sign-in'}
            </Button>
          </div>
        ) : null}

        {stage === 'username' ? (
          <form onSubmit={completeSignup}>
            <Input
              name="emailCodeUsername"
              label="Username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Choose a public username"
              required
            />
            <div className="checkbox">
              <label>
                <input type="checkbox" checked={agreeToTerms} onChange={event => setAgreeToTerms(event.target.checked)} />{' '}
                I agree to the terms and responsible participation rules
              </label>
            </div>
            <Button type="submit" variant="success" className="btn-block" disabled={busy} icon={busy ? 'spinner fa-spin' : 'user-plus'}>
              {busy ? 'Creating account...' : 'Create account and continue'}
            </Button>
          </form>
        ) : null}
      </div>
    </section>
  );
};

export default PasswordlessEmailPanel;
