import React, { useEffect, useRef, useState } from 'react';
import { browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Input from '../components/Form/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import SocialLoginButtons from '../components/Auth/SocialLoginButtons';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';
import authApi, { type AuthRuntimeConfig } from '../services/api/auth';
import PageMeta from '../components/common/PageMeta';
import { trackEvent } from '../utils/analytics';
import passkeyApi from '../services/api/passkeys';
import PasswordlessEmailPanel from '../components/Auth/PasswordlessEmailPanel';
import {
  getAuthFlowContent,
  isSafeInternalReturnUrl,
  parseAuthIntent,
  safeReturnUrl,
} from '../utils/authFlow';

interface LoginFormValues {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnUrl = searchParams.get('returnUrl');
  const returnUrl = safeReturnUrl(requestedReturnUrl);
  const intent = parseAuthIntent(searchParams.get('intent'));
  const flowContent = intent && isSafeInternalReturnUrl(requestedReturnUrl)
    ? getAuthFlowContent(intent, returnUrl)
    : null;
  const { login, isAuthenticated, refreshAuth } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthRuntimeConfig | null | undefined>(undefined);
  const [authConfigError, setAuthConfigError] = useState(false);
  const [authConfigRequest, setAuthConfigRequest] = useState(0);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryIdentity, setRecoveryIdentity] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const conditionalStarted = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, returnUrl]);

  useEffect(() => {
    let active = true;
    setAuthConfig(undefined);
    setAuthConfigError(false);
    void authApi.config()
      .then(config => {
        if (!active) return;
        setAuthConfig(config);
        const passkeyUsable = Boolean(
          config.passkeys.enabled &&
          (!config.passkeys.isCanonicalOrigin || passkeyApi.supported())
        );
        if (!config.emailCode.enabled && !passkeyUsable) {
          setShowPassword(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthConfig(null);
        setAuthConfigError(true);
        setShowPassword(true);
      });
    return () => {
      active = false;
    };
  }, [authConfigRequest]);

  const passkeyConfig = authConfig?.passkeys;
  const emailCodeConfig = authConfig?.emailCode;
  const passkeyAvailable = Boolean(
    passkeyConfig?.enabled &&
    (!passkeyConfig.isCanonicalOrigin || passkeyApi.supported())
  );
  const enabledProviders = authConfig?.providers || {};
  const hasSocialProviders = Object.values(enabledProviders).some(Boolean);
  const hasPrimaryPasswordlessMethod = Boolean(emailCodeConfig?.enabled || passkeyAvailable);

  useEffect(() => {
    if (
      conditionalStarted.current ||
      isAuthenticated ||
      !passkeyConfig?.enabled ||
      !passkeyConfig.isCanonicalOrigin ||
      !passkeyApi.supported()
    ) return;
    conditionalStarted.current = true;
    let active = true;
    void browserSupportsWebAuthnAutofill()
      .then(available => available
        ? passkeyApi.authenticate('authentication', true, rememberMe)
        : null)
      .then(async result => {
        if (!active || !result) return;
        await refreshAuth?.();
        trackEvent('login', 'auth', 'passkey-autofill');
        navigate(returnUrl, { replace: true });
      })
      .catch(() => {
        // Conditional mediation is optional; the explicit passkey button remains available.
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, navigate, passkeyConfig, refreshAuth, rememberMe, returnUrl]);

  const tenantPasskeyUrl = (() => {
    if (!passkeyConfig?.canonicalOrigin || typeof window === 'undefined') return '';
    const url = new URL('/auth/continue', passkeyConfig.canonicalOrigin);
    url.searchParams.set('targetOrigin', window.location.origin);
    url.searchParams.set('returnUrl', returnUrl);
    return url.toString();
  })();

  const handlePasskeySignIn = async () => {
    setPasskeyBusy(true);
    setSubmitError(null);
    try {
      await passkeyApi.authenticate('authentication', false, rememberMe);
      await refreshAuth?.();
      trackEvent('login', 'auth', 'passkey');
      navigate(returnUrl, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Passkey sign-in failed.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleRecoveryLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasskeyBusy(true);
    setSubmitError(null);
    try {
      await passkeyApi.recoveryLogin(recoveryIdentity.trim(), recoveryCode.trim(), rememberMe);
      await refreshAuth?.();
      trackEvent('login', 'auth', 'recovery-code');
      navigate('/account/settings#passkeys', { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Recovery sign-in failed.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const validate = (values: LoginFormValues) => {
    const errors: Partial<Record<keyof LoginFormValues, string>> = {};

    if (!values.username || values.username.trim().length === 0) {
      errors.username = 'Username is required';
    }

    if (!values.password || values.password.trim().length === 0) {
      errors.password = 'Password is required';
    } else if (values.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);

    try {
      await login(values.username, values.password, rememberMe);
      trackEvent('login', 'auth', 'credentials');
      navigate(returnUrl, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Login failed. Please check your credentials.');
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: onSubmit,
  } = useForm<LoginFormValues>({
    initialValues: {
      username: '',
      password: '',
    },
    onSubmit: handleSubmit,
    validate,
  });

  const signupPath = isSafeInternalReturnUrl(requestedReturnUrl)
    ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/signup';

  return (
    <div className="container wt-auth-container">
      <PageMeta title="Sign In" />
      <section className="wt-auth-page" aria-labelledby="wt-login-title">
        <div className="wt-auth-card">
          <header className="wt-auth-card-header">
            <h1 id="wt-login-title">Welcome back</h1>
            <p className="wt-auth-card-subtitle">Sign in to continue to Wikitruth</p>
          </header>

          {flowContent ? (
            <div className="alert alert-info wt-login-flow-notice" role="status">
              <h2>{flowContent.title}</h2>
              <p>{flowContent.message}</p>
              <p className="wt-login-flow-continuation">
                <i className="fa fa-arrow-circle-right" aria-hidden="true"></i>{' '}
                {flowContent.continuation}
              </p>
            </div>
          ) : null}

          {submitError ? (
            <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          ) : null}

          {authConfig === undefined ? (
            <p className="wt-auth-options-loading text-muted" role="status">
              <i className="fa fa-spinner fa-spin" aria-hidden="true"></i>{' '}
              Loading sign-in options…
            </p>
          ) : null}

          {authConfigError ? (
            <Alert type="warning">
              <p>Some sign-in options could not be loaded. You can use your password or try again.</p>
              <Button
                type="button"
                variant="default"
                className="btn-sm"
                icon="refresh"
                onClick={() => setAuthConfigRequest(request => request + 1)}
              >
                Retry sign-in options
              </Button>
            </Alert>
          ) : null}

          <PasswordlessEmailPanel
            rememberMe={rememberMe}
            returnUrl={returnUrl}
            runtimeConfig={emailCodeConfig ?? null}
            runtimeConfigLoading={authConfig === undefined}
            presentation="plain"
            requestLabel="Continue with email"
            description={null}
            onAuthenticated={() => navigate(returnUrl, { replace: true })}
          />

          <div className="wt-auth-method-stack">
            {passkeyConfig?.enabled ? (
              <div className="wt-passkey-option">
                {passkeyConfig.isCanonicalOrigin ? (
                  <Button
                    type="button"
                    variant="default"
                    className="btn-block wt-auth-secondary-action"
                    icon={passkeyBusy ? 'spinner fa-spin' : 'key'}
                    disabled={passkeyBusy || !passkeyApi.supported()}
                    onClick={() => void handlePasskeySignIn()}
                  >
                    {passkeyBusy ? 'Waiting for your device...' : 'Use a passkey'}
                  </Button>
                ) : (
                  <a className="btn btn-default btn-block wt-auth-secondary-action" href={tenantPasskeyUrl}>
                    <i className="fa fa-key" /> Continue with passkey on Wikitruth
                  </a>
                )}
                {!passkeyApi.supported() && passkeyConfig.isCanonicalOrigin ? (
                  <p className="help-block">Passkeys are not supported by this browser or device.</p>
                ) : null}
              </div>
            ) : null}

            {hasPrimaryPasswordlessMethod ? (
              <button
                type="button"
                className="btn btn-link btn-block wt-auth-tertiary-action"
                aria-expanded={showPassword}
                aria-controls="password-signin-panel"
                onClick={() => setShowPassword(current => !current)}
              >
                <i className={`fa ${showPassword ? 'fa-chevron-up' : 'fa-lock'}`} aria-hidden="true"></i>{' '}
                {showPassword ? 'Hide password sign-in' : 'Use password instead'}
              </button>
            ) : null}
          </div>

          <div className="wt-auth-session-option">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={event => setRememberMe(event.target.checked)}
              />{' '}
              Keep me signed in
            </label>
            <span>{rememberMe ? '30 days on this device' : '24-hour session'}</span>
          </div>

          {showPassword ? (
            <section id="password-signin-panel" className="wt-password-signin-panel" aria-label="Password sign-in">
              <form onSubmit={onSubmit}>
                <Input
                  name="username"
                  label="Username or Email"
                  value={values.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your username or email"
                  required
                  error={touched.username ? errors.username : undefined}
                  autoComplete="username webauthn"
                  className="webauthn-username"
                />

                <Input
                  name="password"
                  type="password"
                  label="Password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  required
                  error={touched.password ? errors.password : undefined}
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="btn-block"
                  disabled={isSubmitting}
                  icon={isSubmitting ? 'spinner fa-spin' : 'sign-in'}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>

              <div className="wt-login-help-links">
                <Link to="/forgot-password">Forgot your password?</Link>
                {passkeyConfig?.enabled ? (
                  <button
                    type="button"
                    className="btn btn-link"
                    aria-expanded={showRecovery}
                    aria-controls="recovery-signin-panel"
                    onClick={() => setShowRecovery(current => !current)}
                  >
                    Use a recovery code
                  </button>
                ) : null}
              </div>

              {showRecovery ? (
                <form id="recovery-signin-panel" onSubmit={handleRecoveryLogin} className="well well-sm wt-recovery-signin-panel">
                  <Input
                    name="recoveryIdentity"
                    label="Username or Email"
                    value={recoveryIdentity}
                    onChange={event => setRecoveryIdentity(event.target.value)}
                    autoComplete="username"
                    required
                  />
                  <Input
                    name="recoveryCode"
                    label="Recovery code"
                    value={recoveryCode}
                    onChange={event => setRecoveryCode(event.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                  <Button type="submit" className="btn-block" disabled={passkeyBusy} icon="life-ring">
                    Recover account
                  </Button>
                </form>
              ) : null}
            </section>
          ) : null}
        </div>

        {hasSocialProviders ? (
          <>
            <div className="wt-auth-divider" aria-hidden="true">or</div>
            <SocialLoginButtons
              mode="login"
              enabledProviders={enabledProviders}
              rememberMe={rememberMe}
              returnUrl={returnUrl}
              continueLabel
            />
          </>
        ) : null}

        <p className="wt-auth-account-switch">
          New to Wikitruth? <Link to={signupPath}>Create an account</Link>
        </p>

        {authConfig?.fastSwitchAvailable ? (
          <div className="wt-auth-utility-links">
            <Link to="/fast-switch">
              <i className="fa fa-undo" aria-hidden="true"></i> Use Fast Switch on this device
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default LoginPage;
