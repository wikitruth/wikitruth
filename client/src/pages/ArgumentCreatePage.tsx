import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import TextArea from '../components/Form/TextArea';
import Select from '../components/Form/Select';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import useForm from '../hooks/useForm';
import apiService from '../services/api';

interface ArgumentFormValues {
  title: string;
  description: string;
  verdict: string;
  topicId: string;
  private: boolean;
  sources: string;
}

const ArgumentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group') || undefined;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validate = (values: ArgumentFormValues) => {
    const errors: Partial<Record<keyof ArgumentFormValues, string>> = {};

    if (!values.title || values.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (values.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    } else if (values.title.length > 250) {
      errors.title = 'Title must be less than 250 characters';
    }

    if (!values.description || values.description.trim().length === 0) {
      errors.description = 'Description is required';
    } else if (values.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    if (!values.verdict) {
      errors.verdict = 'Verdict is required';
    }

    return errors;
  };

  const handleSubmit = async (values: ArgumentFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await apiService.createArgument({
        title: values.title,
        description: values.description,
        verdict: values.verdict,
        topicId: values.topicId || undefined,
        private: values.private,
        sources: values.sources,
        groupId: groupId,
      });
      
      setSubmitSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/arguments');
      }, 1500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create argument');
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: onSubmit,
  } = useForm<ArgumentFormValues>({
    initialValues: {
      title: '',
      description: '',
      verdict: '',
      topicId: '',
      private: false,
      sources: '',
    },
    onSubmit: handleSubmit,
    validate,
  });

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Arguments', url: '/arguments' },
    { title: 'Create Argument', active: true },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Create New Argument"
        subtitle="Present a fact or claim with supporting evidence"
        icon="flash"
        iconColor="text-primary"
      />

      {submitSuccess && (
        <Alert type="success">
          Argument created successfully! Redirecting to arguments list...
        </Alert>
      )}

      {submitError && (
        <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {groupId && (
        <Alert type="info">
          This argument will be created in group context.
        </Alert>
      )}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={onSubmit}>
            <Input
              name="title"
              label="Claim Statement"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter a clear and concise claim or statement"
              required
              error={touched.title ? errors.title : undefined}
              maxLength={250}
            />

            <TextArea
              name="description"
              label="Supporting Evidence"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Provide detailed evidence and reasoning to support your claim"
              required
              rows={8}
              error={touched.description ? errors.description : undefined}
            />

            <Select
              name="verdict"
              label="Verdict"
              value={values.verdict}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Select the verdict for this argument"
              required
              options={[
                { value: 'true', label: 'True - Claim is accurate' },
                { value: 'mostly-true', label: 'Mostly True - Claim is largely accurate with minor inaccuracies' },
                { value: 'half-true', label: 'Half True - Claim has both accurate and inaccurate elements' },
                { value: 'mostly-false', label: 'Mostly False - Claim is largely inaccurate' },
                { value: 'false', label: 'False - Claim is inaccurate' },
                { value: 'unknown', label: 'Unknown - Cannot be verified' },
              ]}
              error={touched.verdict ? errors.verdict : undefined}
            />

            <Input
              name="topicId"
              label="Topic ID (optional)"
              value={values.topicId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter topic id to attach this argument to a topic"
            />

            <TextArea
              name="sources"
              label="Sources & References"
              value={values.sources}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="List your sources and references (one per line or comma-separated URLs)"
              rows={4}
            />

            <Checkbox
              name="private"
              label="Make this argument private (only visible to you)"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '30px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                icon={isSubmitting ? 'spinner fa-spin' : 'check'}
              >
                {isSubmitting ? 'Creating...' : 'Create Argument'}
              </Button>
              {' '}
              <Button
                type="button"
                variant="default"
                onClick={() => navigate('/arguments')}
                disabled={isSubmitting}
                icon="times"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel panel-info">
        <div className="panel-heading">
          <h3 className="panel-title">
            <i className="fa fa-info-circle"></i> Argument Guidelines
          </h3>
        </div>
        <div className="panel-body">
          <ul>
            <li>State your claim clearly and concisely</li>
            <li>Provide credible evidence to support your claim</li>
            <li>Choose the appropriate verdict based on the evidence</li>
            <li>Cite reliable sources and references</li>
            <li>Be objective and factual in your presentation</li>
            <li>Avoid personal opinions or biases</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ArgumentCreatePage;
