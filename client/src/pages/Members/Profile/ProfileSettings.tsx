import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Checkbox from '../../../components/Form/Checkbox';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import apiService from '../../../services/api';
import type { LegacyEntity } from '../../../types/legacy';

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        setLoading(true);
        const result = await apiService.getCurrentMemberProfile();
        const member = (result?.member || result) as LegacyEntity;
        setUsername(member?.username || '');
        setEmail(member?.email || '');
        setPrivateProfile(Boolean(member?.preferences?.privateProfile));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentProfile();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      await apiService.updateCurrentMemberPreferences({ privateProfile });
      setSuccess('Profile settings updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile settings');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile settings..." />;
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { title: 'Home', url: '/' },
          { title: 'Profile', url: '/members/profile' },
          { title: 'Settings', active: true },
        ]}
      />

      <PageHeader title="Profile Settings" subtitle="Manage your public profile preferences" icon="cog" iconColor="text-primary" />

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="panel panel-default">
        <div className="panel-body">
          <p>
            <strong>Username:</strong> {username}
          </p>
          <p>
            <strong>Email:</strong> {email || 'Not set'}
          </p>

          <Checkbox
            name="privateProfile"
            label="Hide my profile from other members"
            checked={privateProfile}
            onChange={(e) => setPrivateProfile(e.target.checked)}
          />

          <div className="form-group" style={{ marginTop: '24px' }}>
            <Button type="button" variant="primary" onClick={handleSave} icon="check">
              Save Settings
            </Button>{' '}
            <Button type="button" variant="default" onClick={() => navigate('/members/profile')} icon="arrow-left">
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
