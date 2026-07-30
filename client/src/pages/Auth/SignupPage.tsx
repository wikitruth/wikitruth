import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../../components/Form/Input';
import Checkbox from '../../components/Form/Checkbox';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import SocialLoginButtons from '../../components/Auth/SocialLoginButtons';
import useForm from '../../hooks/useForm';
import { useAuth } from '../../context/AuthContext';
import PageMeta from '../../components/common/PageMeta';
import useRecaptcha from '../../hooks/useRecaptcha';
import authApi from '../../services/api/auth';
import { trackEvent } from '../../utils/analytics';
import passkeyApi, { type PasskeyRuntimeConfig } from '../../services/api/passkeys';

interface SignupFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isAuthenticated, refreshAuth } = useAuth();
  const { execute: executeRecaptcha } = useRecaptcha();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [providersReady, setProvidersReady] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean>>({});
  const [passkeyConfig, setPasskeyConfig] = useState<PasskeyRuntimeConfig | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const passkeyDestinationPending = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !passkeyDestinationPending.current) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

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

  const validate = (values: SignupFormValues) => {
    const errors: Partial<Record<keyof SignupFormValues, string>> = {};

    if (!values.username || values.username.trim().length === 0) {
      errors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9\-_]+$/.test(values.username)) {
      errors.username = 'Use letters, numbers, dash, or underscore only';
    }

    if (!values.email || values.email.trim().length === 0) {
      errors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9\-_.+]+@[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+$/.test(values.email)) {
      errors.email = 'Invalid email format';
    }

    if (!values.password) {
      errors.password = 'Password is required';
    } else if (values.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required';
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!values.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to continue';
    }

    return errors;
  };

  const handleSubmit = async (values: SignupFormValues) => {
    setSubmitError(null);

    try {
      const recaptchaToken = await executeRecaptcha('signup');
      await signup(values.username.trim(), values.email.trim(), values.password, recaptchaToken || undefined);
      trackEvent('signup', 'auth', 'credentials');
      navigate('/');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Signup failed. Please try again.');
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
  } = useForm<SignupFormValues>({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
    validate,
    onSubmit: handleSubmit,
  });

  const handlePasskeySignup = async () => {
    setSubmitError(null);
    const username = values.username.trim();
    const email = values.email.trim();
    if (!username || !/^[a-zA-Z0-9\-_]+$/.test(username)) {
      setSubmitError('Enter a valid username using letters, numbers, dash, or underscore.');
      return;
    }
    if (!email || !/^[a-zA-Z0-9\-_.+]+@[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9\-_]+$/.test(email)) {
      setSubmitError('Enter a valid email address.');
      return;
    }
    if (!values.agreeToTerms) {
      setSubmitError('You must agree to the terms and responsible participation rules.');
      return;
    }
    setPasskeyBusy(true);
    try {
      const recaptchaToken = await executeRecaptcha('signup_passkey');
      await passkeyApi.passwordlessSignup({
        username,
        email,
        recaptchaResponse: recaptchaToken || undefined,
      });
      passkeyDestinationPending.current = true;
      await refreshAuth?.();
      trackEvent('signup', 'auth', 'passkey');
      const tenantOrigin = String(searchParams.get('tenantOrigin') || '').trim();
      if (tenantOrigin && tenantOrigin !== window.location.origin) {
        const handoff = await passkeyApi.createHandoff(tenantOrigin, '/account/settings#passkeys');
        window.location.assign(handoff.callbackUrl);
      } else {
        navigate('/account/settings#passkeys');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Passkey signup failed. Please try again.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const tenantSignupUrl = (() => {
    if (!passkeyConfig?.canonicalOrigin || typeof window === 'undefined') return '';
    const url = new URL('/signup', passkeyConfig.canonicalOrigin);
    url.searchParams.set('tenantOrigin', window.location.origin);
    return url.toString();
  })();

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <PageMeta title="Sign Up" description="Create your Wikitruth account" />
      <div className="panel panel-default">
        <div className="panel-heading">
          <h1 className="panel-title text-center">
            <i className="fa fa-user-plus"></i> Create your Wikitruth account
          </h1>
        </div>
        <div className="panel-body">
          {submitError ? (
            <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          ) : null}

          <form onSubmit={onSubmit}>
            <Input
              name="username"
              label="Username"
              value={values.username}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Choose a username"
              required
              error={touched.username ? errors.username : undefined}
              autoComplete="username"
            />

            <Input
              name="email"
              type="email"
              label="Email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@example.com"
              required
              error={touched.email ? errors.email : undefined}
              autoComplete="email"
            />

            <Input
              name="password"
              type="password"
              label="Password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Create a password"
              required
              error={touched.password ? errors.password : undefined}
              autoComplete="new-password"
            />

            <Input
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Re-enter your password"
              required
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              autoComplete="new-password"
            />

            <Checkbox
              name="agreeToTerms"
              label="I agree to the terms and responsible participation rules"
              checked={values.agreeToTerms}
              onChange={handleChange}
              error={touched.agreeToTerms ? errors.agreeToTerms : undefined}
            />

            {passkeyConfig?.enabled && passkeyConfig.passwordlessEnabled ? (
              <div className="well well-sm">
                <strong>Recommended: create a passwordless account</strong>
                <p className="text-muted" style={{ marginTop: '6px' }}>
                  A passkey uses your device unlock and is resistant to phishing. Add a second passkey and recovery codes after signup.
                </p>
                {passkeyConfig.isCanonicalOrigin ? (
                  <Button
                    type="button"
                    variant="success"
                    className="btn-block"
                    icon={passkeyBusy ? 'spinner fa-spin' : 'key'}
                    disabled={passkeyBusy || !passkeyApi.supported()}
                    onClick={() => void handlePasskeySignup()}
                  >
                    {passkeyBusy ? 'Waiting for your device...' : 'Create account with a passkey'}
                  </Button>
                ) : (
                  <a className="btn btn-success btn-block" href={tenantSignupUrl}>
                    <i className="fa fa-key" /> Create passkey account on Wikitruth
                  </a>
                )}
              </div>
            ) : null}

            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                icon={isSubmitting ? 'spinner fa-spin' : 'user-plus'}
                className="btn-block"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>

          <hr />
          {providersReady ? (
            <SocialLoginButtons mode="signup" enabledProviders={enabledProviders} />
          ) : (
            <p className="text-muted">Loading providers...</p>
          )}

          <hr />
          <p className="text-center text-muted">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
