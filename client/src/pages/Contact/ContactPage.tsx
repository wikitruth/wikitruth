import React, { useState } from 'react';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Input from '../../components/Form/Input';
import TextArea from '../../components/Form/TextArea';

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (name.trim().length < 2 || email.trim().length < 5 || message.trim().length < 10) {
      setError('Name, email, and message are required.');
      return;
    }

    try {
      setStatus('Message queued. We will respond through your registered email.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit message');
    }
  };

  return (
    <div className="container">
      <h2>Contact</h2>
      <p className="text-muted">Send a question, report, or partnership request.</p>

      {error && <Alert type="danger">{error}</Alert>}
      {status && <Alert type="success">{status}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSubmit}>
            <Input name="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input name="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextArea name="message" label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required />
            <Button type="submit" variant="primary" icon="send">Send Message</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
