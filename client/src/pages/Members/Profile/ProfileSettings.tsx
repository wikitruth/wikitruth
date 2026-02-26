import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/common/Breadcrumb';
import PageHeader from '../../../components/common/PageHeader';
import Checkbox from '../../../components/Form/Checkbox';
import Input from '../../../components/Form/Input';
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
  const [fastSwitchEnabled, setFastSwitchEnabled] = useState(false);
  const [fastSwitchPin, setFastSwitchPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        setLoading(true);
        const [profileResult, fastSwitchResult] = await Promise.all([
          apiService.getCurrentMemberProfile(),
          apiService.getCurrentMemberFastSwitchStatus(),
        ]);
        const member = (profileResult?.member || profileResult) as LegacyEntity;
        setUsername(member?.username || '');
        setEmail(member?.email || '');
        setPrivateProfile(Boolean(member?.preferences?.privateProfile));
        setFastSwitchEnabled(Boolean(fastSwitchResult?.fastSwitch?.enabled));
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
      setSuccess('Profile preferences updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile settings');
    }
  };

  const handleFastSwitchSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      await apiService.updateCurrentMemberFastSwitch({
        enabled: fastSwitchEnabled,
        pin: fastSwitchEnabled ? fastSwitchPin : undefined,
      });
      setFastSwitchPin('');
      setSuccess(fastSwitchEnabled ? 'Fast Switch enabled.' : 'Fast Switch disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Fast Switch settings');
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

      <PageHeader title="Profile Settings" subtitle="Manage profile privacy and Fast Switch settings" icon="cog" iconColor="text-primary" />

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

          <div className="form-group" style={{ marginTop: '16px' }}>
            <Button type="button" variant="primary" onClick={handleSave} icon="check">
              Save Preferences
            </Button>{' '}
          </div>

          <hr />

          <Checkbox
            name="fastSwitch"
            label="Enable Fast Switch on this trusted device"
            checked={fastSwitchEnabled}
            onChange={(e) => setFastSwitchEnabled(e.target.checked)}
          />

          {fastSwitchEnabled && (
            <Input
              name="fastSwitchPin"
              type="password"
              label="Fast Switch PIN"
              value={fastSwitchPin}
              onChange={(event) => setFastSwitchPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter new 6-digit PIN"
            />
          )}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <Button type="button" variant="info" onClick={handleFastSwitchSave} icon="unlock">
              Save Fast Switch
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
