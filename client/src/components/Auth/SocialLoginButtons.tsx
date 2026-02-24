import React from 'react';

type SocialProvider = 'google' | 'github' | 'facebook' | 'twitter';

interface SocialLoginButtonsProps {
  mode?: 'login' | 'signup';
  onProviderClick?: (provider: SocialProvider) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ mode = 'login', onProviderClick }) => {
  const providers: Array<{ key: SocialProvider; label: string; icon: string; href: string }> = [
    { key: 'google', label: 'Google', icon: 'google', href: `/${mode}/google/` },
    { key: 'github', label: 'GitHub', icon: 'github', href: `/${mode}/github/` },
    { key: 'facebook', label: 'Facebook', icon: 'facebook', href: `/${mode}/facebook/` },
    { key: 'twitter', label: 'Twitter', icon: 'twitter', href: `/${mode}/twitter/` },
  ];

  return (
    <div className="wt-social-login" aria-label="Social login providers">
      <p className="text-muted">{mode === 'signup' ? 'Sign up with:' : 'Sign in with:'}</p>
      <div className="btn-group" role="group" aria-label="Social login options">
        {providers.map((provider) => (
          <a
            key={provider.key}
            className="btn btn-default"
            href={provider.href}
            onClick={(event) => {
              if (onProviderClick) {
                event.preventDefault();
              }
              onProviderClick?.(provider.key);
            }}
          >
            <i className={`fa fa-${provider.icon}`} aria-hidden="true" /> {provider.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default SocialLoginButtons;
