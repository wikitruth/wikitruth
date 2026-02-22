import React from 'react';

interface SocialLoginButtonsProps {
  onProviderClick?: (provider: 'google' | 'github' | 'facebook' | 'twitter') => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ onProviderClick }) => {
  const providers: Array<{ key: 'google' | 'github' | 'facebook' | 'twitter'; label: string; icon: string }> = [
    { key: 'google', label: 'Google', icon: 'google' },
    { key: 'github', label: 'GitHub', icon: 'github' },
    { key: 'facebook', label: 'Facebook', icon: 'facebook' },
    { key: 'twitter', label: 'Twitter', icon: 'twitter' },
  ];

  return (
    <div className="wt-social-login" aria-label="Social login providers">
      <p className="text-muted">Sign in with:</p>
      <div className="btn-group" role="group" aria-label="Social login options">
        {providers.map((provider) => (
          <button
            key={provider.key}
            type="button"
            className="btn btn-default"
            onClick={() => onProviderClick?.(provider.key)}
          >
            <i className={`fa fa-${provider.icon}`} aria-hidden="true" /> {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SocialLoginButtons;
