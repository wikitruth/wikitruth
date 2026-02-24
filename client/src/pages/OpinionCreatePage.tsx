import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import TextArea from '../components/Form/TextArea';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import useForm from '../hooks/useForm';
import apiService from '../services/api';

interface OpinionFormValues {
  title: string;
  description: string;
  topicId: string;
  private: boolean;
}

const OpinionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
      await apiService.createOpinion({
        title: values.title,
        description: values.description,
        topicId: values.topicId || undefined,
        private: values.private,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/opinions');
      }, 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create opinion');
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit } = useForm<OpinionFormValues>({
    initialValues: {
      title: '',
      description: '',
      topicId: '',
      private: false,
    },
    validate,
    onSubmit: handleSubmit,
  });

  return (
    <div>
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

            <TextArea
              name="description"
              label="Opinion details"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Write your opinion"
              required
              rows={6}
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
