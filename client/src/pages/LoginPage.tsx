import React, { useEffect, useRef, useState } from 'react';
import { browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import Input from '../components/Form/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import SocialLoginButtons from '../components/Auth/SocialLoginButtons';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';
import authApi from '../services/api/auth';
import PageMeta from '../components/common/PageMeta';
import { trackEvent } from '../utils/analytics';
import passkeyApi, { type PasskeyRuntimeConfig } from '../services/api/passkeys';

interface LoginFormValues {
  username: string;
  password: string;
}

function safeReturnUrl(value: string | null): string {
  const candidate = String(value || '').trim();
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get('returnUrl'));
  const { login, isAuthenticated, refreshAuth } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [providersReady, setProvidersReady] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean>>({});
  const [passkeyConfig, setPasskeyConfig] = useState<PasskeyRuntimeConfig | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryIdentity, setRecoveryIdentity] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const conditionalStarted = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, returnUrl]);

  useEffect(() => {
    let active = true;
    const loadProviders = async () => {
      try {
        const result = await authApi.providers();
        if (active) {
          setEnabledProviders(result.providers || {});
        }
      } catch (_error) {
        if (active) {
          setEnabledProviders({});
        }
      } finally {
        if (active) {
          setProvidersReady(true);
        }
      }
    };

    void loadProviders();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void passkeyApi.config()
      .then(config => {
        if (active) setPasskeyConfig(config);
      })
      .catch(() => {
        if (active) setPasskeyConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);

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
        ? passkeyApi.authenticate('authentication', true)
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
  }, [isAuthenticated, navigate, passkeyConfig, refreshAuth, returnUrl]);

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
      await passkeyApi.authenticate('authentication');
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
      await passkeyApi.recoveryLogin(recoveryIdentity.trim(), recoveryCode.trim());
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
      await login(values.username, values.password);
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

  return (
    <div className="container">
      <PageMeta title="Login" />
      <div className="row">
        <div className="col-sm-6">
          <div className="page-header1" style={{ marginTop: '40px', marginBottom: '20px' }}>
            <h1>Sign In</h1>
          </div>
          <ul className="nav nav-tabs wt-tabs" role="tablist">
            <li role="presentation" className="active">
              <Link to="/login" role="tab">
                <i className="fa fa-user"></i> Login
              </Link>
            </li>
            <li role="presentation">
              <Link to="/fast-switch" role="tab">
                <i className="fa fa-undo"></i> Fast Switch
              </Link>
            </li>
          </ul>
          <br />

          {submitError && (
            <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

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

            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                icon={isSubmitting ? 'spinner fa-spin' : 'sign-in'}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
              <span>&nbsp;</span>
              <Link to="/forgot-password" className="btn btn-link">
                Forgot your password?
              </Link>
            </div>
          </form>

          {passkeyConfig?.enabled ? (
            <div style={{ marginTop: '18px' }}>
              <div className="text-center text-muted" style={{ marginBottom: '12px' }}>or</div>
              {passkeyConfig.isCanonicalOrigin ? (
                <Button
                  type="button"
                  variant="success"
                  className="btn-block"
                  icon={passkeyBusy ? 'spinner fa-spin' : 'key'}
                  disabled={passkeyBusy || !passkeyApi.supported()}
                  onClick={() => void handlePasskeySignIn()}
                >
                  {passkeyBusy ? 'Waiting for your device...' : 'Sign in with a passkey'}
                </Button>
              ) : (
                <a className="btn btn-success btn-block" href={tenantPasskeyUrl}>
                  <i className="fa fa-key" /> Continue with passkey on Wikitruth
                </a>
              )}
              {!passkeyApi.supported() && passkeyConfig.isCanonicalOrigin ? (
                <p className="help-block">This browser or device does not support passkeys.</p>
              ) : null}
              <button
                type="button"
                className="btn btn-link btn-block"
                onClick={() => setShowRecovery(current => !current)}
              >
                Use a recovery code
              </button>
              {showRecovery ? (
                <form onSubmit={handleRecoveryLogin} className="well well-sm">
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
                  <Button type="submit" disabled={passkeyBusy} icon="life-ring">Recover account</Button>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="col-sm-6">
          <div style={{ marginTop: '40px' }}>
            <h3>Or sign in using...</h3>
            {providersReady ? (
              <SocialLoginButtons mode="login" enabledProviders={enabledProviders} />
            ) : (
              <p className="text-muted">Loading providers...</p>
            )}
            <hr />
            <p>Don&apos;t have an account?</p>
            <Link to="/signup" className="btn btn-primary btn-block">
              <i className="fa fa-user"></i> Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
