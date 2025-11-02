import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Form/Input';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import useForm from '../hooks/useForm';
import { useAuth } from '../context/AuthContext';

interface LoginFormValues {
  username: string;
  password: string;
  rememberMe: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    <div className="container" style={{ maxWidth: '450px', marginTop: '80px' }}>
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title text-center">
            <i className="fa fa-sign-in"></i> Sign In to Wikitruth
          </h3>
        </div>
        <div className="panel-body">
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

            <div className="form-group" style={{ marginTop: '20px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                icon={isSubmitting ? 'spinner fa-spin' : 'sign-in'}
                className="btn-block"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <hr />

          <div className="text-center">
            <p className="text-muted">
              <Link to="/forgot-password">Forgot your password?</Link>
            </p>
            <p className="text-muted">
              Don't have an account? <Link to="/signup">Sign up here</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="text-center" style={{ marginTop: '20px' }}>
        <Link to="/" className="btn btn-link">
          <i className="fa fa-arrow-left"></i> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
