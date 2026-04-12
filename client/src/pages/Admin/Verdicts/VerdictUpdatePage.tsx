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
import moderationApi, { type ModerationStatusOption } from '../../../services/api/moderation';

const TOPIC_OBJECT_TYPE = 1;
const ARGUMENT_OBJECT_TYPE = 2;

function normalizeType(value: string | null): 'topic' | 'argument' {
  return value === 'topic' ? 'topic' : 'argument';
}

const VerdictUpdatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const entryType = normalizeType(searchParams.get('type'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [verdict, setVerdict] = useState<number>(0);
  const [reasoning, setReasoning] = useState('');
  const [statuses, setStatuses] = useState<ModerationStatusOption[]>([]);
  const [resolvedObjectType, setResolvedObjectType] = useState<number>(
    entryType === 'topic' ? TOPIC_OBJECT_TYPE : ARGUMENT_OBJECT_TYPE,
  );

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
        const nextStatuses = result.verdictStatuses || [];
        setTitle(entry?.title || '');
        setStatuses(nextStatuses);
        setVerdict(
          typeof entry?.verdict?.status === 'number' ? entry.verdict.status : nextStatuses[0]?.code || 0,
        );
        setReasoning(String(entry?.verdict?.reasoning || entry?.verdictReasoning || ''));
        setResolvedObjectType(
          typeof entry?.objectType === 'number'
            ? entry.objectType
            : entryType === 'topic'
              ? TOPIC_OBJECT_TYPE
              : ARGUMENT_OBJECT_TYPE,
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load entry');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [entryType, id]);

  const verdictOptions = useMemo(() => {
    return statuses.map((status) => ({
      value: String(status.code),
      label: status.text,
    }));
  }, [statuses]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) {
      setError('Entry ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const result = await moderationApi.bulkUpdateVerdicts([
        {
          id,
          type: resolvedObjectType,
          status: verdict,
          reasoning: reasoning.trim() || undefined,
        },
      ]);
      const row = result.results[0];
      if (!row?.success) {
        setError(row?.message || 'Failed to update verdict');
        return;
      }
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
            <Select
              name="verdict"
              label="Verdict"
              value={String(verdict)}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setVerdict(Number(event.target.value))}
              options={verdictOptions}
              required
            />

            <RichTextEditor
              name="reasoning"
              label="Reasoning (optional)"
              value={reasoning}
              onChange={(_name: string, html: string) => setReasoning(html)}
              placeholder="Explain the reasoning behind this verdict"
              compact
            />

            <div className="form-group" style={{ marginTop: 24 }}>
              <Button type="submit" variant="warning" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Update Verdict'}
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
