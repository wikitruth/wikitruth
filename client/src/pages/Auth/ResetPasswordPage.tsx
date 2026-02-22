import React, { useState } from 'react';
import Input from '../../components/Form/Input';
import Button from '../../components/Form/Button';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <h2>Reset password</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (password && password === confirmed) {
            setSubmitted(true);
          }
        }}
      >
        <Input
          name="password"
          type="password"
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Confirm password"
          value={confirmed}
          onChange={(event) => setConfirmed(event.target.value)}
          required
          error={confirmed && password !== confirmed ? 'Passwords must match' : undefined}
        />
        <Button type="submit" variant="primary">
          Update password
        </Button>
      </form>
      {submitted ? <p className="text-success">Password updated.</p> : null}
    </div>
  );
};

export default ResetPasswordPage;
