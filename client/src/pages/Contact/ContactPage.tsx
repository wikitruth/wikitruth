import React, { useState } from 'react';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Input from '../../components/Form/Input';
import TextArea from '../../components/Form/TextArea';
import apiService from '../../services/api';

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (name.trim().length < 2 || email.trim().length < 5 || message.trim().length < 10) {
      setError('Name, email, and message are required.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiService.sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      setStatus(result?.message || 'We have received your message. Thank you.');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-sm-6">
          <div className="page-header">
            <h1>Send us your thoughts</h1>
          </div>

          {error && <Alert type="danger">{error}</Alert>}
          {status && <Alert type="success">{status}</Alert>}

          <div className="panel panel-default">
            <div className="panel-body">
              <form onSubmit={handleSubmit}>
                <Input name="name" label="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input name="email" label="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <TextArea name="message" label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} required />
                <Button type="submit" variant="primary" icon={submitting ? 'spinner fa-spin' : 'send'} disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-sm-6 special">
          <div className="page-header">
            <h1>Contact Us</h1>
          </div>
          <p className="lead">Glad to hear ideas and suggestions from you.</p>
          <i className="fa fa-reply-all super-awesome"></i>
          <address>
            <div>
              <i className="fa fa-envelope"></i>&nbsp;
              <a href="mailto:wikitruth.project@gmail.com">wikitruth.project@gmail.com</a>
            </div>
            <div>
              <i className="fa fa-facebook"></i>&nbsp;
              <a href="https://www.facebook.com/wikitruth.project" target="_blank" rel="noreferrer">
                wikitruth.project
              </a>
            </div>
          </address>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
