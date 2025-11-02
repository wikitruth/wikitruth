import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface TopicFormValues {
  title: string;
  description: string;
  category: string;
  private: boolean;
  tags: string;
}

const TopicCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

    if (!values.category) {
      errors.category = 'Category is required';
    }

    return errors;
  };

  const handleSubmit = async (values: TopicFormValues) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // In a real implementation, this would call the API
      // const response = await apiService.createTopic(values);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setSubmitSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/topics');
      }, 1500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create topic');
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
  } = useForm<TopicFormValues>({
    initialValues: {
      title: '',
      description: '',
      category: '',
      private: false,
      tags: '',
    },
    onSubmit: handleSubmit,
    validate,
  });

  const breadcrumbItems = [
    { title: 'Home', url: '/' },
    { title: 'Topics', url: '/topics' },
    { title: 'Create Topic', active: true },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />
      
      <PageHeader
        title="Create New Topic"
        subtitle="Share a new topic for discussion and exploration"
        icon="folder-open"
        iconColor="text-success"
      />

      {submitSuccess && (
        <Alert type="success">
          Topic created successfully! Redirecting to topics list...
        </Alert>
      )}

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
              label="Title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter a descriptive title for the topic"
              required
              error={touched.title ? errors.title : undefined}
              maxLength={200}
            />

            <TextArea
              name="description"
              label="Description"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Provide a detailed description of the topic"
              required
              rows={6}
              error={touched.description ? errors.description : undefined}
            />

            <Select
              name="category"
              label="Category"
              value={values.category}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Select a category"
              required
              options={[
                { value: 'truth-reality', label: 'Truth & Reality' },
                { value: 'religion-worldviews', label: 'Religion & Worldviews' },
                { value: 'morality-ethics', label: 'Morality & Ethics' },
                { value: 'science-technology', label: 'Science & Technology' },
                { value: 'politics-society', label: 'Politics & Society' },
                { value: 'other', label: 'Other' },
              ]}
              error={touched.category ? errors.category : undefined}
            />

            <Input
              name="tags"
              label="Tags"
              value={values.tags}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter tags separated by commas (e.g., philosophy, ethics, morality)"
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
                {isSubmitting ? 'Creating...' : 'Create Topic'}
              </Button>
              {' '}
              <Button
                type="button"
                variant="default"
                onClick={() => navigate('/topics')}
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
            <li>Select the most appropriate category for your topic</li>
            <li>Use relevant tags to help others discover your topic</li>
            <li>Be respectful and follow community guidelines</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TopicCreatePage;
