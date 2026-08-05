import React, { useMemo, useState } from 'react';
import type {
  StructuredDebate,
  StructuredDebateContributionType,
} from '../../services/api/structuredDebates';

interface StructuredDebateComposerProps {
  debate: StructuredDebate;
  busy: boolean;
  onSubmit: (input: {
    contributionType: StructuredDebateContributionType;
    content: string;
    evidenceLinks: Array<{ url: string; label: string }>;
  }) => Promise<void>;
}

const StructuredDebateComposer: React.FC<StructuredDebateComposerProps> = ({ debate, busy, onSubmit }) => {
  const [contributionType, setContributionType] = useState<StructuredDebateContributionType>('argument');
  const [content, setContent] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const trimmedContent = content.trim();
  const evidenceLinks = useMemo(() => evidenceUrl.trim() ? [{
    url: evidenceUrl.trim(),
    label: evidenceLabel.trim() || 'Supporting evidence',
  }] : [], [evidenceLabel, evidenceUrl]);
  const isValid = trimmedContent.length >= 40 && trimmedContent.length <= 2000 && evidenceLinks.length > 0;

  if (!debate.viewer.participant || debate.viewer.participant.status !== 'active') return null;

  return (
    <section className="wt-debate-composer" aria-labelledby="debate-contribution-title">
      <div className="wt-debate-section-heading">
        <div>
          <span className="wt-debate-eyebrow">Current phase: {debate.currentPhaseKey}</span>
          <h2 id="debate-contribution-title">Add your contribution</h2>
        </div>
        <span className={`wt-debate-turn ${debate.currentTurnStance}`}>{debate.currentTurnStance} turn</span>
      </div>
      {!debate.viewer.canContribute ? (
        <div className="wt-debate-block-reason" role="status">
          <i className="fa fa-clock-o" aria-hidden="true"></i> {debate.viewer.contributionBlockReason}
        </div>
      ) : (
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!isValid || busy) return;
          void onSubmit({ contributionType, content: trimmedContent, evidenceLinks })
            .then(() => {
              setContent('');
              setEvidenceUrl('');
              setEvidenceLabel('');
            })
            .catch(() => undefined);
        }}>
          <div className="wt-debate-composer-grid">
            <label>
              Contribution type
              <select className="form-control" value={contributionType} onChange={(event) => setContributionType(event.target.value as StructuredDebateContributionType)}>
                <option value="argument">Argument</option>
                <option value="evidence">Evidence</option>
                <option value="response">Response</option>
                <option value="clarification">Clarification</option>
                <option value="closing">Closing statement</option>
              </select>
            </label>
            <label>
              Evidence URL
              <input className="form-control" type="url" required placeholder="https://…" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} />
            </label>
            <label>
              Evidence label <span className="text-muted">(optional)</span>
              <input className="form-control" value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} placeholder="What this source establishes" />
            </label>
          </div>
          <label className="wt-debate-content-label">
            Contribution
            <textarea className="form-control" rows={6} minLength={40} maxLength={2000} required value={content} onChange={(event) => setContent(event.target.value)} placeholder="Make one clear, evidence-linked contribution…" />
          </label>
          <div className="wt-debate-composer-footer">
            <small className={trimmedContent.length > 2000 ? 'text-danger' : 'text-muted'}>{trimmedContent.length}/2000 characters · minimum 40</small>
            <button type="submit" className="btn btn-primary" disabled={!isValid || busy}>{busy ? 'Submitting…' : 'Submit contribution'}</button>
          </div>
        </form>
      )}
    </section>
  );
};

export default StructuredDebateComposer;
