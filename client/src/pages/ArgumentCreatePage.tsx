import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Breadcrumb from '../components/common/Breadcrumb';
import PageHeader from '../components/common/PageHeader';
import Input from '../components/Form/Input';
import RichTextEditor from '../components/Form/RichTextEditor';
import TextArea from '../components/Form/TextArea';
import Select from '../components/Form/Select';
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
import { FACT_TAG_OPTIONS, FACT_TYPE_OPTIONS } from '../constants/entryFormOptions';
import { toDateTimeLocal } from '../utils/formDates';
import useAnonymousContributionPrefill from '../hooks/useAnonymousContributionPrefill';

interface ArgumentFormValues {
  title: string;
  description: string;
  topicId: string;
  private: boolean;
  sources: string;
  parentId: string;
  relationship: string;
  referenceDate: string;
  typeId: string;
  tags: string;
  hasEthicalValue: boolean;
}

const ArgumentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group') || undefined;
  const topicIdFromQuery = String(searchParams.get('topic') || searchParams.get('topicId') || '').trim();
  const parentIdFromQuery = String(searchParams.get('parent') || searchParams.get('parentId') || '').trim();
  const editId = String(searchParams.get('id') || '').trim();
  const isEditMode = Boolean(editId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const { addToast } = useNotification();
  const anonymousPrefill = useAnonymousContributionPrefill('argument');

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

    return errors;
  };

  const handleSubmit = async (values: ArgumentFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const payload = {
        title: values.title,
        description: values.description,
        topicId: values.topicId,
        private: values.private,
        sources: values.sources,
        groupId: groupId,
        parentId: values.parentId,
        supportsParent: values.relationship !== 'oppose',
        referenceDate: values.referenceDate,
        typeId: Number(values.typeId),
        tags: values.tags,
        hasEthicalValue: values.hasEthicalValue,
      };
      const response = isEditMode
        ? await apiService.updateArgument(editId, payload)
        : await apiService.createArgument(payload);
      const createdArgument = response?.argument as { _id?: unknown; friendlyUrl?: unknown } | undefined;
      if (!isEditMode && anonymousPrefill.submissionId && createdArgument?._id) {
        await apiService.markAnonymousContributionPublished(anonymousPrefill.submissionId, 'argument', String(createdArgument._id));
      }
      
      trackEvent(isEditMode ? 'update_argument' : 'create_argument', 'content', values.title);
      addToast('success', `Argument ${isEditMode ? 'updated' : 'created'} successfully!`);
      setSubmitSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        if (createdArgument?._id) {
          navigate(`/arguments/entry/${encodeURIComponent(String(createdArgument.friendlyUrl || createdArgument._id))}/${encodeURIComponent(String(createdArgument._id))}`);
          return;
        }
        navigate('/arguments');
      }, isEditMode ? 1000 : 1500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} argument`;
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
  } = useForm<ArgumentFormValues>({
    initialValues: {
      title: '',
      description: '',
      topicId: topicIdFromQuery,
      private: false,
      sources: '',
      parentId: parentIdFromQuery,
      relationship: 'support',
      referenceDate: '',
      typeId: '1',
      tags: '',
      hasEthicalValue: false,
    },
    onSubmit: handleSubmit,
    validate,
  });

  useEffect(() => {
    if (anonymousPrefill.error) setSubmitError(anonymousPrefill.error);
    if (!anonymousPrefill.submission) return;
    setFieldValue('title', anonymousPrefill.submission.title);
    setFieldValue('description', anonymousPrefill.submission.content || '');
    setFieldValue('sources', anonymousPrefill.submission.references || '');
    if (anonymousPrefill.submission.parentId) {
      setFieldValue(anonymousPrefill.submission.parentType === 'argument' ? 'parentId' : 'topicId', anonymousPrefill.submission.parentId);
    }
  }, [anonymousPrefill.error, anonymousPrefill.submission, setFieldValue]);

  useEffect(() => {
    const loadExistingArgument = async () => {
      if (!isEditMode) return;
      try {
        setLoadingExisting(true);
        const response = await apiService.getArgumentEntry(editId);
        const argument = response?.argument;
        if (!argument?._id) {
          setSubmitError('Argument not found');
          return;
        }
        setFieldValue('title', String(argument.title || ''));
        setFieldValue('description', String(argument.content || argument.description || ''));
        setFieldValue('topicId', String(argument.ownerId || ''));
        setFieldValue('private', Boolean(argument.private));
        setFieldValue('sources', String(argument.references || ''));
        setFieldValue('parentId', String(argument.parentId || ''));
        setFieldValue('relationship', argument.against ? 'oppose' : 'support');
        setFieldValue('referenceDate', toDateTimeLocal(argument.referenceDate));
        setFieldValue('typeId', String(argument.typeId ?? 1));
        setFieldValue('tags', Array.isArray(argument.tags) ? argument.tags.join(',') : '');
        setFieldValue('hasEthicalValue', Boolean((argument.ethicalStatus as { hasValue?: unknown } | undefined)?.hasValue));
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to load argument');
      } finally {
        setLoadingExisting(false);
      }
    };
    void loadExistingArgument();
  }, [editId, isEditMode, setFieldValue]);

  if (loadingExisting) {
    return <LoadingSpinner message="Loading argument..." />;
  }

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Arguments', url: '/arguments' },
    { title: isEditMode ? 'Edit Argument' : 'Create Argument', active: true },
  ];

  return (
    <div>
      <PageMeta title={isEditMode ? 'Edit Argument' : 'Create Argument'} description="Present a fact or claim with supporting evidence" />
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title={isEditMode ? 'Edit Argument' : 'Create New Argument'}
        subtitle="Present a fact or claim with supporting evidence"
        icon="flash"
        iconColor="text-primary"
      />

      {submitSuccess && (
        <Alert type="success">
          Argument {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
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

            <RichTextEditor
              name="description"
              label="Supporting Evidence"
              value={values.description}
              onChange={(name, html) => setFieldValue(name as keyof ArgumentFormValues, html)}
              onBlur={() => {}}
              placeholder="Provide detailed evidence and reasoning to support your claim"
              required
              error={touched.description ? errors.description : undefined}
            />

            <Select
              name="typeId"
              label="Fact type"
              value={values.typeId}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              options={FACT_TYPE_OPTIONS}
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

            <Input
              name="parentId"
              label="Parent fact ID (optional)"
              value={values.parentId}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Create this as a child fact"
            />

            {values.parentId ? (
              <Select
                name="relationship"
                label="Relationship to parent"
                value={values.relationship}
                onChange={handleChange}
                options={[
                  { value: 'support', label: 'Supporting fact (for)' },
                  { value: 'oppose', label: 'Opposing fact (against)' },
                ]}
              />
            ) : null}

            <Input
              name="referenceDate"
              type="datetime-local"
              label="Reference date (optional)"
              value={values.referenceDate}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <NumericTagCheckboxes
              name="argumentTags"
              value={values.tags}
              options={FACT_TAG_OPTIONS}
              onChange={(tags) => setFieldValue('tags', tags)}
            />

            <Checkbox
              name="hasEthicalValue"
              label="Contains moral, ethical, or aesthetic value"
              checked={values.hasEthicalValue}
              onChange={handleChange}
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
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Argument' : 'Create Argument'}
              </Button>
              {' '}
              <Button
                type="button"
                variant="default"
                onClick={() => isEditMode ? navigate(-1) : navigate('/arguments')}
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
            <li>Choose the fact type that best describes the claim</li>
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
