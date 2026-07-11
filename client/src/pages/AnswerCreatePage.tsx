import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import TextArea from '../components/Form/TextArea';
import Checkbox from '../components/Form/Checkbox';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import useForm from '../hooks/useForm';
import apiService from '../services/api';
import { trackEvent } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';
import useAnonymousContributionPrefill from '../hooks/useAnonymousContributionPrefill';

interface AnswerFormValues {
  title: string;
  description: string;
  questionId: string;
  references: string;
  private: boolean;
}

const AnswerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionIdFromQuery = String(searchParams.get('question') || searchParams.get('questionId') || '').trim();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { addToast } = useNotification();
  const anonymousPrefill = useAnonymousContributionPrefill('answer');

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
      const response = await apiService.createAnswer({
        title: values.title,
        description: values.description,
        questionId: values.questionId,
        references: values.references,
        private: values.private,
      });
      const createdAnswer = response?.answer as { _id?: unknown } | undefined;
      if (anonymousPrefill.submissionId && createdAnswer?._id) {
        await apiService.markAnonymousContributionPublished(anonymousPrefill.submissionId, 'answer', String(createdAnswer._id));
      }

      trackEvent('create_answer', 'content', values.title);
      addToast('success', 'Answer created successfully!');
      setSubmitSuccess(true);
      setTimeout(() => {
        if (createdAnswer?._id) {
          navigate(`/answers/entry/${encodeURIComponent(String(createdAnswer._id))}`);
          return;
        }
        navigate('/answers');
      }, 1200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create answer';
      setSubmitError(msg);
      addToast('danger', msg);
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit, setFieldValue } = useForm<AnswerFormValues>({
    initialValues: {
      title: '',
      description: '',
      questionId: questionIdFromQuery,
      references: '',
      private: false,
    },
    validate,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    if (anonymousPrefill.error) setSubmitError(anonymousPrefill.error);
    if (!anonymousPrefill.submission) return;
    setFieldValue('title', anonymousPrefill.submission.title);
    setFieldValue('description', anonymousPrefill.submission.content || '');
    setFieldValue('references', anonymousPrefill.submission.references || '');
    if (anonymousPrefill.submission.parentId) setFieldValue('questionId', anonymousPrefill.submission.parentId);
  }, [anonymousPrefill.error, anonymousPrefill.submission, setFieldValue]);

  return (
    <div>
      <PageMeta title="Create Answer" description="Post an answer to a specific question" />
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

            <RichTextEditor
              name="description"
              label="Answer details"
              value={values.description}
              onChange={(name, html) => setFieldValue(name as keyof AnswerFormValues, html)}
              onBlur={() => {}}
              placeholder="Provide complete answer details"
              required
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
