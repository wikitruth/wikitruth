import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import authApi from '../../services/api/auth';

const FastSwitchPage: React.FC = () => {
  const navigate = useNavigate();
  const [pinDigits, setPinDigits] = useState<string[]>(Array.from({ length: 6 }, () => ''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);

  const pin = pinDigits.join('');

  const updatePinDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

    if (digit && index < pinRefs.current.length - 1) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) {
      return;
    }

    const next = Array.from({ length: 6 }, (_, index) => pasted[index] || '');
    setPinDigits(next);
    const nextFocusIndex = Math.min(pasted.length, 5);
    pinRefs.current[nextFocusIndex]?.focus();
  };

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
      <div className="page-header1" style={{ marginTop: '40px', marginBottom: '20px' }}>
        <h1>Sign In</h1>
      </div>
      <ul className="nav nav-tabs wt-tabs" role="tablist">
        <li role="presentation">
          <Link to="/login" role="tab">
            <i className="fa fa-user"></i> Login
          </Link>
        </li>
        <li role="presentation" className="active">
          <Link to="/fast-switch" role="tab">
            <i className="fa fa-undo"></i> Fast Switch
          </Link>
        </li>
      </ul>
      <br />
      <p><strong>Enter your PIN to continue.</strong></p>

      {error && <Alert type="danger">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group form-group-lg">
          <div className="wt-pin-inputs">
            {pinDigits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  pinRefs.current[index] = element;
                }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="form-control pincode-input-text"
                aria-label={`PIN digit ${index + 1}`}
                value={digit}
                onChange={(event) => updatePinDigit(index, event.target.value)}
                onKeyDown={(event) => handlePinKeyDown(index, event)}
                onPaste={handlePinPaste}
                autoComplete="off"
              />
            ))}
          </div>
        </div>
        <div style={{ marginTop: '15px' }}>
          <Button type="submit" variant="primary" icon={submitting ? 'spinner fa-spin' : 'unlock'} disabled={submitting}>
            {submitting ? 'Verifying...' : 'Continue'}
          </Button>
        </div>
      </form>

      <Link to="/login" className="btn btn-default">
        <i className="fa fa-arrow-left"></i> Back to Login
      </Link>
    </div>
  );
};

export default FastSwitchPage;
