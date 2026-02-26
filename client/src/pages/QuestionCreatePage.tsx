import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import TextArea from '../components/Form/TextArea';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import useForm from '../hooks/useForm';
import apiService from '../services/api';

interface QuestionFormValues {
  title: string;
  description: string;
  topicId: string;
  references: string;
  private: boolean;
}

const QuestionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group') || undefined;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validate = (values: QuestionFormValues) => {
    const errors: Partial<Record<keyof QuestionFormValues, string>> = {};

    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!values.description || values.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: QuestionFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await apiService.createQuestion({
        title: values.title,
        description: values.description,
        topicId: values.topicId || undefined,
        references: values.references,
        private: values.private,
        groupId: groupId,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/questions');
      }, 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create question');
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit } = useForm<QuestionFormValues>({
    initialValues: {
      title: '',
      description: '',
      topicId: '',
      references: '',
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
          { title: 'Questions', url: '/questions' },
          { title: 'Ask Question', active: true },
        ]}
      />

      <PageHeader title="Ask a Question" subtitle="Create a new question for the community" icon="question-circle" iconColor="text-success" />

      {submitSuccess && <Alert type="success">Question created successfully. Redirecting...</Alert>}
      {submitError && (
        <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {groupId && (
        <Alert type="info">
          This question will be created in group context.
        </Alert>
      )}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={onSubmit}>
            <Input
              name="title"
              label="Question title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="What do you want to ask?"
              required
              error={touched.title ? errors.title : undefined}
            />

            <TextArea
              name="description"
              label="Question details"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Provide context and details"
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
              placeholder="Attach this question to a topic"
            />

            <TextArea
              name="references"
              label="References (optional)"
              value={values.references}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Links or references"
              rows={3}
            />

            <Checkbox
              name="private"
              label="Make this question private"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="success" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Submitting...' : 'Create Question'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/questions')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionCreatePage;
