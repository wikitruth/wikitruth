import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import Select from '../components/Form/Select';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import useForm from '../hooks/useForm';
import apiService from '../services/api';
import { trackEvent } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';

interface IssueFormValues {
  title: string;
  description: string;
  topicId: string;
  issueType: string;
  private: boolean;
}

const IssueCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdFromQuery = String(searchParams.get('topicId') || searchParams.get('topic') || '').trim();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { addToast } = useNotification();

  const validate = (values: IssueFormValues) => {
    const errors: Partial<Record<keyof IssueFormValues, string>> = {};

    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!values.description || values.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: IssueFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await apiService.createIssue({
        title: values.title,
        description: values.description,
        topicId: values.topicId || undefined,
        issueType: Number(values.issueType || '100'),
        private: values.private,
      });
      const createdIssue = response?.issue as { _id?: unknown; friendlyUrl?: unknown } | undefined;

      trackEvent('create_issue', 'content', values.title);
      addToast('success', 'Issue created successfully!');
      setSubmitSuccess(true);
      setTimeout(() => {
        if (createdIssue?._id) {
          navigate(`/issues/entry/${encodeURIComponent(String(createdIssue.friendlyUrl || createdIssue._id))}/${encodeURIComponent(String(createdIssue._id))}`);
          return;
        }
        navigate('/issues');
      }, 1200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create issue';
      setSubmitError(msg);
      addToast('danger', msg);
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit, setFieldValue } = useForm<IssueFormValues>({
    initialValues: {
      title: '',
      description: '',
      topicId: topicIdFromQuery,
      issueType: '100',
      private: false,
    },
    validate,
    onSubmit: handleSubmit,
  });

  return (
    <div>
      <PageMeta title="Report Issue" description="Raise a problem or concern" />
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Issues', url: '/issues' },
          { title: 'Report Issue', active: true },
        ]}
      />

      <PageHeader title="Report Issue" subtitle="Raise a problem or concern" icon="exclamation-triangle" iconColor="text-warning" />

      {submitSuccess && <Alert type="success">Issue created successfully. Redirecting...</Alert>}
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
              label="Issue title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Describe the issue briefly"
              required
              error={touched.title ? errors.title : undefined}
            />

            <RichTextEditor
              name="description"
              label="Issue details"
              value={values.description}
              onChange={(name, html) => setFieldValue(name as keyof IssueFormValues, html)}
              onBlur={() => {}}
              placeholder="Provide full details of the issue"
              required
              error={touched.description ? errors.description : undefined}
            />

            <Select
              name="issueType"
              label="Issue type"
              value={values.issueType}
              onChange={handleChange}
              onBlur={handleBlur}
              options={[
                { value: '10', label: 'Logical fallacy (critical)' },
                { value: '20', label: 'Biased or flawed reasoning (critical)' },
                { value: '30', label: 'Terminology issue (critical)' },
                { value: '40', label: 'Unwelcome content (critical)' },
                { value: '45', label: 'Other issue (critical)' },
                { value: '50', label: 'Incoherent or unrelated' },
                { value: '60', label: 'Too broad or multiple topics' },
                { value: '70', label: 'Unsubstantiated claim' },
                { value: '100', label: 'Other issue (warning)' },
              ]}
            />

            <Input
              name="topicId"
              label="Topic ID (optional)"
              value={values.topicId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Attach this issue to a topic"
            />

            <Checkbox
              name="private"
              label="Make this issue private"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="warning" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Submitting...' : 'Create Issue'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/issues')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IssueCreatePage;
