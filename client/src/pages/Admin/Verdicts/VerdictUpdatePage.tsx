import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Select from '../../../components/Form/Select';
import RichTextEditor from '../../../components/Form/RichTextEditor';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PageMeta from '../../../components/common/PageMeta';
import moderationApi from '../../../services/api/moderation';

function normalizeType(value: string | null): 'topic' | 'argument' | 'answer' {
  if (value === 'topic' || value === 'answer') {
    return value;
  }
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
};

const VerdictUpdatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const entryType = normalizeType(searchParams.get('type'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [factualStatus, setFactualStatus] = useState('pending');
  const [factualReasoning, setFactualReasoning] = useState('');
  const [ethicalStatus, setEthicalStatus] = useState('pending');
  const [ethicalReasoning, setEthicalReasoning] = useState('');
  const [ethicalFramework, setEthicalFramework] = useState('');
  const [factualStatuses, setFactualStatuses] = useState<string[]>([]);
  const [ethicalStatuses, setEthicalStatuses] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Entry ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = await moderationApi.entry({ key: entryType, id });
        const entry = result.entry;
        const channelStatuses = result.verdictChannelStatuses;
        setTitle(entry?.title || '');
        setFactualStatuses(channelStatuses?.factual || []);
        setEthicalStatuses(channelStatuses?.ethical || []);
        setFactualStatus(entry?.verdictChannels?.factual?.status || 'pending');
        setFactualReasoning(String(entry?.verdictChannels?.factual?.reasoning || ''));
        setEthicalStatus(entry?.verdictChannels?.ethical?.status || 'pending');
        setEthicalReasoning(String(entry?.verdictChannels?.ethical?.reasoning || ''));
        setEthicalFramework(String(entry?.verdictChannels?.ethical?.framework || ''));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load entry');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [entryType, id]);

  const factualOptions = useMemo(() => factualStatuses.map((status) => ({
    value: status,
    label: LABELS[status] || status,
  })), [factualStatuses]);
  const ethicalOptions = useMemo(() => ethicalStatuses.map((status) => ({
    value: status,
    label: LABELS[status] || status,
  })), [ethicalStatuses]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) {
      setError('Entry ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await moderationApi.updateVerdictChannels(
        { key: entryType, id },
        {
          factual: {
            status: factualStatus,
            reasoning: factualReasoning.trim() || undefined,
          },
          ethical: {
            status: ethicalStatus,
            reasoning: ethicalReasoning.trim() || undefined,
            framework: ethicalFramework.trim() || undefined,
          },
        },
      );
      navigate('/admin/verdicts');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update verdict');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading entry..." />;
  }

  return (
    <div>
      <PageMeta title="Update Verdict" description={`Update verdict for: ${title || 'entry'}`} />
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Admin', url: '/admin' },
          { title: 'Verdict Queue', url: '/admin/verdicts' },
          { title: 'Update Verdict', active: true },
        ]}
      />
      <PageHeader title="Update Verdict" subtitle={title || id || ''} icon="gavel" iconColor="text-warning" />

      {error ? (
        <Alert type="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <fieldset>
              <legend>Factual verdict</legend>
              <p className="text-muted">Evaluate whether the claim is supported by evidence, separately from moral judgement.</p>
              <Select
                name="factualStatus"
                label="Evidence status"
                value={factualStatus}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setFactualStatus(event.target.value)}
                options={factualOptions}
                required
              />
              <RichTextEditor
                name="factualReasoning"
                label="Evidence reasoning"
                value={factualReasoning}
                onChange={(_name: string, html: string) => setFactualReasoning(html)}
                placeholder="Explain the evidence supporting this status"
                compact
              />
            </fieldset>

            <fieldset style={{ marginTop: 24 }}>
              <legend>Ethical verdict</legend>
              <p className="text-muted">Evaluate moral or value implications independently and name the framework used.</p>
              <Select
                name="ethicalStatus"
                label="Ethical status"
                value={ethicalStatus}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setEthicalStatus(event.target.value)}
                options={ethicalOptions}
                required
              />
              <div className="form-group">
                <label htmlFor="ethical-framework">Ethical framework or principle</label>
                <input
                  id="ethical-framework"
                  className="form-control"
                  value={ethicalFramework}
                  onChange={(event) => setEthicalFramework(event.target.value)}
                  placeholder="For example: human rights, consequentialism, professional ethics"
                />
              </div>
              <RichTextEditor
                name="ethicalReasoning"
                label="Ethical reasoning"
                value={ethicalReasoning}
                onChange={(_name: string, html: string) => setEthicalReasoning(html)}
                placeholder="Explain the value judgement without presenting it as a factual finding"
                compact
              />
            </fieldset>

            <div className="form-group" style={{ marginTop: 24 }}>
              <Button type="submit" variant="warning" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Update Verdicts'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/admin/verdicts')} icon="times">
                Cancel
              </Button>{' '}
              <Link to="/admin/verdicts" className="btn btn-link">
                Back to queue
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerdictUpdatePage;
