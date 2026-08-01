import React from 'react';

type SocialProvider = 'google' | 'github' | 'facebook' | 'twitter' | 'apple' | 'microsoft';

interface SocialLoginButtonsProps {
  mode?: 'login' | 'signup';
  onProviderClick?: (provider: SocialProvider) => void;
  enabledProviders?: Record<string, boolean> | null;
  rememberMe?: boolean;
  returnUrl?: string;
}

const providerCatalog: Array<{ key: SocialProvider; label: string; icon: string }> = [
  { key: 'google', label: 'Google', icon: 'google' },
  { key: 'github', label: 'GitHub', icon: 'github' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook' },
  { key: 'twitter', label: 'Twitter', icon: 'twitter' },
  { key: 'apple', label: 'Apple', icon: 'apple' },
  { key: 'microsoft', label: 'Microsoft', icon: 'windows' },
];

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  mode = 'login',
  onProviderClick,
  enabledProviders,
  rememberMe,
  returnUrl,
}) => {
  const providers = providerCatalog
    .filter((provider) => {
      if (!enabledProviders) {
        return true;
      }
      return Boolean(enabledProviders[provider.key]);
    })
    .map((provider) => {
      const search = new URLSearchParams();
      if (typeof rememberMe === 'boolean') {
        search.set('rememberMe', rememberMe ? 'true' : 'false');
      }
      if (returnUrl) {
        search.set('returnUrl', returnUrl);
      }
      const query = search.toString();
      return {
        ...provider,
        href: `/${mode}/${provider.key}/${query ? `?${query}` : ''}`,
      };
    });

  if (providers.length === 0) {
    return null;
  }

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
