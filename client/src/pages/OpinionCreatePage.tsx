import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import useForm from '../hooks/useForm';
import apiService from '../services/api';
import { trackEvent } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';

interface OpinionFormValues {
  title: string;
  description: string;
  topicId: string;
  private: boolean;
}

const OpinionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentIdFromQuery = String(searchParams.get('parentId') || '').trim();
  const parentTypeFromQuery = String(searchParams.get('parentType') || '').trim().toLowerCase();
  const topicIdFromQuery = String(
    searchParams.get('topic') ||
      searchParams.get('topicId') ||
      (parentTypeFromQuery === 'topic' ? parentIdFromQuery : ''),
  ).trim();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { addToast } = useNotification();

  const validate = (values: OpinionFormValues) => {
    const errors: Partial<Record<keyof OpinionFormValues, string>> = {};

    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!values.description || values.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: OpinionFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await apiService.createOpinion({
        title: values.title,
        description: values.description,
        topicId: values.topicId || undefined,
        parentId: parentIdFromQuery || undefined,
        parentType: parentTypeFromQuery || undefined,
        private: values.private,
      });
      const createdOpinion = response?.opinion as { _id?: unknown; friendlyUrl?: unknown } | undefined;

      trackEvent('create_opinion', 'content', values.title);
      addToast('success', 'Opinion created successfully!');
      setSubmitSuccess(true);
      setTimeout(() => {
        if (createdOpinion?._id) {
          navigate(`/opinions/entry/${encodeURIComponent(String(createdOpinion.friendlyUrl || createdOpinion._id))}/${encodeURIComponent(String(createdOpinion._id))}`);
          return;
        }
        navigate('/opinions');
      }, 1200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create opinion';
      setSubmitError(msg);
      addToast('danger', msg);
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit, setFieldValue } = useForm<OpinionFormValues>({
    initialValues: {
      title: '',
      description: '',
      topicId: topicIdFromQuery,
      private: false,
    },
    validate,
    onSubmit: handleSubmit,
  });

  return (
    <div>
      <PageMeta title="Share Opinion" description="Add your perspective to the discussion" />
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Opinions', url: '/opinions' },
          { title: 'Share Opinion', active: true },
        ]}
      />

      <PageHeader title="Share Opinion" subtitle="Add your perspective to the discussion" icon="comment" iconColor="text-info" />

      {submitSuccess && <Alert type="success">Opinion created successfully. Redirecting...</Alert>}
      {submitError && (
        <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={onSubmit}>
            <Input
              name="title"
              label="Opinion title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Title your opinion"
              required
              error={touched.title ? errors.title : undefined}
            />

            <RichTextEditor
              name="description"
              label="Opinion details"
              value={values.description}
              onChange={(name, html) => setFieldValue(name as keyof OpinionFormValues, html)}
              onBlur={() => {}}
              placeholder="Write your opinion"
              required
              error={touched.description ? errors.description : undefined}
            />

            <Input
              name="topicId"
              label="Topic ID (optional)"
              value={values.topicId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Attach this opinion to a topic"
            />

            <Checkbox
              name="private"
              label="Make this opinion private"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="info" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Submitting...' : 'Create Opinion'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/opinions')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OpinionCreatePage;
