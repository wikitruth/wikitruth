import React from 'react';
import userEvent from '@testing-library/user-event';
import SocialLoginButtons from './SocialLoginButtons';
import { render, screen } from '../../test-utils/render';

describe('SocialLoginButtons', () => {
  it('renders social login links and triggers click handlers', async () => {
    const onProviderClick = jest.fn();
    const user = userEvent.setup();

    render(<SocialLoginButtons onProviderClick={onProviderClick} />);

    const googleLink = screen.getByRole('link', { name: /google/i });
    const githubLink = screen.getByRole('link', { name: /github/i });

    expect(googleLink).toHaveAttribute('href', '/login/google/');
    expect(githubLink).toHaveAttribute('href', '/login/github/');

    await user.click(googleLink);
    await user.click(githubLink);

    expect(onProviderClick).toHaveBeenNthCalledWith(1, 'google');
    expect(onProviderClick).toHaveBeenNthCalledWith(2, 'github');
  });

  it('uses signup route prefix when mode is signup', () => {
    render(<SocialLoginButtons mode="signup" />);

    expect(screen.getByRole('link', { name: /facebook/i })).toHaveAttribute('href', '/signup/facebook/');
    expect(screen.getByRole('link', { name: /apple/i })).toHaveAttribute('href', '/signup/apple/');
    expect(screen.getByRole('link', { name: /microsoft/i })).toHaveAttribute('href', '/signup/microsoft/');
  });

  it('preserves a safe return path through a social sign-in round trip', () => {
    render(<SocialLoginButtons rememberMe returnUrl="/issues/create?topic=entry-1" />);

    expect(screen.getByRole('link', { name: /google/i })).toHaveAttribute(
      'href',
      '/login/google/?rememberMe=true&returnUrl=%2Fissues%2Fcreate%3Ftopic%3Dentry-1',
    );
  });

  it('renders only enabled providers when availability is provided', () => {
    render(
      <SocialLoginButtons
        enabledProviders={{
          google: true,
          github: false,
          facebook: false,
          twitter: false,
          apple: true,
          microsoft: false,
        }}
      />
    );

    expect(screen.getByRole('link', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apple/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /facebook/i })).not.toBeInTheDocument();
  });

  it('renders nothing when no providers are enabled', () => {
    const { container } = render(
      <SocialLoginButtons
        enabledProviders={{
          google: false,
          github: false,
          facebook: false,
          twitter: false,
          apple: false,
          microsoft: false,
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('uses continuation copy in the focused auth presentation', () => {
    render(
      <SocialLoginButtons
        continueLabel
        enabledProviders={{ facebook: true }}
      />
    );

    expect(screen.getByRole('link', { name: /continue with facebook/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^facebook$/i })).not.toBeInTheDocument();
  });
});
