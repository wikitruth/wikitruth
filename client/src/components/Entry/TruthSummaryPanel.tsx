import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { evidenceBundleUrl, getTruthSummary, type TruthSummary } from '../../services/api/epistemic';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface TruthSummaryPanelProps {
  objectName: 'topic' | 'argument' | 'answer';
  objectId: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  supported: 'Supported by evidence',
  refuted: 'Refuted by evidence',
  mixed: 'Mixed or qualified',
  insufficient_evidence: 'Insufficient evidence',
  permissible: 'Permissible',
  impermissible: 'Impermissible',
  contested: 'Contested',
  not_applicable: 'Not applicable',
};

function humanize(value: string): string {
  return STATUS_LABELS[value] || value.replace(/_/g, ' ');
}

function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not scheduled' : date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const TruthSummaryPanel: React.FC<TruthSummaryPanelProps> = ({ objectName, objectId }) => {
  const [summary, setSummary] = useState<TruthSummary | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const panelId = `truth-summary-panel-${objectId}`;

  useEffect(() => {
    let active = true;
    setFailed(false);
    void getTruthSummary(objectName, objectId)
      .then((result) => { if (active) setSummary(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [objectId, objectName]);

  const decidedChannels = useMemo(() => (
    summary?.channels.filter((channel) => !['pending', 'not_applicable'].includes(channel.status)) || []
  ), [summary]);
  if (!summary && !failed) return null;
  if (failed) return <div className="alert alert-warning small">Verdict explanation is temporarily unavailable.</div>;
  if (!summary) return null;

  return (
    <section className="panel panel-info wt-truth-summary" aria-labelledby={`truth-summary-${objectId}`}>
      <div className="panel-heading">
        <button
          type="button"
          className="btn btn-link wt-truth-summary-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <span>
            <i className="fa fa-balance-scale" aria-hidden="true" />{' '}
            <span id={`truth-summary-${objectId}`}>Why this verdict?</span>
          </span>
          <i className={`fa fa-chevron-${expanded ? 'up' : 'down'} small`} aria-hidden="true" />
        </button>
      </div>
      {expanded ? <div id={panelId} className="panel-body">
        {decidedChannels.length ? decidedChannels.map((channel) => (
          <div key={channel.channel} style={{ marginBottom: 12 }}>
            <div>
              <strong>{channel.channel === 'factual' ? 'Factual' : 'Ethical'}: {humanize(channel.status)}</strong>{' '}
              <span className={`label ${channel.administratorOverride ? 'label-warning' : 'label-success'}`}>
                {channel.administratorOverride ? 'Administrator final say' : 'Reviewer consensus'}
              </span>
              {channel.revalidationDue ? <span className="label label-danger" style={{ marginLeft: 6 }}>Review due</span> : null}
            </div>
            {channel.reasoning ? (
              <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(channel.reasoning) }} />
            ) : <p className="text-muted" style={{ marginTop: 6 }}>No public reasoning has been recorded.</p>}
            {channel.administratorOverride && channel.overrideReason ? (
              <div className="alert alert-warning" style={{ marginTop: 8, marginBottom: 0 }}>
                <strong>Override reason:</strong> {channel.overrideReason}
              </div>
            ) : null}
            <div className="small" style={{ marginTop: 10 }}>
              <p>
                Policy <strong>{channel.policyVersion || 'Not recorded'}</strong> · Sensitivity <strong>{channel.sensitivity}</strong> ·
                {' '}{channel.leadingVotes} of {channel.eligibleVotes} eligible reviewers · {Math.round(channel.averageConfidence)}% average confidence ·
                {' '}{channel.distinctAffiliations} independent affiliations
              </p>
              <p className={channel.revalidationDue ? 'text-danger' : 'text-muted'}>
                Revalidation: <strong>{formatDate(channel.revalidateAt)}</strong>
              </p>
              {channel.dissent.totalVotes ? (
                <div>
                  <strong>Material dissent ({channel.dissent.totalVotes})</strong>
                  <ul>{channel.dissent.rationales.map((rationale, index) => <li key={`${channel.channel}-dissent-${index}`}>{rationale}</li>)}</ul>
                </div>
              ) : <p className="text-muted">No material dissent was recorded in eligible votes.</p>}
            </div>
          </div>
        )) : <p className="text-muted">No final verdict has been published. Contributions remain open for review.</p>}

        {summary.evidenceMap.length ? (
          <div>
            <strong>Evidence used</strong>
            <ul>
              {summary.evidenceMap.map((evidence) => (
                <li key={evidence.artifactId}>
                  <span className="label label-default">{humanize(evidence.relationship)}</span>{' '}
                  <Link to={`/artifacts/entry/${encodeURIComponent(evidence.friendlyUrl)}/${encodeURIComponent(evidence.artifactId)}`}>
                    {evidence.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {summary.unresolvedIssues.length ? (
          <div className="alert alert-warning" style={{ marginBottom: 0 }}>
            <strong>Unresolved critical issues ({summary.unresolvedIssues.length})</strong>
            <ul style={{ marginBottom: 0 }}>
              {summary.unresolvedIssues.map((issue) => (
                <li key={issue.id}>
                  <Link to={`/issues/entry/${encodeURIComponent(issue.friendlyUrl)}/${encodeURIComponent(issue.id)}`}>{issue.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="small" style={{ marginTop: 12 }}>
          <i className="fa fa-download" aria-hidden="true" />{' '}
          <a href={evidenceBundleUrl(objectName, objectId)}>Evidence bundle</a>
          {' · '}
          <a href={evidenceBundleUrl(objectName, objectId, 'jsonld')}>JSON-LD</a>
          <span className="text-muted"> for independent verification and reuse</span>
        </div>
      </div> : null}
    </section>
  );
};

export default TruthSummaryPanel;
