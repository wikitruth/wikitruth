import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Select from '../../../components/Form/Select';
import RichTextEditor from '../../../components/Form/RichTextEditor';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import PageMeta from '../../../components/common/PageMeta';
import apiService from '../../../services/api';

const verdictOptions = [
  { value: 'true', label: 'True' },
  { value: 'mostly-true', label: 'Mostly True' },
  { value: 'half-true', label: 'Half True' },
  { value: 'mostly-false', label: 'Mostly False' },
  { value: 'false', label: 'False' },
  { value: 'unknown', label: 'Unknown' },
];

const VerdictUpdatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [verdict, setVerdict] = useState('');
  const [reasoning, setReasoning] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Argument ID is required');
        setLoading(false);
        return;
      }
      try {
        const result = await apiService.getArgumentEntry(id);
        const arg = result?.argument;
        setTitle(arg?.title || '');
        setVerdict(arg?.verdict?.result || '');
        setReasoning((arg as Record<string, unknown>)?.verdictReasoning as string || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load argument');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !verdict) {
      setError('A verdict is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await apiService.updateArgument(id, { verdict, verdictReasoning: reasoning });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verdict');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading argument..." />;

  return (
    <div>
      <PageMeta title="Update Verdict" description={`Update verdict for: ${title}`} />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Arguments', url: '/arguments' }, { title: 'Update Verdict', active: true }]} />
      <PageHeader title="Update Verdict" subtitle={title} icon="gavel" iconColor="text-warning" />

      {error && (
        <Alert type="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <Select
              name="verdict"
              label="Verdict"
              value={verdict}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVerdict(e.target.value)}
              options={verdictOptions}
              required
            />

            <RichTextEditor
              name="reasoning"
              label="Reasoning (optional)"
              value={reasoning}
              onChange={(_: string, html: string) => setReasoning(html)}
              placeholder="Explain the reasoning behind this verdict"
              compact
            />

            <div className="form-group" style={{ marginTop: 24 }}>
              <Button type="submit" variant="warning" disabled={saving} icon={saving ? 'spinner fa-spin' : 'check'}>
                {saving ? 'Saving...' : 'Update Verdict'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate(-1)} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerdictUpdatePage;
