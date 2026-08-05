import React from 'react';
import type {
  StructuredDebate,
  StructuredDebateAuditEvent,
  StructuredDebateContribution,
  StructuredDebateStance,
} from '../../services/api/structuredDebates';

export type StructuredDebateMobileView = 'supports' | 'audit' | 'challenges';

interface StructuredDebateLanesProps {
  debate: StructuredDebate;
  mobileView: StructuredDebateMobileView;
  onMobileViewChange: (view: StructuredDebateMobileView) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const ContributionCard: React.FC<{ contribution: StructuredDebateContribution }> = ({ contribution }) => (
  <article className={`wt-debate-contribution ${contribution.stance}`}>
    <header>
      <span className="wt-debate-avatar" aria-hidden="true">{contribution.publicUsername.charAt(0).toUpperCase()}</span>
      <span><strong>{contribution.publicUsername}</strong><small>{contribution.contributionType} · {contribution.phaseKey}</small></span>
      <time dateTime={contribution.createDate}>{formatDate(contribution.createDate)}</time>
    </header>
    <p>{contribution.content}</p>
    {contribution.evidenceLinks.length ? (
      <ul className="wt-debate-evidence" aria-label="Evidence links">
        {contribution.evidenceLinks.map((link) => (
          <li key={`${contribution.id}-${link.url}`}><a href={link.url} target="_blank" rel="noreferrer"><i className="fa fa-external-link" aria-hidden="true"></i> {link.label}</a></li>
        ))}
      </ul>
    ) : null}
  </article>
);

const DebateLane: React.FC<{
  stance: StructuredDebateStance;
  contributions: StructuredDebateContribution[];
  className: string;
}> = ({ stance, contributions, className }) => (
  <section className={`wt-debate-lane ${stance} ${className}`} aria-labelledby={`${stance}-lane-title`}>
    <header>
      <span className="wt-debate-lane-mark" aria-hidden="true"><i className={`fa ${stance === 'supports' ? 'fa-arrow-up' : 'fa-bolt'}`}></i></span>
      <div><h2 id={`${stance}-lane-title`}>{stance === 'supports' ? 'Supports' : 'Challenges'}</h2><small>{contributions.length} public contribution{contributions.length === 1 ? '' : 's'}</small></div>
    </header>
    <div className="wt-debate-contribution-list">
      {contributions.length ? contributions.map((item) => <ContributionCard contribution={item} key={item.id} />) : (
        <p className="wt-debate-empty">No {stance === 'supports' ? 'supporting' : 'challenging'} contribution has been submitted yet.</p>
      )}
    </div>
  </section>
);

const AuditItem: React.FC<{ event: StructuredDebateAuditEvent }> = ({ event }) => (
  <li>
    <span className="wt-debate-audit-dot" aria-hidden="true"></span>
    <div>
      <strong>{event.label}</strong>
      <span>{event.actor}{event.stance ? ` · ${event.stance}` : ''}{event.publicReason ? ` · ${event.publicReason}` : ''}</span>
      <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
    </div>
  </li>
);

const StructuredDebateLanes: React.FC<StructuredDebateLanesProps> = ({ debate, mobileView, onMobileViewChange }) => {
  const supporting = debate.contributions.filter((item) => item.stance === 'supports');
  const challenging = debate.contributions.filter((item) => item.stance === 'challenges');
  return (
    <section aria-label="Structured debate contributions">
      <div className="wt-debate-mobile-tabs" role="tablist" aria-label="Debate views">
        {(['supports', 'audit', 'challenges'] as const).map((view) => (
          <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? 'is-active' : ''} onClick={() => onMobileViewChange(view)}>
            {view === 'audit' ? 'Audit' : view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>
      <div className="wt-debate-lanes">
        <DebateLane stance="supports" contributions={supporting} className={mobileView === 'supports' ? 'is-mobile-active' : ''} />
        <section className={`wt-debate-audit ${mobileView === 'audit' ? 'is-mobile-active' : ''}`} aria-labelledby="debate-audit-title">
          <header><i className="fa fa-shield" aria-hidden="true"></i><h2 id="debate-audit-title">Public audit</h2></header>
          <p>Phases, participation, and facilitator actions are recorded. This pilot does not determine a verdict.</p>
          <ol>{debate.audit.map((event, index) => <AuditItem event={event} key={`${event.eventType}-${event.occurredAt}-${index}`} />)}</ol>
        </section>
        <DebateLane stance="challenges" contributions={challenging} className={mobileView === 'challenges' ? 'is-mobile-active' : ''} />
      </div>
    </section>
  );
};

export default StructuredDebateLanes;
