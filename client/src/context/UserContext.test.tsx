import React from 'react';
import userEvent from '@testing-library/user-event';
import { UserProvider, useUser } from './UserContext';
import { render, screen } from '../test-utils/render';
import { User } from '../types';

const TestComponent: React.FC = () => {
  const { user, setUser } = useUser();

  return (
    <>
      <p>{user?.username || 'none'}</p>
      <button
        type="button"
        onClick={() => setUser({ _id: '1', username: 'demo' } as User)}
      >
        Set User
      </button>
    </>
  );
};

describe('UserContext', () => {
  it('stores user data', async () => {
    const user = userEvent.setup();

    render(
      <UserProvider>
        <TestComponent />
      </UserProvider>
    );

    expect(screen.getByText('none')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /set user/i }));
    expect(screen.getByText('demo')).toBeInTheDocument();
  });
});
