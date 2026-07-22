import React, { useEffect, useState } from 'react';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Input from '../../components/Form/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import authApi from '../../services/api/auth';
import PasskeySecurityPanel from '../../components/Auth/PasskeySecurityPanel';

interface ContactFormState {
  first: string;
  middle: string;
  last: string;
  company: string;
  phone: string;
  zip: string;
}

interface IdentityFormState {
  username: string;
  email: string;
}

interface PasswordFormState {
  newPassword: string;
  confirm: string;
}

const providerDisplay: Array<{ key: string; label: string }> = [
  { key: 'google', label: 'Google' },
  { key: 'github', label: 'GitHub' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'apple', label: 'Apple' },
  { key: 'microsoft', label: 'Microsoft' },
];

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [contact, setContact] = useState<ContactFormState>({
    first: '',
    middle: '',
    last: '',
    company: '',
    phone: '',
    zip: '',
  });
  const [identity, setIdentity] = useState<IdentityFormState>({ username: '', email: '' });
  const [password, setPassword] = useState<PasswordFormState>({ newPassword: '', confirm: '' });
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [social, setSocial] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await authApi.accountSettings();
      setContact({
        first: result.account?.first || '',
        middle: result.account?.middle || '',
        last: result.account?.last || '',
        company: result.account?.company || '',
        phone: result.account?.phone || '',
        zip: result.account?.zip || '',
      });
      setIdentity({
        username: result.identity?.username || '',
        email: result.identity?.email || '',
      });
      setProviders(result.providers || {});
      setSocial(result.social || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveContact = async () => {
    setError(null);
    setSuccess(null);
    try {
      setSavingContact(true);
      await authApi.updateAccountContact(contact);
      setSuccess('Contact info updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact info');
    } finally {
      setSavingContact(false);
    }
  };

  const handleSaveIdentity = async () => {
    setError(null);
    setSuccess(null);
    try {
      setSavingIdentity(true);
      await authApi.updateAccountIdentity(identity);
      setSuccess('Identity updated.');
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update identity');
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSavePassword = async () => {
    setError(null);
    setSuccess(null);
    try {
      setSavingPassword(true);
      await authApi.updateAccountPassword(password);
      setPassword({ newPassword: '', confirm: '' });
      setSuccess('Password updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading account settings..." />;
  }

  return (
    <div className="container">
      <h2>Account Settings</h2>
      <p className="text-muted">Manage identity, passkeys, recovery, password fallback, and social connections.</p>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="row">
        <div className="col-sm-9">
          <PasskeySecurityPanel />

          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Contact Info</h3>
            </div>
            <div className="panel-body">
              <Input name="first" label="First Name" value={contact.first} onChange={(e) => setContact((prev) => ({ ...prev, first: e.target.value }))} required />
              <Input name="middle" label="Middle Name" value={contact.middle} onChange={(e) => setContact((prev) => ({ ...prev, middle: e.target.value }))} />
              <Input name="last" label="Last Name" value={contact.last} onChange={(e) => setContact((prev) => ({ ...prev, last: e.target.value }))} required />
              <Input name="company" label="Company" value={contact.company} onChange={(e) => setContact((prev) => ({ ...prev, company: e.target.value }))} />
              <Input name="phone" label="Phone" value={contact.phone} onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))} />
              <Input name="zip" label="Zip" value={contact.zip} onChange={(e) => setContact((prev) => ({ ...prev, zip: e.target.value }))} />
              <Button type="button" variant="primary" onClick={handleSaveContact} disabled={savingContact} icon={savingContact ? 'spinner fa-spin' : 'check'}>
                {savingContact ? 'Saving...' : 'Save Contact Info'}
              </Button>
            </div>
          </div>

          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Identity</h3>
            </div>
            <div className="panel-body">
              <Input name="username" label="Username" value={identity.username} onChange={(e) => setIdentity((prev) => ({ ...prev, username: e.target.value }))} required />
              <Input name="email" type="email" label="Email" value={identity.email} onChange={(e) => setIdentity((prev) => ({ ...prev, email: e.target.value }))} required />
              <Button type="button" variant="info" onClick={handleSaveIdentity} disabled={savingIdentity} icon={savingIdentity ? 'spinner fa-spin' : 'user'}>
                {savingIdentity ? 'Saving...' : 'Save Identity'}
              </Button>
            </div>
          </div>

          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Set Password</h3>
            </div>
            <div className="panel-body">
              <Input
                name="newPassword"
                type="password"
                label="New Password"
                value={password.newPassword}
                onChange={(e) => setPassword((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
              />
              <Input
                name="confirm"
                type="password"
                label="Confirm Password"
                value={password.confirm}
                onChange={(e) => setPassword((prev) => ({ ...prev, confirm: e.target.value }))}
                required
              />
              <Button type="button" variant="warning" onClick={handleSavePassword} disabled={savingPassword} icon={savingPassword ? 'spinner fa-spin' : 'lock'}>
                {savingPassword ? 'Saving...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </div>

        <div className="col-sm-3">
          <div className="panel panel-default">
            <div className="panel-heading">
              <h3 className="panel-title">Social Connections</h3>
            </div>
            <div className="list-group">
              {providerDisplay
                .filter((provider) => Boolean(providers[provider.key]))
                .map((provider) => (
                  <div key={provider.key} className="list-group-item">
                    <strong>{provider.label}</strong>
                    <div className="text-muted" style={{ marginTop: '4px' }}>
                      {social[provider.key] ? 'Connected' : 'Not connected'}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      {!social[provider.key] ? (
                        <a className="btn btn-default btn-sm" href={`/account/settings/${provider.key}/`}>
                          Connect
                        </a>
                      ) : (
                        <a className="btn btn-danger btn-sm" href={`/account/settings/${provider.key}/disconnect/`}>
                          Disconnect
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
