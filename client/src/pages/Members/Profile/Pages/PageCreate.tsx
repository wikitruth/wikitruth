import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../../components/common/Breadcrumb';
import PageHeader from '../../../../components/common/PageHeader';
import Input from '../../../../components/Form/Input';
import TextArea from '../../../../components/Form/TextArea';
import Button from '../../../../components/common/Button';
import Alert from '../../../../components/common/Alert';
import useForm from '../../../../hooks/useForm';
import apiService from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';
import type { LegacyEntity } from '../../../../types/legacy';

interface PageFormValues {
  title: string;
  content: string;
}

const PageCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const username = user?.username || '';
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (values: PageFormValues) => {
    const errors: Partial<Record<keyof PageFormValues, string>> = {};

    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (!values.content || values.content.trim().length < 10) {
      errors.content = 'Content must be at least 10 characters';
    }

    return errors;
  };

  const handleSubmit = async (values: PageFormValues) => {
    if (!username) {
      setSubmitError('You must be signed in to create profile pages');
      return;
    }

    setSubmitError(null);
    try {
      const result = await apiService.createMemberPage(username, {
        title: values.title,
        content: values.content,
      });

      const page = result?.page as LegacyEntity | undefined;
      if (page?._id) {
        navigate(`/members/profile/pages/${page._id}`);
      } else {
        navigate('/members/profile/pages');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create profile page');
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit } = useForm<PageFormValues>({
    initialValues: {
      title: '',
      content: '',
    },
    validate,
    onSubmit: handleSubmit,
  });

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Profile', url: '/members/profile' },
          { title: 'Pages', url: '/members/profile/pages' },
          { title: 'Create Page', active: true },
        ]}
      />

      <PageHeader title="Create Profile Page" subtitle="Publish a custom page on your profile" icon="file-text-o" iconColor="text-primary" />

      {submitError && <Alert type="danger">{submitError}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <form onSubmit={onSubmit}>
            <Input
              name="title"
              label="Page title"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              error={touched.title ? errors.title : undefined}
            />

            <TextArea
              name="content"
              label="Page content"
              value={values.content}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={10}
              required
              error={touched.content ? errors.content : undefined}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="primary" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Creating...' : 'Create Page'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/members/profile/pages')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PageCreate;
