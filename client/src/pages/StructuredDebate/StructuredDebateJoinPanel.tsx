import React, { useState } from 'react';
import type { StructuredDebate, StructuredDebateStance } from '../../services/api/structuredDebates';

interface StructuredDebateJoinPanelProps {
  debate: StructuredDebate;
  signedIn: boolean;
  busy: boolean;
  onSignIn: () => void;
  onJoin: (stance: StructuredDebateStance) => Promise<void>;
  onWithdraw: () => Promise<void>;
}

const StructuredDebateJoinPanel: React.FC<StructuredDebateJoinPanelProps> = ({
  debate,
  signedIn,
  busy,
  onSignIn,
  onJoin,
  onWithdraw,
}) => {
  const [stance, setStance] = useState<StructuredDebateStance>('supports');
  const [formatAccepted, setFormatAccepted] = useState(false);
  const [attributionAccepted, setAttributionAccepted] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const participant = debate.viewer.participant;

  if (participant) {
    return (
      <section className={`wt-debate-participation ${participant.stance}`} aria-labelledby="debate-participation-title">
        <div>
          <span className="wt-debate-eyebrow" id="debate-participation-title">Your participation</span>
          <strong>{participant.stance === 'supports' ? 'Supporting' : 'Challenging'} the proposition</strong>
          <small>
            {participant.status === 'active'
              ? `Current turn: ${debate.currentTurnStance}. Your stance is locked for this pilot.`
              : 'You withdrew. Earlier contributions remain public as part of the audit record.'}
          </small>
        </div>
        {participant.status === 'active' ? (
          confirmWithdraw ? (
            <div className="wt-debate-inline-confirm" role="group" aria-label="Confirm withdrawal">
              <span>Withdraw from future phases?</span>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onWithdraw().catch(() => undefined)}>Confirm</button>
              <button type="button" className="btn btn-default" disabled={busy} onClick={() => setConfirmWithdraw(false)}>Keep participating</button>
            </div>
          ) : (
            <button type="button" className="btn btn-link" disabled={busy} onClick={() => setConfirmWithdraw(true)}>Withdraw</button>
          )
        ) : null}
      </section>
    );
  }

  if (!signedIn) {
    return (
      <section className="wt-debate-join wt-debate-callout">
        <div>
          <span className="wt-debate-eyebrow">Participation is optional</span>
          <strong>Sign in to choose a stance</strong>
          <p>You can read this pilot publicly without joining. Ordinary discussion remains available.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onSignIn}>Sign in to participate</button>
      </section>
    );
  }

  if (!debate.viewer.canJoin) {
    return (
      <section className="wt-debate-callout" role="status">
        <strong>Participation is not available</strong>
        <p>{debate.status === 'open' ? 'This pilot has reached its participant limit.' : `This pilot is ${debate.status}.`}</p>
      </section>
    );
  }

  const canSubmit = formatAccepted && attributionAccepted && !busy;
  return (
    <section className="wt-debate-join" aria-labelledby="debate-join-title">
      <div className="wt-debate-join-heading">
        <div>
          <span className="wt-debate-eyebrow">Opt-in pilot</span>
          <h2 id="debate-join-title">Choose how you will participate</h2>
        </div>
        <span>{debate.participants.filter((item) => item.status === 'active').length}/{debate.format.participantLimit} active participants</span>
      </div>
      <fieldset className="wt-debate-stance-picker">
        <legend>Stance</legend>
        <label className={stance === 'supports' ? 'is-selected supports' : 'supports'}>
          <input type="radio" name="debate-stance" value="supports" checked={stance === 'supports'} onChange={() => setStance('supports')} />
          <span><strong>Support</strong><small>Present the strongest case for the proposition.</small></span>
        </label>
        <label className={stance === 'challenges' ? 'is-selected challenges' : 'challenges'}>
          <input type="radio" name="debate-stance" value="challenges" checked={stance === 'challenges'} onChange={() => setStance('challenges')} />
          <span><strong>Challenge</strong><small>Test the proposition with evidence and counterarguments.</small></span>
        </label>
      </fieldset>
      <div className="wt-debate-consent">
        <label><input type="checkbox" checked={formatAccepted} onChange={(event) => setFormatAccepted(event.target.checked)} /> I accept the pilot format, phased turns, and evidence rules.</label>
        <label><input type="checkbox" checked={attributionAccepted} onChange={(event) => setAttributionAccepted(event.target.checked)} /> I accept public attribution by username. My pilot history remains public if I withdraw.</label>
      </div>
      <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={() => void onJoin(stance).catch(() => undefined)}>
        {busy ? 'Joining…' : `Join the ${stance === 'supports' ? 'supporting' : 'challenging'} side`}
      </button>
    </section>
  );
};

export default StructuredDebateJoinPanel;
