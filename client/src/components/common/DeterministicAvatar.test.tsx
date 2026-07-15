import React from 'react';
import { render, screen } from '../../test-utils/render';
import DeterministicAvatar from './DeterministicAvatar';

describe('DeterministicAvatar', () => {
  it('uses a stable pattern and readable initial for an identity', () => {
    const { rerender } = render(<DeterministicAvatar seed="user-1" label="alice" size={40} />);
    const first = screen.getByRole('img', { name: 'alice avatar' });
    expect(first).toHaveTextContent('A');
    expect(first).toHaveStyle({ width: '40px', height: '40px' });
    expect(first).toHaveAttribute('data-avatar-seed', 'user-1');

    rerender(<DeterministicAvatar seed="user-1" label="alice" size={40} />);
    expect(screen.getByRole('img', { name: 'alice avatar' })).toHaveAttribute(
      'data-avatar-seed',
      'user-1'
    );
  });

  it('differentiates users by seed', () => {
    const { rerender } = render(<DeterministicAvatar seed="user-1" label="alice" />);
    expect(screen.getByRole('img', { name: 'alice avatar' })).toHaveAttribute(
      'data-avatar-seed',
      'user-1'
    );

    rerender(<DeterministicAvatar seed="user-2" label="bob" />);
    expect(screen.getByRole('img', { name: 'bob avatar' })).toHaveAttribute(
      'data-avatar-seed',
      'user-2'
    );
  });
});
