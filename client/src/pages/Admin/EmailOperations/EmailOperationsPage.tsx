import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../../../components/common/PageMeta';
import emailOperationsApi, {
  type EmailOperationsSummary,
  type EmailProviderInput,
  type EmailProviderRecord,
  type EmailTemplatePreview,
} from '../../../services/api/emailOperations';
import ProviderEditor from './ProviderEditor';
import TemplatePreview from './TemplatePreview';
import DeliveryActivity from './DeliveryActivity';
import './emailOperations.css';

type EditorState = EmailProviderRecord | 'new' | null;

const EmailOperationsPage: React.FC = () => {
  const [summary, setSummary] = useState<EmailOperationsSummary | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [contactRecipient, setContactRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [retryingId, setRetryingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await emailOperationsApi.summary();
      setSummary(result);
      setContactRecipient(result.settings.contactRecipient || '');
      setSelectedTemplateKey((current) => current || result.templates[0]?.key || '');
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load email operations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    if (!selectedTemplateKey) return () => { active = false; };
    setPreviewLoading(true);
    emailOperationsApi.preview(selectedTemplateKey)
      .then((result) => { if (active) setPreview(result); })
      .catch((previewError) => { if (active) setError(previewError instanceof Error ? previewError.message : 'Unable to render preview'); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [selectedTemplateKey]);

  const runAction = async (key: string, action: () => Promise<unknown>, success: string) => {
    try {
      setBusy(key);
      setError('');
      setNotice('');
      await action();
      setNotice(success);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Email operation failed');
    } finally {
      setBusy('');
    }
  };

  const saveProvider = async (input: EmailProviderInput) => {
    const current = editor === 'new' ? null : editor;
    await runAction('save-provider', () => current
      ? emailOperationsApi.updateProvider(current.id, input)
      : emailOperationsApi.createProvider(input), current ? 'Provider updated. Verify it again if credentials changed.' : 'Provider saved. Verify delivery before activating it.');
    setEditor(null);
  };

  const removeProvider = async (provider: EmailProviderRecord) => {
    if (!window.confirm(`Remove ${provider.name}? Saved credentials for this provider will be deleted.`)) return;
    await runAction(`remove-${provider.id}`, () => emailOperationsApi.removeProvider(provider.id), 'Provider removed.');
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    await runAction('settings', () => emailOperationsApi.saveSettings(contactRecipient), 'Contact-form recipient updated.');
  };

  const sendTest = async () => {
    if (!selectedTemplateKey) return;
    await runAction('test', () => emailOperationsApi.sendTest(selectedTemplateKey), 'Test sent to your verified administrator email.');
  };

  const retry = async (id: string) => {
    try {
      setRetryingId(id);
      setError('');
      await emailOperationsApi.retryDelivery(id);
      setNotice('Delivery queued for retry.');
      await load();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Unable to retry delivery');
    } finally {
      setRetryingId('');
    }
  };

  const selectedTemplate = summary?.templates.find((template) => template.key === selectedTemplateKey) || null;
  const effective = summary?.effectiveProvider;

  return (
    <div className="container wt-email-operations">
      <PageMeta title="Email Operations" description="Configure providers, preview templates, and monitor Wikitruth email delivery." />
      <div className="wt-email-page-header">
        <div>
          <p className="wt-email-eyebrow"><Link to="/admin">Admin</Link> / Delivery</p>
          <h1><i className="fa fa-envelope-o" aria-hidden="true" /> Email Operations</h1>
          <p className="text-muted">Configure delivery without editing environment files or restarting Wikitruth.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditor('new')} disabled={Boolean(editor)}>
          <i className="fa fa-plus" aria-hidden="true" /> Add provider
        </button>
      </div>

      {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
      {notice ? <div className="alert alert-success" role="status">{notice}</div> : null}
      {loading && !summary ? <p className="text-muted">Loading email operations…</p> : null}

      {summary ? (
        <>
          <section className={`wt-email-status ${effective?.configured ? 'configured' : 'unconfigured'}`} aria-label="Email delivery status">
            <span className="wt-email-status-icon"><i className={`fa ${effective?.configured ? 'fa-check-circle' : 'fa-exclamation-circle'}`} aria-hidden="true" /></span>
            <div>
              <strong>{effective?.configured ? `${effective.name} is available` : 'Email delivery needs a provider'}</strong>
              <p>{effective?.configured ? `${effective.type.toUpperCase()} · ${effective.source === 'admin' ? 'Managed here and loaded live' : 'Environment fallback in use'}` : 'Add, verify, and activate a Resend or SMTP provider.'}</p>
            </div>
            {effective?.source === 'environment' ? <span className="label label-warning">Migration fallback</span> : null}
          </section>

          {editor ? <ProviderEditor key={editor === 'new' ? 'new' : editor.id} provider={editor === 'new' ? null : editor} saving={busy === 'save-provider'} onCancel={() => setEditor(null)} onSave={saveProvider} /> : null}

          <div className="row wt-email-top-grid">
            <div className="col-md-8">
              <section className="panel panel-default" aria-labelledby="email-providers-title">
                <div className="panel-heading"><strong id="email-providers-title">Delivery providers</strong><span className="text-muted">Verify before activation</span></div>
                <div className="panel-body wt-email-provider-list">
                  {summary.providers.length ? summary.providers.map((provider) => (
                    <article className={`wt-email-provider-card${provider.active ? ' active' : ''}`} key={provider.id}>
                      <div className="wt-email-provider-main">
                        <span className={`wt-email-provider-mark ${provider.type}`} aria-hidden="true">{provider.type === 'resend' ? 'R' : <i className="fa fa-server" />}</span>
                        <div>
                          <div className="wt-email-provider-title"><strong>{provider.name}</strong>{provider.active ? <span className="label label-success">Active</span> : null}{!provider.enabled ? <span className="label label-default">Disabled</span> : null}</div>
                          <p>{provider.fromName} &lt;{provider.fromAddress}&gt;</p>
                          <small className={provider.verifiedAt ? 'text-success' : 'text-muted'}>{provider.verifiedAt ? `Verified ${new Date(provider.verifiedAt).toLocaleString()}` : 'Not verified'}{provider.lastError ? ` · ${provider.lastError}` : ''}</small>
                        </div>
                      </div>
                      <div className="wt-email-provider-actions">
                        <button type="button" className="btn btn-default btn-xs" onClick={() => setEditor(provider)} disabled={Boolean(editor)}>Edit</button>
                        <button type="button" className="btn btn-info btn-xs" onClick={() => void runAction(`verify-${provider.id}`, () => emailOperationsApi.verifyProvider(provider.id), 'Verification email delivered.')} disabled={busy === `verify-${provider.id}` || !provider.enabled}>{busy === `verify-${provider.id}` ? 'Verifying…' : 'Verify'}</button>
                        {!provider.active ? <button type="button" className="btn btn-success btn-xs" onClick={() => void runAction(`activate-${provider.id}`, () => emailOperationsApi.activateProvider(provider.id), 'Provider activated. New messages will use it immediately.')} disabled={!provider.verifiedAt || !provider.enabled}>Activate</button> : null}
                        <button type="button" className="btn btn-default btn-xs" onClick={() => void runAction(`enable-${provider.id}`, () => emailOperationsApi.setProviderEnabled(provider.id, !provider.enabled), provider.enabled ? 'Provider disabled.' : 'Provider enabled.')}>{provider.enabled ? 'Disable' : 'Enable'}</button>
                        {!provider.active ? <button type="button" className="btn btn-link btn-xs text-danger" onClick={() => void removeProvider(provider)}>Remove</button> : null}
                      </div>
                    </article>
                  )) : <div className="wt-email-empty"><i className="fa fa-plug" aria-hidden="true" /><strong>No administrator-managed provider yet</strong><p>Add Resend for the simplest API delivery, or SMTP for an existing mail service.</p></div>}
                </div>
              </section>
            </div>
            <div className="col-md-4">
              <section className="panel panel-default" aria-labelledby="email-routing-title">
                <div className="panel-heading"><strong id="email-routing-title">Message routing</strong></div>
                <div className="panel-body">
                  <form onSubmit={saveSettings}>
                    <div className="form-group"><label htmlFor="contact-recipient">Contact-form recipient</label><input id="contact-recipient" type="email" className="form-control" value={contactRecipient} onChange={(event) => setContactRecipient(event.target.value)} placeholder="team@wikitruth.net" /><p className="help-block">Public contact messages are queued here. Leave blank to disable admin-managed routing and retain the migration fallback.</p></div>
                    <button type="submit" className="btn btn-default" disabled={busy === 'settings'}>{busy === 'settings' ? 'Saving…' : 'Save routing'}</button>
                  </form>
                </div>
              </section>
            </div>
          </div>

          <section className="wt-email-template-section" aria-labelledby="email-templates-title">
            <div className="wt-email-section-heading"><div><h2 id="email-templates-title">Template catalog</h2><p className="text-muted">Repository-owned, responsive HTML and plain-text messages with synthetic preview data.</p></div></div>
            <div className="row">
              <div className="col-md-4">
                <div className="list-group wt-email-template-list">
                  {summary.templates.map((template) => <button key={template.key} type="button" className={`list-group-item${selectedTemplateKey === template.key ? ' active' : ''}`} onClick={() => setSelectedTemplateKey(template.key)}><span className="wt-email-template-icon"><i className="fa fa-file-text-o" aria-hidden="true" /></span><span><strong>{template.name}</strong><small>{template.purpose}</small></span><i className="fa fa-chevron-right" aria-hidden="true" /></button>)}
                </div>
              </div>
              <div className="col-md-8"><TemplatePreview template={selectedTemplate} preview={preview} loading={previewLoading} sending={busy === 'test'} onSendTest={sendTest} /></div>
            </div>
          </section>

          <DeliveryActivity deliveries={summary.deliveries} retryingId={retryingId} onRetry={retry} />
        </>
      ) : null}
    </div>
  );
};

export default EmailOperationsPage;
