import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
  const topicIdFromQuery = String(searchParams.get('topic') || searchParams.get('topicId') || '').trim();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { addToast } = useNotification();
  const anonymousPrefill = useAnonymousContributionPrefill('question');

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
      const response = await apiService.createQuestion({
        title: values.title,
        description: values.description,
        topicId: values.topicId || undefined,
        references: values.references,
        private: values.private,
        groupId: groupId,
      });
      const createdQuestion = response?.question as { _id?: unknown; friendlyUrl?: unknown } | undefined;
      if (anonymousPrefill.submissionId && createdQuestion?._id) {
        await apiService.markAnonymousContributionPublished(anonymousPrefill.submissionId, 'question', String(createdQuestion._id));
      }

      trackEvent('create_question', 'content', values.title);
      addToast('success', 'Question created successfully!');
      setSubmitSuccess(true);
      setTimeout(() => {
        if (createdQuestion?._id) {
          navigate(`/questions/entry/${encodeURIComponent(String(createdQuestion.friendlyUrl || createdQuestion._id))}/${encodeURIComponent(String(createdQuestion._id))}`);
          return;
        }
        navigate('/questions');
      }, 1200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create question';
      setSubmitError(msg);
      addToast('danger', msg);
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit, setFieldValue } = useForm<QuestionFormValues>({
    initialValues: {
      title: '',
      description: '',
      topicId: topicIdFromQuery,
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
    if (anonymousPrefill.submission.parentId) setFieldValue('topicId', anonymousPrefill.submission.parentId);
  }, [anonymousPrefill.error, anonymousPrefill.submission, setFieldValue]);

  return (
    <div>
      <PageMeta title="Ask a Question" description="Create a new question for the community" />
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

            <RichTextEditor
              name="description"
              label="Question details"
              value={values.description}
              onChange={(name, html) => setFieldValue(name as keyof QuestionFormValues, html)}
              onBlur={() => {}}
              placeholder="Provide context and details"
              required
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
