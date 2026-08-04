import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import TextArea from '../components/Form/TextArea';
import Checkbox from '../components/Form/Checkbox';
import NumericTagCheckboxes from '../components/Form/NumericTagCheckboxes';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import PageMeta from '../components/common/PageMeta';
import useForm from '../hooks/useForm';
import apiService from '../services/api';
import { trackEvent } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { TOPIC_TAG_OPTIONS } from '../constants/entryFormOptions';
import { toDateTimeLocal } from '../utils/formDates';
import useAnonymousContributionPrefill from '../hooks/useAnonymousContributionPrefill';

interface TopicFormValues {
  title: string;
  description: string;
  category: string;
  private: boolean;
  tags: string;
  contextTitle: string;
  references: string;
  referenceDate: string;
  hasEthicalValue: boolean;
  icon: string;
}

const TopicCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group') || undefined;
  const parentTopicFromQuery = String(searchParams.get('topic') || searchParams.get('topicId') || '').trim();
  const editId = String(searchParams.get('id') || '').trim();
  const isEditMode = Boolean(editId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const { addToast } = useNotification();
  const anonymousPrefill = useAnonymousContributionPrefill('topic');

  const validate = (values: TopicFormValues) => {
    const errors: Partial<Record<keyof TopicFormValues, string>> = {};

    if (!values.title || values.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (values.title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (values.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (!values.description || values.description.trim().length === 0) {
      errors.description = 'Description is required';
    } else if (values.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: TopicFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      if (isEditMode) {
        const response = await apiService.updateTopic(editId, {
          title: values.title,
          description: values.description,
          topicId: values.category,
          parentId: values.category,
          private: values.private,
          contextTitle: values.contextTitle,
          references: values.references,
          referenceDate: values.referenceDate,
          tags: values.tags,
          hasEthicalValue: values.hasEthicalValue,
          icon: values.icon,
        });
        const updatedTopic = response?.topic;
        trackEvent('update_topic', 'content', values.title);
        addToast('success', 'Topic updated successfully!');
        setSubmitSuccess(true);
        setTimeout(() => {
          if (updatedTopic?._id) {
            navigate(`/topics/entry/${encodeURIComponent(String(updatedTopic.friendlyUrl || updatedTopic._id))}/${encodeURIComponent(String(updatedTopic._id))}`);
            return;
          }
          navigate('/topics');
        }, 1000);
        return;
      }

      const response = await apiService.createTopic({
        title: values.title,
        description: values.description,
        category: values.category,
        private: values.private,
        tags: values.tags,
        groupId: groupId,
        parentId: values.category || undefined,
        contextTitle: values.contextTitle,
        references: values.references,
        referenceDate: values.referenceDate,
        hasEthicalValue: values.hasEthicalValue,
        icon: values.icon,
      });
      const createdTopic = response?.topic as { _id?: unknown; friendlyUrl?: unknown } | undefined;

      if (anonymousPrefill.submissionId && createdTopic?._id) {
        await apiService.markAnonymousContributionPublished(anonymousPrefill.submissionId, 'topic', String(createdTopic._id));
      }

      trackEvent('create_topic', 'content', values.title);
      addToast('success', 'Topic created successfully!');
      setSubmitSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        if (createdTopic?._id) {
          navigate(`/topics/entry/${encodeURIComponent(String(createdTopic.friendlyUrl || createdTopic._id))}/${encodeURIComponent(String(createdTopic._id))}`);
          return;
        }
        navigate('/topics');
      }, 1500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create topic';
      setSubmitError(msg);
      addToast('danger', msg);
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
    setFieldValue,
  } = useForm<TopicFormValues>({
    initialValues: {
      title: '',
      description: '',
      category: parentTopicFromQuery,
      private: false,
      tags: '',
      contextTitle: '',
      references: '',
      referenceDate: '',
      hasEthicalValue: false,
      icon: '',
    },
    onSubmit: handleSubmit,
    validate,
  });

  useEffect(() => {
    if (anonymousPrefill.error) setSubmitError(anonymousPrefill.error);
    if (!anonymousPrefill.submission) return;
    setFieldValue('title', anonymousPrefill.submission.title);
    setFieldValue('description', anonymousPrefill.submission.content || '');
    setFieldValue('references', anonymousPrefill.submission.references || '');
    if (anonymousPrefill.submission.parentId) setFieldValue('category', anonymousPrefill.submission.parentId);
  }, [anonymousPrefill.error, anonymousPrefill.submission, setFieldValue]);

  useEffect(() => {
    const loadExistingTopic = async () => {
      if (!isEditMode) {
        return;
      }

      try {
        setLoadingExisting(true);
        const response = await apiService.getTopicEntry(editId);
        const topic = response?.topic;
        if (!topic?._id) {
          setSubmitError('Topic not found');
          return;
        }
        setFieldValue('title', String(topic.title || ''));
        setFieldValue('description', String(topic.content || topic.description || ''));
        setFieldValue('category', String(topic.parentId || topic.ownerId || ''));
        setFieldValue('private', Boolean(topic.private));
        setFieldValue('tags', Array.isArray(topic.tags) ? topic.tags.join(', ') : '');
        setFieldValue('contextTitle', String(topic.contextTitle || ''));
        setFieldValue('references', String(topic.references || ''));
        setFieldValue('referenceDate', toDateTimeLocal(topic.referenceDate));
        setFieldValue('hasEthicalValue', Boolean((topic.ethicalStatus as { hasValue?: unknown } | undefined)?.hasValue));
        setFieldValue('icon', String(topic.icon || ''));
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to load topic';
        setSubmitError(msg);
      } finally {
        setLoadingExisting(false);
      }
    };

    void loadExistingTopic();
  }, [editId, isEditMode, setFieldValue]);

  if (loadingExisting) {
    return <LoadingSpinner message="Loading topic..." />;
  }

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Topics', url: '/topics' },
    { title: isEditMode ? 'Edit Topic' : 'Create Topic', active: true },
  ];

  return (
    <div>
      <PageMeta title={isEditMode ? 'Edit Topic' : 'Create Topic'} description="Share a new topic for discussion and exploration" />
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title={isEditMode ? 'Edit Topic' : 'Create New Topic'}
        subtitle={isEditMode ? 'Update your topic details' : 'Share a new topic for discussion and exploration'}
        icon="folder-open"
        iconColor="text-success"
      />

      {submitSuccess && (
        <Alert type="success">
          {isEditMode ? 'Topic updated successfully! Redirecting...' : 'Topic created successfully! Redirecting...'}
        </Alert>
      )}

      {submitError && (
        <Alert type="danger" dismissible onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {groupId && (
        <Alert type="info">
          This topic will be created in group context.
        </Alert>
      )}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={onSubmit}>
            <Input
              name="title"
              label="Title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter a descriptive title for the topic"
              required
              error={touched.title ? errors.title : undefined}
              maxLength={200}
            />

            <Input
              name="contextTitle"
              label="Contextual title (optional)"
              value={values.contextTitle}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="A shorter title when shown under its parent"
            />

            <RichTextEditor
              name="description"
              label="Description"
              value={values.description}
              onChange={(name, html) => setFieldValue(name as keyof TopicFormValues, html)}
              onBlur={() => {}}
              placeholder="Provide a detailed description of the topic"
              required
              error={touched.description ? errors.description : undefined}
            />

            <TextArea
              name="references"
              label="Sources (optional)"
              value={values.references}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="List source URLs or citations"
              rows={3}
            />

            <Input
              name="category"
              label="Parent topic ID (optional)"
              value={values.category}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Attach this topic below another topic"
            />

            <Input
              name="referenceDate"
              type="datetime-local"
              label="Reference date (optional)"
              value={values.referenceDate}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <NumericTagCheckboxes
              name="topicTags"
              value={values.tags}
              options={TOPIC_TAG_OPTIONS}
              onChange={(tags) => setFieldValue('tags', tags)}
            />

            <Checkbox
              name="hasEthicalValue"
              label="Contains moral, ethical, or aesthetic value"
              checked={values.hasEthicalValue}
              onChange={handleChange}
            />

            <Input
              name="icon"
              label="Icon (optional)"
              value={values.icon}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Font Awesome icon name, for example globe"
            />

            <Checkbox
              name="private"
              label="Make this topic private (only visible to you)"
              checked={values.private}
              onChange={handleChange}
            />

            <div className="form-group" style={{ marginTop: '30px' }}>
              <Button
                type="submit"
                variant="success"
                size="lg"
                disabled={isSubmitting}
                icon={isSubmitting ? 'spinner fa-spin' : 'check'}
              >
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Topic' : 'Create Topic'}
              </Button>
              {' '}
              <Button
                type="button"
                variant="default"
                onClick={() => isEditMode ? navigate(-1) : navigate('/topics')}
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
            <i className="fa fa-info-circle"></i> Topic Guidelines
          </h3>
        </div>
        <div className="panel-body">
          <ul>
            <li>Choose a clear and descriptive title that summarizes the topic</li>
            <li>Provide enough context in the description for others to understand</li>
            <li>Attach the topic to its parent unless you are creating an approved root category</li>
            <li>Use the structured topic tags to describe its role</li>
            <li>Be respectful and follow community guidelines</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TopicCreatePage;
