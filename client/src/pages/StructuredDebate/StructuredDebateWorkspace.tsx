import React, { useState } from 'react';
import { Link } from 'react-router';
import type {
  StructuredDebate,
  StructuredDebateContributionType,
  StructuredDebateStance,
  StructuredDebateTransitionAction,
} from '../../services/api/structuredDebates';
import StructuredDebateComposer from './StructuredDebateComposer';
import StructuredDebateControls from './StructuredDebateControls';
import StructuredDebateJoinPanel from './StructuredDebateJoinPanel';
import StructuredDebateLanes, { type StructuredDebateMobileView } from './StructuredDebateLanes';

interface StructuredDebateWorkspaceProps {
  debate: StructuredDebate;
  signedIn: boolean;
  busy: boolean;
  onSignIn: () => void;
  onJoin: (stance: StructuredDebateStance) => Promise<void>;
  onWithdraw: () => Promise<void>;
  onSubmit: (input: {
    contributionType: StructuredDebateContributionType;
    content: string;
    evidenceLinks: Array<{ url: string; label: string }>;
  }) => Promise<void>;
  onTransition: (action: StructuredDebateTransitionAction, publicReason: string) => Promise<void>;
}

function dueLabel(value: string | null): string {
  if (!value) return 'Facilitator paced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Facilitator paced';
  return `Due ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)}`;
}

const StructuredDebateWorkspace: React.FC<StructuredDebateWorkspaceProps> = ({
  debate,
  signedIn,
  busy,
  onSignIn,
  onJoin,
  onWithdraw,
  onSubmit,
  onTransition,
}) => {
  const [mobileView, setMobileView] = useState<StructuredDebateMobileView>('supports');
  const activePhase = debate.phases.find((phase) => phase.key === debate.currentPhaseKey);

  return (
    <div className="wt-debate-workspace">
      <nav className="wt-debate-breadcrumb" aria-label="Breadcrumb">
        <Link to={debate.entry.path}><i className="fa fa-file-text-o" aria-hidden="true"></i> {debate.entry.title}</Link>
        <i className="fa fa-chevron-right" aria-hidden="true"></i>
        <span>Structured debate</span>
      </nav>

      <header className="wt-debate-hero">
        <div>
          <span className={`wt-debate-status ${debate.status}`}>{debate.status}</span>
          <span className="wt-debate-eyebrow">Opt-in structured-debate pilot</span>
          <h1>{debate.proposition}</h1>
          <p>Evidence-linked turns around a shared proposition. Participation is optional and this pilot does not decide the entry’s verdict.</p>
        </div>
        <div className="wt-debate-hero-actions">
          <Link className="btn btn-default" to={debate.entry.discussionPath}><i className="fa fa-comments-o" aria-hidden="true"></i> Open ordinary discussion</Link>
          <Link className="btn btn-link" to={debate.entry.path}>Open source entry</Link>
        </div>
      </header>

      <section className="wt-debate-phase-panel" aria-labelledby="debate-phase-title">
        <div className="wt-debate-section-heading">
          <div><span className="wt-debate-eyebrow">Structured cadence</span><h2 id="debate-phase-title">{activePhase?.label || debate.currentPhaseKey}</h2></div>
          <span>{dueLabel(activePhase?.dueAt || null)}</span>
        </div>
        <ol className="wt-debate-phases">
          {debate.phases.map((phase) => (
            <li className={phase.status} key={phase.key} aria-current={phase.status === 'active' ? 'step' : undefined}>
              <span>{phase.order}</span><strong>{phase.label}</strong><small>{phase.status}</small>
            </li>
          ))}
        </ol>
        <div className="wt-debate-format-summary">
          <span><i className="fa fa-exchange" aria-hidden="true"></i> Alternating stances</span>
          <span><i className="fa fa-link" aria-hidden="true"></i> Evidence required</span>
          <span><i className="fa fa-balance-scale" aria-hidden="true"></i> No verdict impact</span>
        </div>
      </section>

      <StructuredDebateJoinPanel debate={debate} signedIn={signedIn} busy={busy} onSignIn={onSignIn} onJoin={onJoin} onWithdraw={onWithdraw} />
      <StructuredDebateLanes debate={debate} mobileView={mobileView} onMobileViewChange={setMobileView} />
      <StructuredDebateComposer debate={debate} busy={busy} onSubmit={onSubmit} />
      <StructuredDebateControls debate={debate} busy={busy} onTransition={onTransition} />

      <details className="wt-debate-disclosure">
        <summary><span><i className="fa fa-info-circle" aria-hidden="true"></i> Pilot rules and public record</span><i className="fa fa-chevron-down" aria-hidden="true"></i></summary>
        <div>
          <p>This is an opt-in experiment. It does not replace ordinary Wikitruth replies, screening, or verdict governance.</p>
          <ul>
            <li>Participants choose one public stance and alternate contributions by phase.</li>
            <li>Public usernames, contributions, evidence links, withdrawals, and facilitator actions form a durable public audit record.</li>
            <li>Account IDs, email addresses, and private security information are never included in the public projection.</li>
          </ul>
        </div>
      </details>
    </div>
  );
};

export default StructuredDebateWorkspace;
