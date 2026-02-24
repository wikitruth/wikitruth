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
  });
});
