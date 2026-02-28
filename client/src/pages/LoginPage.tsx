import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Form/Input';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import SocialLoginButtons from '../components/Auth/SocialLoginButtons';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';
import authApi from '../services/api/auth';

interface LoginFormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [providersReady, setProvidersReady] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAuthenticated) {
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
      navigate('/');
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
      rememberMe: false,
    },
    onSubmit: handleSubmit,
    validate,
  });

  return (
    <div className="container">
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
              autoComplete="username"
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

            <Checkbox
              name="rememberMe"
              label="Remember me"
              checked={values.rememberMe}
              onChange={handleChange}
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
