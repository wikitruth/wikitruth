import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import apiService from '../services/api';

const OutlineLinkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get('parentId') || '';
  const parentTitle = searchParams.get('parentTitle') || '';
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId || !targetId.trim()) {
      setError('Both parent and target entry IDs are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiService.createOutlineLink({
        parentId,
        targetId: targetId.trim(),
      });
      setSuccess(true);
      setTimeout(() => navigate(-1), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageMeta title="Link Outline Entry" description="Link an existing entry into an outline" />
      <Breadcrumb items={[{ title: 'Home', url: '/' }, { title: 'Link to Outline', active: true }]} />
      <PageHeader title="Link to Outline" subtitle={parentTitle ? `Under: ${parentTitle}` : 'Link an existing entry'} icon="link" iconColor="text-primary" />

      {success && <Alert type="success">Link created successfully. Redirecting...</Alert>}
      {error && (
        <Alert type="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={handleSubmit}>
            <Input name="parentId" label="Parent Entry ID" value={parentId} onChange={() => {}} disabled />
            <Input
              name="targetId"
              label="Target Entry ID"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Enter the ID of the entry to link"
              required
            />
            <div className="form-group" style={{ marginTop: 24 }}>
              <Button type="submit" variant="primary" disabled={submitting} icon={submitting ? 'spinner fa-spin' : 'link'}>
                {submitting ? 'Linking...' : 'Create Link'}
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

export default OutlineLinkPage;
