import React from 'react';

import { useAuth } from '../../context/AuthContext';
import moderationApi, { type ArtifactSourceQuality } from '../../services/api/moderation';

const DIMENSIONS = [
  { key: 'identity', label: 'Identity' },
  { key: 'proximity', label: 'Proximity' },
  { key: 'integrity', label: 'Integrity' },
  { key: 'recency', label: 'Recency' },
  { key: 'reproducibility', label: 'Reproducibility' },
] as const;

type ScoreKey = (typeof DIMENSIONS)[number]['key'];
type Scores = Record<ScoreKey, number>;

interface ArtifactQualityPanelProps {
  artifactId: string;
  initialQuality?: Partial<ArtifactSourceQuality>;
}

function initialScores(quality?: Partial<ArtifactSourceQuality>): Scores {
  return DIMENSIONS.reduce<Scores>((result, dimension) => {
    result[dimension.key] = Number(quality?.[dimension.key] ?? 0);
    return result;
  }, {} as Scores);
}

const ArtifactQualityPanel: React.FC<ArtifactQualityPanelProps> = ({ artifactId, initialQuality }) => {
  const { user } = useAuth();
  const [quality, setQuality] = React.useState<Partial<ArtifactSourceQuality>>(initialQuality || {});
  const [scores, setScores] = React.useState<Scores>(() => initialScores(initialQuality));
  const [notes, setNotes] = React.useState(String(initialQuality?.notes || ''));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const canReview = Boolean(user?.roles?.reviewer || user?.roles?.admin);
  const total = DIMENSIONS.reduce((sum, dimension) => sum + scores[dimension.key], 0);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await moderationApi.reviewArtifactQuality(
        { key: 'artifact', id: artifactId },
        { scores, notes: notes.trim() },
      );
      setQuality(response.sourceQuality);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save source-quality review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel panel-default" aria-labelledby="source-quality-heading">
      <div className="panel-heading">
        <strong id="source-quality-heading">Source Quality</strong>
        <span className="pull-right"><strong>{Number(quality.total ?? total)}/20</strong></span>
      </div>
      <div className="panel-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {quality.reviewUsername ? (
          <p className="text-muted">
            Reviewed by {quality.reviewUsername}{quality.reviewDate ? ` on ${new Date(quality.reviewDate).toLocaleString()}` : ''}
          </p>
        ) : (
          <p className="text-muted">Not yet reviewed against the five-dimension source rubric.</p>
        )}
        {canReview ? (
          <>
            <div className="row">
              {DIMENSIONS.map((dimension) => (
                <div className="col-sm-4" key={dimension.key}>
                  <div className="form-group">
                    <label htmlFor={`quality-${dimension.key}`}>{dimension.label}</label>
                    <select
                      id={`quality-${dimension.key}`}
                      className="form-control"
                      value={String(scores[dimension.key])}
                      onChange={(event) => setScores((current) => ({ ...current, [dimension.key]: Number(event.target.value) }))}
                      disabled={saving}
                    >
                      {[0, 1, 2, 3, 4].map((score) => <option key={score} value={score}>{score}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label htmlFor="quality-notes">Review notes</label>
              <textarea id="quality-notes" className="form-control" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : `Save Quality Review (${total}/20)`}
            </button>
          </>
        ) : quality.notes ? <p>{quality.notes}</p> : null}
      </div>
    </section>
  );
};

export default ArtifactQualityPanel;
