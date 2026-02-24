import React from 'react';

const SettingsPage: React.FC = () => {
  const providers = [
    { key: 'google', label: 'Google' },
    { key: 'github', label: 'GitHub' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'twitter', label: 'Twitter' },
  ];

  return (
    <div className="container">
      <h2>Account Settings</h2>
      <p className="text-muted">Manage account preferences, privacy settings, and social account links.</p>

      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">Social Accounts</h3>
        </div>
        <div className="list-group">
          {providers.map((provider) => (
            <div key={provider.key} className="list-group-item">
              <strong>{provider.label}</strong>
              <div className="pull-right">
                <a className="btn btn-default btn-sm" href={`/account/settings/${provider.key}/`}>
                  Connect
                </a>{' '}
                <a className="btn btn-link btn-sm" href={`/account/settings/${provider.key}/disconnect/`}>
                  Disconnect
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
