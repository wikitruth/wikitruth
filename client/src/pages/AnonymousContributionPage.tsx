import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import Alert from '../components/common/Alert';
import Breadcrumb from '../components/common/Breadcrumb';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import PageMeta from '../components/common/PageMeta';
import Input from '../components/Form/Input';
import Select from '../components/Form/Select';
import TextArea from '../components/Form/TextArea';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import type {
  AnonymousContribution,
  AnonymousContributionConfigResponse,
  AnonymousEntryType,
} from '../types/api';

const RECEIPT_STORAGE_KEY = 'wikitruth.anonymousContributionReceipt.v1';

type Receipt = { id: string; token: string };

const TYPE_OPTIONS = [
  { value: 'topic', label: 'Topic' },
  { value: 'argument', label: 'Fact or argument' },
  { value: 'question', label: 'Question' },
  { value: 'answer', label: 'Answer' },
  { value: 'issue', label: 'Issue' },
  { value: 'opinion', label: 'Comment or opinion' },
  { value: 'artifact', label: 'Artifact or evidence' },
];

const AnonymousContributionPage: React.FC = () => {
  const { user } = useAuth();
  const formStartedAt = useRef(Date.now());
  const [config, setConfig] = useState<AnonymousContributionConfigResponse | null>(null);
  const [entryType, setEntryType] = useState<AnonymousEntryType>('topic');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [references, setReferences] = useState('');
  const [parentType, setParentType] = useState('');
  const [parentId, setParentId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [submission, setSubmission] = useState<AnonymousContribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await apiService.getAnonymousContributionConfig();
        if (!mounted) return;
        setConfig(result);
        const stored = window.localStorage.getItem(RECEIPT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Receipt;
          if (parsed.id && parsed.token) setReceipt(parsed);
        }
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load contribution form.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const checkStatus = async (currentReceipt: Receipt) => {
    try {
      setCheckingStatus(true);
      setError(null);
      const result = await apiService.getAnonymousContributionStatus(currentReceipt.id, currentReceipt.token);
      setSubmission(result.submission || null);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to check submission status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const result = await apiService.submitAnonymousContribution({
        entryType,
        title,
        content,
        references,
        parentType,
        parentId,
        contactEmail,
        website,
        formStartedAt: formStartedAt.current,
      });
      if (!result.receipt) throw new Error('Submission receipt was not returned.');
      setReceipt(result.receipt);
      setSubmission(result.submission || null);
      window.localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(result.receipt));
      setTitle('');
      setContent('');
      setReferences('');
      setParentType('');
      setParentId('');
      setContactEmail('');
      formStartedAt.current = Date.now();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearReceipt = () => {
    window.localStorage.removeItem(RECEIPT_STORAGE_KEY);
    setReceipt(null);
    setSubmission(null);
  };

  return (
    <div>
      <PageMeta title="Contribute Anonymously" description="Submit a contribution for screening without creating an account" />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Contribute Anonymously', active: true }]} />
      <PageHeader
        title="Contribute Anonymously"
        subtitle="Send a proposal to the screening queue without publishing it directly"
        icon="user-secret"
        iconColor="text-info"
      />

      {error ? <Alert type="danger" dismissible onDismiss={() => setError(null)}>{error}</Alert> : null}
      {user ? (
        <Alert type="info">
          You are signed in as <strong>{user.username}</strong>. Use the <Link to="/create">normal editor</Link> so your work is attributed to you.
        </Alert>
      ) : null}
      {!loading && config && !config.enabled ? (
        <Alert type="warning">Anonymous contributions are currently disabled. You can still <Link to="/signup">create an account</Link>.</Alert>
      ) : null}

      {receipt ? (
        <div className="panel panel-success">
          <div className="panel-heading"><strong>Submission receipt</strong></div>
          <div className="panel-body">
            <p>Keep this browser receipt to check the screening result. It does not reveal your network identity.</p>
            <p><code>{receipt.id}</code></p>
            {submission ? (
              <Alert type={submission.status === 'rejected' ? 'warning' : 'info'}>
                Status: <strong>{submission.status.replace('_', ' ')}</strong>
                {submission.moderation?.reason ? <span> — {submission.moderation.reason}</span> : null}
              </Alert>
            ) : null}
            <Button variant="default" disabled={checkingStatus} onClick={() => void checkStatus(receipt)}>{checkingStatus ? 'Checking...' : 'Check status'}</Button>{' '}
            <Button variant="link" onClick={clearReceipt}>Clear receipt</Button>
          </div>
        </div>
      ) : null}

      {!user && config?.enabled ? (
        <form onSubmit={submit} className="panel panel-default">
          <div className="panel-heading"><strong>Contribution proposal</strong></div>
          <div className="panel-body">
            <Alert type="info">
              Anonymous proposals are rate-limited, screened by people, and never published automatically. Do not include private or identifying information.
            </Alert>
            <Select name="entryType" label="Contribution type" value={entryType} options={TYPE_OPTIONS} onChange={(event) => setEntryType(event.target.value as AnonymousEntryType)} required />
            <Input name="title" label="Title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={config.limits.maximumTitleLength} required />
            <TextArea name="content" label="Contribution" value={content} onChange={(event) => setContent(event.target.value)} rows={9} maxLength={config.limits.maximumContentLength} required />
            <TextArea name="references" label="Sources or references" value={references} onChange={(event) => setReferences(event.target.value)} rows={4} maxLength={config.limits.maximumReferencesLength} placeholder="Include source URLs or citations when available." />
            <div className="row">
              <div className="col-sm-6"><Input name="parentType" label="Related entry type (optional)" value={parentType} onChange={(event) => setParentType(event.target.value)} placeholder="topic, question, artifact..." /></div>
              <div className="col-sm-6"><Input name="parentId" label="Related entry ID (optional)" value={parentId} onChange={(event) => setParentId(event.target.value)} /></div>
            </div>
            <Input name="contactEmail" type="email" label="Contact email (optional)" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Only screeners can see this; leave blank to remain fully anonymous" />
            <div className="sr-only" aria-hidden="true">
              <label htmlFor="anonymous-website">Website</label>
              <input id="anonymous-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
            </div>
          </div>
          <div className="panel-footer">
            <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit for screening'}</Button>
            <span className="text-muted" style={{ marginLeft: 12 }}>Limit: {config.limits.perHour}/hour and {config.limits.perDay}/day per anonymous source.</span>
          </div>
        </form>
      ) : null}
    </div>
  );
};

export default AnonymousContributionPage;
