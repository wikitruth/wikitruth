import React, { useState } from 'react';
import type { EmailProviderInput, EmailProviderRecord, EmailProviderType } from '../../../services/api/emailOperations';

interface ProviderEditorProps {
  provider: EmailProviderRecord | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: EmailProviderInput) => Promise<void>;
}

const ProviderEditor: React.FC<ProviderEditorProps> = ({ provider, saving, onCancel, onSave }) => {
  const [type, setType] = useState<EmailProviderType>(provider?.type || 'resend');
  const [name, setName] = useState(provider?.name || 'Primary Resend');
  const [fromName, setFromName] = useState(provider?.fromName || 'Wikitruth');
  const [fromAddress, setFromAddress] = useState(provider?.fromAddress || '');
  const [host, setHost] = useState(provider?.host || '');
  const [port, setPort] = useState(provider?.port || 587);
  const [security, setSecurity] = useState<'ssl' | 'starttls'>(provider?.security || 'starttls');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      name, type, enabled: provider?.enabled !== false, fromName, fromAddress,
      ...(type === 'smtp' ? { host, port, security } : {}),
      secrets: { apiKey, username, password, webhookSecret },
    });
  };

  return (
    <section className="panel panel-info wt-email-provider-editor" aria-labelledby="provider-editor-title">
      <div className="panel-heading">
        <h2 className="panel-title" id="provider-editor-title">{provider ? `Edit ${provider.name}` : 'Add email provider'}</h2>
      </div>
      <div className="panel-body">
        <div className="alert alert-info" role="note">
          <i className="fa fa-lock" aria-hidden="true" /> Credentials are encrypted in the private runtime store. Saved secrets are never returned to this page.
        </div>
        <form onSubmit={submit}>
          <div className="row">
            <div className="col-sm-6 form-group">
              <label htmlFor="email-provider-type">Provider type</label>
              <select id="email-provider-type" className="form-control" value={type} onChange={(event) => setType(event.target.value as EmailProviderType)} disabled={Boolean(provider)}>
                <option value="resend">Resend API</option>
                <option value="smtp">SMTP</option>
              </select>
            </div>
            <div className="col-sm-6 form-group">
              <label htmlFor="email-provider-name">Display name</label>
              <input id="email-provider-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
          </div>
          <div className="row">
            <div className="col-sm-6 form-group">
              <label htmlFor="email-from-name">Sender name</label>
              <input id="email-from-name" className="form-control" value={fromName} onChange={(event) => setFromName(event.target.value)} required />
            </div>
            <div className="col-sm-6 form-group">
              <label htmlFor="email-from-address">Sender address</label>
              <input id="email-from-address" type="email" className="form-control" value={fromAddress} onChange={(event) => setFromAddress(event.target.value)} placeholder="hello@wikitruth.net" required />
            </div>
          </div>
          {type === 'resend' ? (
            <>
              <div className="form-group">
                <label htmlFor="email-api-key">Resend API key {provider?.secretConfigured ? <span className="text-muted">(leave blank to keep saved key)</span> : null}</label>
                <input id="email-api-key" type="password" autoComplete="new-password" className="form-control" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required={!provider?.secretConfigured} />
              </div>
              <div className="form-group">
                <label htmlFor="email-webhook-secret">Resend webhook signing secret <span className="text-muted">(recommended)</span></label>
                <input id="email-webhook-secret" type="password" autoComplete="new-password" className="form-control" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder={provider?.webhookSecretConfigured ? 'Saved — leave blank to keep it' : 'whsec_…'} />
                <p className="help-block">Set the Resend webhook endpoint to <code>/api/email-webhooks/resend</code>.</p>
              </div>
            </>
          ) : (
            <>
              <div className="row">
                <div className="col-sm-7 form-group"><label htmlFor="email-smtp-host">SMTP host</label><input id="email-smtp-host" className="form-control" value={host} onChange={(event) => setHost(event.target.value)} required /></div>
                <div className="col-xs-5 col-sm-2 form-group"><label htmlFor="email-smtp-port">Port</label><input id="email-smtp-port" type="number" min={1} max={65535} className="form-control" value={port} onChange={(event) => setPort(Number(event.target.value))} required /></div>
                <div className="col-xs-7 col-sm-3 form-group"><label htmlFor="email-smtp-security">Security</label><select id="email-smtp-security" className="form-control" value={security} onChange={(event) => setSecurity(event.target.value as 'ssl' | 'starttls')}><option value="starttls">STARTTLS</option><option value="ssl">TLS/SSL</option></select></div>
              </div>
              <div className="row">
                <div className="col-sm-6 form-group"><label htmlFor="email-smtp-user">Username {provider?.usernameMasked ? <span className="text-muted">({provider.usernameMasked})</span> : null}</label><input id="email-smtp-user" className="form-control" autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} required={!provider?.secretConfigured} /></div>
                <div className="col-sm-6 form-group"><label htmlFor="email-smtp-password">Password {provider?.secretConfigured ? <span className="text-muted">(leave blank to keep saved password)</span> : null}</label><input id="email-smtp-password" type="password" className="form-control" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required={!provider?.secretConfigured} /></div>
              </div>
            </>
          )}
          <div className="wt-email-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save provider'}</button>
            <button type="button" className="btn btn-default" onClick={onCancel} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ProviderEditor;
