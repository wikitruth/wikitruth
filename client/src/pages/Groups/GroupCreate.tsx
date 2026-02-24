import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import PageHeader from '../../components/common/PageHeader';
import Input from '../../components/Form/Input';
import TextArea from '../../components/Form/TextArea';
import Select from '../../components/Form/Select';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import useForm from '../../hooks/useForm';
import apiService from '../../services/api';
import type { LegacyResponse } from '../../types/legacy';

interface GroupFormValues {
  title: string;
  description: string;
  privacyType: string;
}

const GroupCreate: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (values: GroupFormValues) => {
    const errors: Partial<Record<keyof GroupFormValues, string>> = {};
    if (!values.title || values.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }
    if (!values.description || values.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    return errors;
  };

  const handleSubmit = async (values: GroupFormValues) => {
    setSubmitError(null);
    try {
      const response = (await apiService.createGroup({
        title: values.title,
        description: values.description,
        privacyType: Number(values.privacyType),
      })) as LegacyResponse;
      const group = response?.group;
      if (group?._id) {
        navigate(`/groups/${group.friendlyUrl || group._id}/${group._id}`);
      } else {
        navigate('/groups');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create group');
    }
  };

  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit: onSubmit } = useForm<GroupFormValues>({
    initialValues: {
      title: '',
      description: '',
      privacyType: '10',
    },
    validate,
    onSubmit: handleSubmit,
  });

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Groups', url: '/groups' },
          { title: 'Create Group', active: true },
        ]}
      />

      <PageHeader title="Create Group" subtitle="Start a group and invite members" icon="users" iconColor="text-primary" />

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
              label="Group name"
              value={values.title}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter group name"
              required
              error={touched.title ? errors.title : undefined}
            />

            <TextArea
              name="description"
              label="Description"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Describe the group's purpose"
              rows={6}
              required
              error={touched.description ? errors.description : undefined}
            />

            <Select
              name="privacyType"
              label="Privacy"
              value={values.privacyType}
              onChange={handleChange}
              onBlur={handleBlur}
              options={[
                { value: '10', label: 'Public' },
                { value: '20', label: 'Closed' },
                { value: '30', label: 'Secret' },
              ]}
            />

            <div className="form-group" style={{ marginTop: '24px' }}>
              <Button type="submit" variant="primary" disabled={isSubmitting} icon={isSubmitting ? 'spinner fa-spin' : 'check'}>
                {isSubmitting ? 'Creating...' : 'Create Group'}
              </Button>{' '}
              <Button type="button" variant="default" onClick={() => navigate('/groups')} disabled={isSubmitting} icon="times">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GroupCreate;
