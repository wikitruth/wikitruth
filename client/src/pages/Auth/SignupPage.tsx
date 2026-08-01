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
import PasswordlessEmailPanel, {
  type PasswordlessEmailStage,
} from '../../components/Auth/PasswordlessEmailPanel';

interface SignupFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

type SignupMethod = 'email' | 'passkey' | 'password';

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
  const [rememberMe, setRememberMe] = useState(true);
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');
  const [emailStage, setEmailStage] = useState<PasswordlessEmailStage>('request');
  const returnUrlCandidate = String(searchParams.get('returnUrl') || '').trim();
  const returnUrl = returnUrlCandidate.startsWith('/') && !returnUrlCandidate.startsWith('//')
    ? returnUrlCandidate
    : '/';

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
      const tenantOrigin = String(searchParams.get('tenantOrigin') || '').trim();
      passkeyDestinationPending.current = Boolean(tenantOrigin && tenantOrigin !== window.location.origin);
      await signup(
        values.username.trim(),
        values.email.trim(),
        values.password,
        recaptchaToken || undefined,
        rememberMe,
      );
      trackEvent('signup', 'auth', 'credentials');
      if (passkeyDestinationPending.current) {
        const handoff = await passkeyApi.createHandoff(tenantOrigin, returnUrl);
        window.location.assign(handoff.callbackUrl);
      } else {
        navigate(returnUrl);
      }
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
    setFieldValue,
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

  const handlePasskeySignup = async (event?: React.FormEvent) => {
    event?.preventDefault();
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
        rememberMe,
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
    url.searchParams.set('returnUrl', returnUrl);
    return url.toString();
  })();

  const selectSignupMethod = (method: SignupMethod) => {
    setSubmitError(null);
    setSignupMethod(method);
  };
  const hasSocialProviders = providersReady && Object.values(enabledProviders).some(Boolean);

  return (
    <div className="container wt-auth-container">
      <PageMeta title="Sign Up" description="Create your Wikitruth account" />
      <section className="wt-auth-page" aria-labelledby="wt-signup-title">
        <div className="wt-auth-card">
          <header className="wt-auth-card-header">
            <span className="wt-auth-card-icon" aria-hidden="true">
              <i className="fa fa-user-plus"></i>
            </span>
            <h1 id="wt-signup-title">Create your Wikitruth account</h1>
            <p className="wt-auth-card-subtitle">
              {signupMethod === 'email'
                ? 'Start with your email. You’ll choose a username next.'
                : 'Complete your account details using the sign-up method you selected.'}
            </p>
          </header>

          {signupMethod === 'email' ? (
            <div className="wt-auth-progress">
              Step {emailStage === 'username' ? '2' : '1'} of 2
            </div>
          ) : null}

          {submitError ? (
            <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          ) : null}

          {signupMethod === 'email' ? (
            <>
              <PasswordlessEmailPanel
                rememberMe={rememberMe}
                returnUrl={returnUrl}
                mode="signup"
                presentation="plain"
                requestLabel="Continue with email"
                description={null}
                emailValue={values.email}
                onEmailValueChange={value => setFieldValue('email', value)}
                onStageChange={setEmailStage}
                onAuthenticated={() => navigate(returnUrl, { replace: true })}
              />

              <div className="wt-auth-method-stack">
                {passkeyConfig?.enabled && passkeyConfig.passwordlessEnabled ? (
                  passkeyConfig.isCanonicalOrigin ? (
                    <Button
                      type="button"
                      variant="default"
                      className="btn-block wt-auth-secondary-action"
                      icon="key"
                      disabled={!passkeyApi.supported()}
                      onClick={() => selectSignupMethod('passkey')}
                    >
                      Create account with a passkey
                    </Button>
                  ) : (
                    <a className="btn btn-default btn-block wt-auth-secondary-action" href={tenantSignupUrl}>
                      <i className="fa fa-key" /> Create passkey account on Wikitruth
                    </a>
                  )
                ) : null}

                <button
                  type="button"
                  className="btn btn-link btn-block wt-auth-tertiary-action"
                  onClick={() => selectSignupMethod('password')}
                >
                  <i className="fa fa-lock" aria-hidden="true"></i>{' '}
                  Use password instead
                </button>
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
            </>
          ) : null}

          {signupMethod === 'passkey' ? (
            <div aria-labelledby="wt-passkey-signup-title">
              <button
                type="button"
                className="wt-auth-method-back"
                onClick={() => selectSignupMethod('email')}
              >
                <i className="fa fa-arrow-left" aria-hidden="true"></i> Back to account options
              </button>
              <div className="wt-auth-method-header">
                <h2 id="wt-passkey-signup-title">Create account with a passkey</h2>
                <p>Use your device unlock for phishing-resistant sign-in. You can add recovery options after signup.</p>
              </div>
              <form onSubmit={handlePasskeySignup}>
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
                <Checkbox
                  name="agreeToTerms"
                  label="I agree to the terms and responsible participation rules"
                  checked={values.agreeToTerms}
                  onChange={handleChange}
                  error={touched.agreeToTerms ? errors.agreeToTerms : undefined}
                />
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
                <Button
                  type="submit"
                  variant="primary"
                  className="btn-block"
                  icon={passkeyBusy ? 'spinner fa-spin' : 'key'}
                  disabled={passkeyBusy || !passkeyApi.supported()}
                >
                  {passkeyBusy ? 'Waiting for your device...' : 'Create account with a passkey'}
                </Button>
              </form>
            </div>
          ) : null}

          {signupMethod === 'password' ? (
            <div aria-labelledby="wt-password-signup-title">
              <button
                type="button"
                className="wt-auth-method-back"
                onClick={() => selectSignupMethod('email')}
              >
                <i className="fa fa-arrow-left" aria-hidden="true"></i> Back to account options
              </button>
              <div className="wt-auth-method-header">
                <h2 id="wt-password-signup-title">Create account with a password</h2>
                <p>Choose your public username and a password you do not use on another site.</p>
              </div>
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
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  icon={isSubmitting ? 'spinner fa-spin' : 'user-plus'}
                  className="btn-block"
                >
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            </div>
          ) : null}
        </div>

        <p className="wt-auth-account-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        {hasSocialProviders ? (
          <>
            <div className="wt-auth-divider" aria-hidden="true">or</div>
            <SocialLoginButtons
              mode="signup"
              enabledProviders={enabledProviders}
              rememberMe={rememberMe}
              continueLabel
            />
          </>
        ) : null}
      </section>
    </div>
  );
};

export default SignupPage;
