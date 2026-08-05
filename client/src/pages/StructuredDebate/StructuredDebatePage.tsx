import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import Alert from '../../components/common/Alert';
import PageMeta from '../../components/common/PageMeta';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useAuthPrompt } from '../../context/AuthPromptContext';
import {
  createStructuredDebate,
  getStructuredDebate,
  joinStructuredDebate,
  submitStructuredDebateContribution,
  transitionStructuredDebate,
  withdrawStructuredDebate,
  type StructuredDebate,
  type StructuredDebateContributionType,
  type StructuredDebateStance,
  type StructuredDebateTransitionAction,
} from '../../services/api/structuredDebates';
import StructuredDebateWorkspace from './StructuredDebateWorkspace';
import './structuredDebate.css';

const StructuredDebatePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requestSignIn } = useAuthPrompt();
  const [debate, setDebate] = useState<StructuredDebate | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [proposition, setProposition] = useState(searchParams.get('proposition') || '');
  const [participantLimit, setParticipantLimit] = useState(12);
  const [phaseWindowHours, setPhaseWindowHours] = useState(72);

  const reportError = useCallback((cause: unknown) => {
    setSuccess('');
    setError(cause instanceof Error ? cause.message : 'Unable to update this structured debate');
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void getStructuredDebate(id)
      .then((value) => { if (active) { setDebate(value); setError(''); } })
      .catch((cause) => { if (active) reportError(cause); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reportError]);

  const runUpdate = async (message: string, action: () => Promise<StructuredDebate>) => {
    setBusy(true);
    setError('');
    try {
      const value = await action();
      setDebate(value);
      setSuccess(message);
    } catch (cause) {
      reportError(cause);
      throw cause;
    } finally {
      setBusy(false);
    }
  };

  const createPilot = async (event: React.FormEvent) => {
    event.preventDefault();
    const entryObjectName = searchParams.get('entryObjectName') || '';
    const entryId = searchParams.get('entryId') || '';
    if (!entryObjectName || !entryId) {
      setError('Open an entry and choose Structured Debate to start a pilot.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const value = await createStructuredDebate({ entryObjectName, entryId, proposition: proposition.trim(), participantLimit, phaseWindowHours });
      navigate(`/structured-debates/${encodeURIComponent(value.id)}`, { replace: true });
    } catch (cause) {
      reportError(cause);
    } finally {
      setBusy(false);
    }
  };

  if (!id) {
    return (
      <div className="wt-debate-page wt-debate-create-page">
        <PageMeta title="Start a structured-debate pilot" description="Create an opt-in, evidence-linked structured-debate pilot." />
        <div className="wt-debate-create-card">
          <span className="wt-debate-eyebrow">Reviewer pilot tool</span>
          <h1>Start a structured-debate pilot</h1>
          <p>Create a voluntary, phased debate linked to one existing entry. Ordinary discussion remains available and the pilot has no verdict impact.</p>
          {error ? <Alert type="danger">{error}</Alert> : null}
          <form onSubmit={(event) => void createPilot(event)}>
            <label>Proposition<textarea className="form-control" rows={4} minLength={10} maxLength={500} required value={proposition} onChange={(event) => setProposition(event.target.value)} placeholder="State one clear, contestable proposition" /></label>
            <div className="wt-debate-create-grid">
              <label>Participant limit<input className="form-control" type="number" min={2} max={50} value={participantLimit} onChange={(event) => setParticipantLimit(Number(event.target.value))} /></label>
              <label>Hours per phase<input className="form-control" type="number" min={1} max={720} value={phaseWindowHours} onChange={(event) => setPhaseWindowHours(Number(event.target.value))} /></label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || proposition.trim().length < 10}>{busy ? 'Creating…' : 'Create pilot'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="wt-debate-page">
      <PageMeta title={debate ? `${debate.proposition} · Structured debate` : 'Structured debate'} description="An opt-in, evidence-linked structured-debate pilot on Wikitruth." />
      {error ? <Alert type="danger">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}
      {loading ? <div className="wt-debate-loading"><LoadingSpinner message="Loading structured debate…" /></div> : null}
      {debate ? (
        <StructuredDebateWorkspace
          debate={debate}
          signedIn={Boolean(user)}
          busy={busy}
          onSignIn={() => requestSignIn({ intent: 'contribute' })}
          onJoin={(stance: StructuredDebateStance) => runUpdate('You joined the pilot.', () => joinStructuredDebate(debate.id, stance))}
          onWithdraw={() => runUpdate('You withdrew from future phases.', () => withdrawStructuredDebate(debate.id))}
          onSubmit={(input: { contributionType: StructuredDebateContributionType; content: string; evidenceLinks: Array<{ url: string; label: string }> }) => runUpdate('Your contribution is now public.', () => submitStructuredDebateContribution(debate.id, input))}
          onTransition={(action: StructuredDebateTransitionAction, reason: string) => runUpdate('The facilitator action was recorded publicly.', () => transitionStructuredDebate(debate.id, action, reason))}
        />
      ) : null}
    </div>
  );
};

export default StructuredDebatePage;
