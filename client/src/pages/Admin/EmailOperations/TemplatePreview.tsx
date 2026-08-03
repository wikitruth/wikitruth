import React, { memo, useState } from 'react';
import type { EmailTemplatePreview, EmailTemplateRecord } from '../../../services/api/emailOperations';

interface TemplatePreviewProps {
  template: EmailTemplateRecord | null;
  preview: EmailTemplatePreview | null;
  loading: boolean;
  sending: boolean;
  onSendTest: () => Promise<void>;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, preview, loading, sending, onSendTest }) => {
  const [format, setFormat] = useState<'html' | 'text'>('html');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  return (
    <section className="panel panel-default wt-email-preview" aria-labelledby="email-preview-title">
      <div className="panel-heading wt-email-preview-heading">
        <div>
          <strong id="email-preview-title">{template?.name || 'Template preview'}</strong>
          {preview?.synthetic ? <span className="label label-info">Synthetic preview</span> : null}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => void onSendTest()} disabled={!template || sending}>
          <i className="fa fa-paper-plane" aria-hidden="true" /> {sending ? 'Sending…' : 'Send test to me'}
        </button>
      </div>
      <div className="panel-body">
        <div className="wt-email-preview-toolbar" role="toolbar" aria-label="Email preview controls">
          <div className="btn-group btn-group-sm">
            <button type="button" className={`btn btn-default${format === 'html' ? ' active' : ''}`} aria-pressed={format === 'html'} onClick={() => setFormat('html')}>HTML</button>
            <button type="button" className={`btn btn-default${format === 'text' ? ' active' : ''}`} aria-pressed={format === 'text'} onClick={() => setFormat('text')}>Plain text</button>
          </div>
          {format === 'html' ? (
            <div className="btn-group btn-group-sm">
              <button type="button" className={`btn btn-default${viewport === 'desktop' ? ' active' : ''}`} aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}><i className="fa fa-desktop" aria-hidden="true" /> Desktop</button>
              <button type="button" className={`btn btn-default${viewport === 'mobile' ? ' active' : ''}`} aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}><i className="fa fa-mobile" aria-hidden="true" /> Mobile</button>
            </div>
          ) : null}
        </div>
        {loading ? <p className="text-muted">Rendering preview…</p> : null}
        {!loading && preview ? (
          <>
            <p className="wt-email-preview-subject"><span>Subject</span>{preview.subject}</p>
            {format === 'html' ? (
              <div className={`wt-email-preview-frame ${viewport}`}>
                <iframe title={`${template?.name || 'Email'} synthetic HTML preview`} sandbox="" srcDoc={preview.html} />
              </div>
            ) : <pre className="wt-email-preview-text">{preview.text}</pre>}
          </>
        ) : null}
      </div>
    </section>
  );
};

export default memo(TemplatePreview);
