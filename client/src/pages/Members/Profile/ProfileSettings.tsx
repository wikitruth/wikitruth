import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Checkbox from '../../../components/Form/Checkbox';
import Input from '../../../components/Form/Input';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ProfileShell from '../../../components/Members/ProfileShell';
import apiService from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import type { LegacyEntity } from '../../../types/legacy';

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      <ProfileShell username={username || user?.username || 'member'} activeTab="settings" isOwnProfile={true}>
        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <h1 className="page-header wt-header">
          <i className="fa fa-cog"></i> Settings
        </h1>
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
      </ProfileShell>
    </div>
  );
};

export default ProfileSettings;
