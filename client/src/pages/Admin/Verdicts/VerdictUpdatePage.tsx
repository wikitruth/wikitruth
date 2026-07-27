import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Select from '../../../components/Form/Select';
import RichTextEditor from '../../../components/Form/RichTextEditor';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PageMeta from '../../../components/common/PageMeta';
import moderationApi, {
  type ModerationEntry,
  type VerdictChannel,
  type VerdictConsensusSummary,
  type VerdictDecisionHistory,
} from '../../../services/api/moderation';
import { useAuth } from '../../../context/AuthContext';

function normalizeType(value: string | null): 'topic' | 'argument' | 'answer' {
  if (value === 'topic' || value === 'answer') return value;
  return 'argument';
}

const LABELS: Record<string, string> = {
  pending: 'Pending review',
  supported: 'Supported by evidence',
  refuted: 'Refuted by evidence',
  mixed: 'Mixed or qualified',
  insufficient_evidence: 'Insufficient evidence',
  permissible: 'Permissible',
  impermissible: 'Impermissible',
  contested: 'Contested',
  not_applicable: 'Not applicable',
  abstain: 'Abstain',
};

function evidenceIds(value: string): string[] {
  return Array.from(new Set(value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)));
}

const VerdictUpdatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const entryType = normalizeType(searchParams.get('type'));
  const target = useMemo(() => ({ key: entryType, id: id || '' }), [entryType, id]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [entry, setEntry] = useState<ModerationEntry | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<VerdictDecisionHistory[]>([]);
  const [channelStatuses, setChannelStatuses] = useState<{ factual: string[]; ethical: string[] }>({ factual: [], ethical: [] });
  const [channel, setChannel] = useState<VerdictChannel>('factual');
  const [voteStatus, setVoteStatus] = useState('supported');
  const [rationale, setRationale] = useState('');
  const [framework, setFramework] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [confidence, setConfidence] = useState(75);
  const [expertise, setExpertise] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [conflictDeclared, setConflictDeclared] = useState(false);
  const [conflictDetails, setConflictDetails] = useState('');
  const [summary, setSummary] = useState<VerdictConsensusSummary | null>(null);
  const [sensitivity, setSensitivity] = useState<'standard' | 'elevated' | 'critical'>('standard');
  const [overrideStatus, setOverrideStatus] = useState('pending');
  const [overrideReasoning, setOverrideReasoning] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [acknowledgeOverride, setAcknowledgeOverride] = useState(false);

  const canOverride = Boolean(user?.roles?.admin);
  const currentChannel = entry?.verdictChannels?.[channel];

  const load = useCallback(async () => {
    if (!id) {
      setError('Entry ID is required');
      setLoading(false);
      return;
    }
    try {
      const [entryResult, votesResult] = await Promise.all([
        moderationApi.entry(target),
        moderationApi.listVerdictVotes(target, channel),
      ]);
      setEntry(entryResult.entry);
      setDecisionHistory(entryResult.decisionHistory || []);
      setChannelStatuses(entryResult.verdictChannelStatuses || { factual: [], ethical: [] });
      setSummary(votesResult.summary);
      setSensitivity(votesResult.summary?.sensitivity || 'standard');
      const current = entryResult.entry?.verdictChannels?.[channel];
      setOverrideStatus(current?.status || 'pending');
      setOverrideReasoning(String(current?.reasoning || ''));
      setFramework(String(current?.framework || ''));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load verdict review');
    } finally {
      setLoading(false);
    }
  }, [channel, id, target]);

  useEffect(() => { void load(); }, [load]);

  const voteStatuses = useMemo(() => [
    ...channelStatuses[channel].filter((status) => status !== 'pending'),
    'abstain',
  ].map((status) => ({ value: status, label: LABELS[status] || status })), [channel, channelStatuses]);
  const overrideStatuses = useMemo(() => channelStatuses[channel].map((status) => ({
    value: status,
    label: LABELS[status] || status,
  })), [channel, channelStatuses]);

  useEffect(() => {
    const first = channelStatuses[channel].find((status) => status !== 'pending') || 'abstain';
    setVoteStatus(first);
    const current = entry?.verdictChannels?.[channel];
    setOverrideStatus(current?.status || 'pending');
    setOverrideReasoning(String(current?.reasoning || ''));
    setFramework(String(current?.framework || ''));
  }, [channel, channelStatuses, entry]);

  const submitVote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const response = await moderationApi.submitVerdictVote(target, {
        channel,
        channelStatus: voteStatus,
        rationale: rationale.trim(),
        framework: channel === 'ethical' ? framework.trim() || undefined : undefined,
        evidenceRefs: evidenceIds(evidenceRefs),
        confidence,
        expertise: expertise.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
        conflictDeclared,
        conflictDetails: conflictDeclared ? conflictDetails.trim() : undefined,
      });
      setSummary(response.summary);
      setMessage(response.decision.published
        ? 'Vote recorded and the channel reached consensus. The final verdict was published.'
        : response.decision.blockedByIssues
          ? `Vote recorded. Consensus exists, but ${response.decision.blockedByIssues} accepted critical issue(s) block publication.`
          : 'Vote recorded. The channel has not reached consensus yet.');
      if (response.decision.published) await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to record vote');
    } finally {
      setSaving(false);
    }
  };

  const updateSensitivity = async () => {
    if (!canOverride) return;
    try {
      setSaving(true);
      setError(null);
      await moderationApi.updateVerdictPolicy(target, sensitivity);
      setMessage(`Verdict sensitivity updated to ${sensitivity}. Existing votes will be re-evaluated against the selected policy.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update verdict sensitivity');
    } finally {
      setSaving(false);
    }
  };

  const submitOverride = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !canOverride) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await moderationApi.updateVerdictChannel(target, {
        channel,
        status: overrideStatus,
        reasoning: overrideReasoning.trim() || undefined,
        framework: channel === 'ethical' ? framework.trim() || undefined : undefined,
        evidenceRefs: evidenceIds(evidenceRefs),
        acknowledgeOverride: true,
        overrideReason: overrideReason.trim(),
      });
      setMessage('Administrator final-say decision recorded with its reason and available consensus snapshot.');
      setAcknowledgeOverride(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to record administrator final say');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading verdict review..." />;

  return (
    <div>
      <PageMeta title="Verdict Review" description={`Review verdict for: ${entry?.title || 'entry'}`} />
      <Breadcrumb items={[
        { title: 'Home', url: '/' },
        { title: 'Admin', url: '/admin' },
        { title: 'Verdict Queue', url: '/admin/verdicts' },
        { title: 'Verdict Review', active: true },
      ]} />
      <PageHeader title="Verdict Review" subtitle={entry?.title || id || ''} icon="gavel" iconColor="text-warning" />

      {error ? <Alert type="danger" dismissible onDismiss={() => setError(null)}>{error}</Alert> : null}
      {message ? <Alert type="success" dismissible onDismiss={() => setMessage(null)}>{message}</Alert> : null}

      <div className="btn-group" role="group" aria-label="Verdict channel">
        {(['factual', 'ethical'] as VerdictChannel[]).map((value) => (
          <button key={value} type="button" className={`btn ${channel === value ? 'btn-primary' : 'btn-default'}`} onClick={() => setChannel(value)}>
            {value === 'factual' ? 'Factual channel' : 'Ethical channel'}
          </button>
        ))}
      </div>

      <div className="panel panel-default">
        <div className="panel-heading"><strong>Decision history</strong></div>
        <div className="panel-body">
          {decisionHistory.length ? (
            <ul className="list-unstyled">
              {decisionHistory.map((decision, index) => (
                <li key={decision._id || `${decision.eventType}-${decision.createDate || index}`} style={{ marginBottom: 10 }}>
                  <strong>{decision.payload?.channel === 'ethical' ? 'Ethical' : 'Factual'}: {LABELS[decision.payload?.status || 'pending'] || decision.payload?.status}</strong>{' '}
                  <span className={`label ${decision.payload?.decisionMode === 'admin_override' ? 'label-warning' : 'label-success'}`}>
                    {decision.payload?.decisionMode === 'admin_override' ? 'Administrator final say' : 'Consensus'}
                  </span>
                  <div className="text-muted small">
                    {decision.actorUsername || 'system'}{decision.createDate ? ` · ${new Date(decision.createDate).toLocaleString()}` : ''}
                    {decision.payload?.policyVersion ? ` · ${decision.payload.policyVersion}` : ''}
                  </div>
                  {decision.message ? <div>{decision.message}</div> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-muted">No final decisions have been recorded yet.</p>}
        </div>
      </div>

      <div className="panel panel-info" style={{ marginTop: 16 }}>
        <div className="panel-heading"><strong>Current final decision</strong></div>
        <div className="panel-body">
          <p><strong>{LABELS[currentChannel?.status || 'pending'] || currentChannel?.status}</strong></p>
          <p>{currentChannel?.reasoning || 'No final reasoning has been published.'}</p>
          <p className="text-muted">
            Decision path: {currentChannel?.decisionMode === 'admin_override' ? 'Administrator final say' : currentChannel?.decisionMode === 'consensus' ? 'Reviewer consensus' : 'Not decided'}
            {currentChannel?.policyVersion ? ` · Policy ${currentChannel.policyVersion}` : ''}
          </p>
          {currentChannel?.overrideReason ? <div className="alert alert-warning"><strong>Override reason:</strong> {currentChannel.overrideReason}</div> : null}
        </div>
      </div>

      <div className="panel panel-default">
        <div className="panel-heading"><strong>Reviewer consensus</strong></div>
        <div className="panel-body">
          {canOverride ? (
            <div className="form-inline" style={{ marginBottom: 12 }}>
              <label htmlFor="verdict-sensitivity">Review sensitivity&nbsp;</label>
              <select
                id="verdict-sensitivity"
                className="form-control input-sm"
                value={sensitivity}
                onChange={(event) => setSensitivity(event.target.value as 'standard' | 'elevated' | 'critical')}
              >
                <option value="standard">Standard</option>
                <option value="elevated">Elevated</option>
                <option value="critical">Critical</option>
              </select>{' '}
              <Button type="button" variant="default" size="sm" disabled={saving} onClick={updateSensitivity}>Apply policy</Button>
            </div>
          ) : null}
          <p>
            Eligible votes: <strong>{summary?.eligibleVotes || 0}</strong> · Required leading votes: <strong>{summary?.threshold || 2}</strong> ·
            Leading result: <strong>{summary?.leadingStatus ? LABELS[summary.leadingStatus] || summary.leadingStatus : 'None'}</strong> ·
            Average confidence: <strong>{Math.round(summary?.leadingAverageConfidence || 0)}%</strong> ·
            Independent affiliations: <strong>{summary?.distinctAffiliations || 0}/{summary?.minimumDistinctAffiliations || 2}</strong>
          </p>
          {(summary?.excludedConflictVotes || summary?.excludedIneligibleVotes || summary?.excludedIndependenceVotes) ? (
            <p className="text-muted small">
              Excluded: {summary?.excludedConflictVotes || 0} conflict · {summary?.excludedIneligibleVotes || 0} ineligible · {summary?.excludedIndependenceVotes || 0} affiliation overlap
            </p>
          ) : null}
          {summary?.dissent?.totalVotes ? (
            <div className="alert alert-warning small">
              <strong>Material dissent ({summary.dissent.totalVotes}):</strong>{' '}
              {summary.dissent.statuses.map((item) => `${LABELS[item.status] || item.status} (${item.count})`).join(', ')}
            </div>
          ) : null}
          <p className={summary?.reached ? 'text-success' : 'text-muted'}>
            {summary?.reached ? 'Consensus threshold reached.' : 'Consensus threshold not yet reached.'}
          </p>
          <form onSubmit={submitVote}>
            <Select name="voteStatus" label="Your vote" value={voteStatus} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setVoteStatus(event.target.value)} options={voteStatuses} required />
            {channel === 'ethical' ? (
              <div className="form-group">
                <label htmlFor="vote-framework">Ethical framework or principle</label>
                <input id="vote-framework" className="form-control" value={framework} onChange={(event) => setFramework(event.target.value)} />
              </div>
            ) : null}
            <RichTextEditor name="voteRationale" label="Vote rationale" value={rationale} onChange={(_name, html) => setRationale(html)} placeholder="Explain your reasoning and how the evidence supports your vote" compact />
            <div className="form-group">
              <label htmlFor="vote-evidence">Artifact evidence IDs</label>
              <input id="vote-evidence" className="form-control" value={evidenceRefs} onChange={(event) => setEvidenceRefs(event.target.value)} placeholder="Comma-separated artifact IDs" />
            </div>
            <div className="row">
              <div className="col-sm-4 form-group">
                <label htmlFor="vote-confidence">Confidence: {confidence}%</label>
                <input id="vote-confidence" type="range" min="0" max="100" className="form-control" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} />
              </div>
              <div className="col-sm-4 form-group">
                <label htmlFor="vote-expertise">Relevant expertise</label>
                <input id="vote-expertise" className="form-control" value={expertise} onChange={(event) => setExpertise(event.target.value)} placeholder="Qualifications or experience" required={sensitivity !== 'standard'} />
              </div>
              <div className="col-sm-4 form-group">
                <label htmlFor="vote-affiliation">Affiliation</label>
                <input id="vote-affiliation" className="form-control" value={affiliation} onChange={(event) => setAffiliation(event.target.value)} placeholder="Organization or independent" required={sensitivity !== 'standard'} />
              </div>
            </div>
            <div className="checkbox">
              <label><input type="checkbox" checked={conflictDeclared} onChange={(event) => setConflictDeclared(event.target.checked)} /> I have a potential conflict of interest</label>
            </div>
            {conflictDeclared ? <div className="form-group"><label htmlFor="conflict-details">Conflict details</label><input id="conflict-details" className="form-control" value={conflictDetails} onChange={(event) => setConflictDetails(event.target.value)} required /></div> : null}
            <Button type="submit" variant="primary" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>{saving ? 'Saving...' : 'Submit Channel Vote'}</Button>
          </form>
        </div>
      </div>

      {canOverride ? (
        <div className="panel panel-warning">
          <div className="panel-heading"><strong>Administrator Final Say</strong></div>
          <div className="panel-body">
            <p>This exceptional path can publish, replace, or clear the final decision. Your reason and the current consensus snapshot will be permanently recorded.</p>
            <form onSubmit={submitOverride}>
              <Select name="overrideStatus" label="Final status" value={overrideStatus} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setOverrideStatus(event.target.value)} options={overrideStatuses} required />
              <RichTextEditor name="overrideReasoning" label="Final decision reasoning" value={overrideReasoning} onChange={(_name, html) => setOverrideReasoning(html)} placeholder="Explain the final decision" compact />
              <div className="form-group"><label htmlFor="override-reason">Why are you overriding or finalizing the decision?</label><textarea id="override-reason" className="form-control" rows={3} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} required /></div>
              <div className="checkbox"><label><input type="checkbox" checked={acknowledgeOverride} onChange={(event) => setAcknowledgeOverride(event.target.checked)} /> I acknowledge that this is an administrator final-say decision and will be publicly distinguishable from consensus.</label></div>
              <Button type="submit" variant="warning" disabled={saving || !acknowledgeOverride} icon="gavel">Record Final Say</Button>
            </form>
          </div>
        </div>
      ) : null}

      <Button type="button" variant="default" onClick={() => navigate('/admin/verdicts')} icon="times">Back to queue</Button>{' '}
      <Link to="/admin/verdicts" className="btn btn-link">View all verdicts</Link>
    </div>
  );
};

export default VerdictUpdatePage;
