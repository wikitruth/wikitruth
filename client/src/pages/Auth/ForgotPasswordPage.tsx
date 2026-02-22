import React, { useState } from 'react';
import Input from '../../components/Form/Input';
import Button from '../../components/Form/Button';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="container" style={{ maxWidth: '520px', marginTop: '60px' }}>
      <h2>Forgot password</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <Input
          name="email"
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <Button type="submit" variant="primary">
          Send reset link
        </Button>
      </form>
      {submitted ? <p className="text-success">If an account exists, a reset email will be sent.</p> : null}
    </div>
  );
};

export default ForgotPasswordPage;
