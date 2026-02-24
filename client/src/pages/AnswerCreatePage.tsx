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

interface AnswerFormValues {
  title: string;
  description: string;
  questionId: string;
  references: string;
  private: boolean;
}

const AnswerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validate = (values: AnswerFormValues) => {
    const errors: Partial<Record<keyof AnswerFormValues, string>> = {};

    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!values.description || values.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!values.questionId || values.questionId.trim().length === 0) {
      errors.questionId = 'Question ID is required';
    }

    return errors;
  };

  const handleSubmit = async (values: AnswerFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await apiService.createAnswer({
        title: values.title,
        description: values.description,
        questionId: values.questionId,
        references: values.references,
        private: values.private,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/answers');
      }, 1200);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create answer');
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit } = useForm<AnswerFormValues>({
    initialValues: {
      title: '',
      description: '',
      questionId: '',
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
          { title: 'Answers', url: '/answers' },
          { title: 'Create Answer', active: true },
        ]}
      />

      <PageHeader title="Create Answer" subtitle="Post an answer to a specific question" icon="list-alt" iconColor="text-primary" />

      {submitSuccess && <Alert type="success">Answer created successfully. Redirecting...</Alert>}
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
              label="Answer title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Short summary of your answer"
              required
              error={touched.title ? errors.title : undefined}
            />

            <TextArea
              name="description"
              label="Answer details"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Provide complete answer details"
              required
              rows={6}
              error={touched.description ? errors.description : undefined}
            />

            <Input
              name="questionId"
              label="Question ID"
              value={values.questionId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Required question id"
              required
              error={touched.questionId ? errors.questionId : undefined}
            />

            <TextArea
              name="references"
              label="References (optional)"
              value={values.references}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Sources and supporting links"
              rows={3}
            />

            <Checkbox
              name="private"
              label="Make this answer private"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="primary" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Submitting...' : 'Create Answer'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/answers')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AnswerCreatePage;
