import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Input from '../../components/Form/Input';
import authApi from '../../services/api/auth';

const FastSwitchPage: React.FC = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    try {
      setSubmitting(true);
      await authApi.fastSwitch(pin);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fast Switch failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h2>Fast Switch</h2>
      <p className="text-muted">Enter your 6-digit PIN to sign in quickly on this trusted device.</p>

      {error && <Alert type="danger">{error}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSubmit}>
            <Input
              name="pin"
              type="password"
              label="PIN"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit PIN"
              required
            />
            <Button type="submit" variant="primary" icon={submitting ? 'spinner fa-spin' : 'unlock'} disabled={submitting}>
              {submitting ? 'Verifying...' : 'Continue'}
            </Button>
          </form>
        </div>
      </div>

      <Link to="/login" className="btn btn-default">
        <i className="fa fa-arrow-left"></i> Back to Login
      </Link>
    </div>
  );
};

export default FastSwitchPage;
