import React from 'react';
import userEvent from '@testing-library/user-event';
import SocialLoginButtons from './SocialLoginButtons';
import { render, screen } from '../../test-utils/render';

describe('SocialLoginButtons', () => {
  it('renders all provider buttons and triggers click handlers', async () => {
    const onProviderClick = jest.fn();
    const user = userEvent.setup();

    render(<SocialLoginButtons onProviderClick={onProviderClick} />);

    await user.click(screen.getByRole('button', { name: /google/i }));
    await user.click(screen.getByRole('button', { name: /github/i }));

    expect(onProviderClick).toHaveBeenNthCalledWith(1, 'google');
    expect(onProviderClick).toHaveBeenNthCalledWith(2, 'github');
  });
});
