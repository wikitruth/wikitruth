import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import translationsApi, { type EntryTranslation } from '../../services/api/translations';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const SUPPORTED = new Set(['topic', 'argument', 'question', 'answer', 'artifact', 'issue', 'opinion']);

interface EntryTranslationsPanelProps {
  objectName: string;
  objectId: string;
  originalTitle: string;
  originalContent: string;
}

const EntryTranslationsPanelContent: React.FC<EntryTranslationsPanelProps> = ({ objectName, objectId, originalTitle, originalContent }) => {
  const { user } = useAuth();
  const [translations, setTranslations] = useState<EntryTranslation[]>([]);
  const [selected, setSelected] = useState('original');
  const [showForm, setShowForm] = useState(false);
  const [locale, setLocale] = useState('');
  const [title, setTitle] = useState(originalTitle);
  const [content, setContent] = useState(originalContent);
  const [reason, setReason] = useState('Reviewed against the current source revision.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canReview = Boolean(user?.roles?.reviewer || user?.roles?.admin);

  const load = useCallback(async () => {
    if (!SUPPORTED.has(objectName) || !objectId) return;
    try {
      setError('');
      const result = await translationsApi.list(objectName, objectId);
      setTranslations(result.translations || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load translations');
    }
  }, [objectId, objectName]);

  useEffect(() => { void load(); }, [load]);

  const active = useMemo(
    () => translations.find((translation) => translation._id === selected),
    [selected, translations],
  );

  const submit = async () => {
    setLoading(true); setError('');
    try {
      await translationsApi.submit(objectName, objectId, { locale, title, content });
      setShowForm(false); setLocale(''); await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit translation');
    } finally { setLoading(false); }
  };

  const review = async (translation: EntryTranslation, action: 'publish' | 'reject') => {
    setLoading(true); setError('');
    try { await translationsApi.review(translation._id, action, reason); await load(); }
    catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'Unable to review translation'); }
    finally { setLoading(false); }
  };

  return (
    <section className="panel panel-default" style={{ marginTop: 20 }} aria-label="Translations">
      <div className="panel-heading clearfix">
        <strong><i className="fa fa-language" aria-hidden="true"></i> Languages</strong>
        {user ? <button type="button" className="btn btn-link btn-xs pull-right" onClick={() => setShowForm((value) => !value)}>Contribute translation</button> : null}
      </div>
      <div className="panel-body">
        {error ? <div className="alert alert-danger" role="alert">{error}</div> : null}
        <div className="form-group" style={{ maxWidth: 340 }}>
          <label htmlFor={`entry-language-${objectId}`}>Read this entry in</label>
          <select id={`entry-language-${objectId}`} className="form-control" value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="original">Original language</option>
            {translations.filter((translation) => translation.status === 'published').map((translation) => (
              <option key={translation._id} value={translation._id}>{translation.locale}{translation.stale ? ' (older revision)' : ''}</option>
            ))}
          </select>
        </div>
        {active ? (
          <article lang={active.locale} className="well well-sm">
            <h3 style={{ marginTop: 5 }}>{active.title}</h3>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(active.content) }} />
            <small className="text-muted">
              Translation of revision {active.sourceRevisionNumber} by {active.createUsername || 'a contributor'}
              {active.authorshipType === 'agent' ? ` via ${active.agentAttribution?.clientName || 'a software agent'}` : ''}
              {active.stale ? '. The source has since changed.' : '.'}
            </small>
          </article>
        ) : null}

        {canReview && translations.some((translation) => translation.status === 'pending') ? (
          <div className="well">
            <strong>Pending translation review</strong>
            <input className="form-control" aria-label="Translation review reason" value={reason} onChange={(event) => setReason(event.target.value)} style={{ margin: '8px 0' }} />
            {translations.filter((translation) => translation.status === 'pending').map((translation) => (
              <div key={translation._id} style={{ marginTop: 8 }}>
                <span className="label label-warning">{translation.locale}</span>{' '}
                {translation.authorshipType === 'agent' ? <span className="label label-info">Agent suggestion</span> : null}{' '}
                {translation.title} {translation.stale ? <span className="label label-danger">stale</span> : null}{' '}
                <button type="button" className="btn btn-success btn-xs" disabled={loading || translation.stale} onClick={() => void review(translation, 'publish')}>Publish</button>{' '}
                <button type="button" className="btn btn-default btn-xs" disabled={loading} onClick={() => void review(translation, 'reject')}>Reject</button>
              </div>
            ))}
          </div>
        ) : null}

        {showForm ? (
          <div className="well">
            <div className="form-group"><label htmlFor={`translation-locale-${objectId}`}>Locale</label><input id={`translation-locale-${objectId}`} className="form-control" placeholder="for example: fil or es-MX" value={locale} onChange={(event) => setLocale(event.target.value)} /></div>
            <div className="form-group"><label htmlFor={`translation-title-${objectId}`}>Translated title</label><input id={`translation-title-${objectId}`} className="form-control" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div className="form-group"><label htmlFor={`translation-content-${objectId}`}>Translated content</label><textarea id={`translation-content-${objectId}`} className="form-control" rows={6} value={content} onChange={(event) => setContent(event.target.value)} /></div>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void submit()}>{loading ? 'Submitting...' : 'Submit for review'}</button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const EntryTranslationsPanel: React.FC<EntryTranslationsPanelProps> = (props) => {
  if (!SUPPORTED.has(props.objectName) || !props.objectId) return null;
  return <EntryTranslationsPanelContent {...props} />;
};

export default EntryTranslationsPanel;
