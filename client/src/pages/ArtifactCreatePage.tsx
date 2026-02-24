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

interface ArtifactFormValues {
  title: string;
  description: string;
  source: string;
  topicId: string;
  private: boolean;
}

const ArtifactCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validate = (values: ArtifactFormValues) => {
    const errors: Partial<Record<keyof ArtifactFormValues, string>> = {};

    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!values.description || values.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: ArtifactFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await apiService.createArtifact({
        title: values.title,
        description: values.description,
        source: values.source,
        topicId: values.topicId || undefined,
        private: values.private,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/artifacts');
      }, 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create artifact');
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit } = useForm<ArtifactFormValues>({
    initialValues: {
      title: '',
      description: '',
      source: '',
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
          { title: 'Artifacts', url: '/artifacts' },
          { title: 'Add Artifact', active: true },
        ]}
      />

      <PageHeader title="Add Artifact" subtitle="Add a document, media reference, or evidence artifact" icon="picture-o" iconColor="text-primary" />

      {submitSuccess && <Alert type="success">Artifact created successfully. Redirecting...</Alert>}
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
              label="Artifact title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Artifact title"
              required
              error={touched.title ? errors.title : undefined}
            />

            <TextArea
              name="description"
              label="Description"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Describe the artifact"
              required
              rows={6}
              error={touched.description ? errors.description : undefined}
            />

            <Input
              name="source"
              label="Source URL (optional)"
              value={values.source}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="https://example.com/source"
            />

            <Input
              name="topicId"
              label="Topic ID (optional)"
              value={values.topicId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Attach this artifact to a topic"
            />

            <Checkbox
              name="private"
              label="Make this artifact private"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="primary" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Submitting...' : 'Create Artifact'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/artifacts')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ArtifactCreatePage;
