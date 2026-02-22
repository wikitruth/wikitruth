import React from 'react';
import userEvent from '@testing-library/user-event';
import Button from '../components/common/Button';
import { render, screen } from './render';

describe('test utils render helper', () => {
  it('renders a component and supports user interactions', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();

    render(
      <Button variant="primary" onClick={onClick}>
        Save
      </Button>
    );

    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toHaveClass('btn-primary');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
