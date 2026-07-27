import React from 'react';
import { useAuth } from '../../context/AuthContext';
import moderationApi, { type ArtifactSourceIntegrity } from '../../services/api/moderation';

interface ArtifactSourceIntegrityPanelProps {
  artifactId: string;
  sourceUrl?: string;
  initialIntegrity?: ArtifactSourceIntegrity;
}

const STATUS_STYLES: Record<string, string> = {
  healthy: 'label-success', changed: 'label-warning', broken: 'label-danger', blocked: 'label-danger', unchecked: 'label-default',
};

function dateLabel(value?: string | Date | null): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not scheduled' : date.toLocaleString();
}

const ArtifactSourceIntegrityPanel: React.FC<ArtifactSourceIntegrityPanelProps> = ({ artifactId, sourceUrl, initialIntegrity }) => {
  const { user } = useAuth();
  const [integrity, setIntegrity] = React.useState<ArtifactSourceIntegrity>(initialIntegrity || { status: 'unchecked' });
  const [checking, setChecking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const canReview = Boolean(user?.roles?.reviewer || user?.roles?.admin);

  const check = async () => {
    try {
      setChecking(true);
      setError(null);
      const response = await moderationApi.checkArtifactSource({ key: 'artifact', id: artifactId });
      setIntegrity(response.sourceIntegrity);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Unable to verify source');
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="panel panel-default" aria-labelledby="source-integrity-heading">
      <div className="panel-heading">
        <strong id="source-integrity-heading">Source Integrity</strong>{' '}
        <span className={`label ${STATUS_STYLES[integrity.status] || 'label-default'}`}>{integrity.status}</span>
      </div>
      <div className="panel-body">
        {error ? <div className="alert alert-danger">{error}</div> : null}
        {!sourceUrl ? <p className="text-muted">Add an original or archive source URL to enable automated integrity checks.</p> : (
          <dl className="dl-horizontal" style={{ marginBottom: canReview ? 12 : 0 }}>
            <dt>Last checked</dt><dd>{dateLabel(integrity.checkedAt)}</dd>
            <dt>Next review</dt><dd>{dateLabel(integrity.nextCheckAt)}</dd>
            {integrity.httpStatus ? <><dt>HTTP status</dt><dd>{integrity.httpStatus}</dd></> : null}
            {integrity.contentHash ? <><dt>Snapshot hash</dt><dd><code>{integrity.contentHash}</code></dd></> : null}
            {integrity.hashMatches === false ? <><dt>Hash comparison</dt><dd className="text-danger">Content changed since the expected checksum</dd></> : null}
            {integrity.error ? <><dt>Check detail</dt><dd className="text-danger">{integrity.error}</dd></> : null}
          </dl>
        )}
        {canReview && sourceUrl ? (
          <button type="button" className="btn btn-default btn-sm" onClick={() => void check()} disabled={checking}>
            <i className={`fa fa-${checking ? 'spinner fa-spin' : 'refresh'}`} /> {checking ? 'Checking safely...' : 'Verify source now'}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default ArtifactSourceIntegrityPanel;

