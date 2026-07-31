import React from 'react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '../test-utils/render';
import { AuthPromptProvider, useAuthPrompt } from './AuthPromptContext';

const PromptHarness: React.FC<{ intent?: 'react' | 'report' }> = ({ intent = 'react' }) => {
  const { requestSignIn } = useAuthPrompt();
  const location = useLocation();
  return (
    <>
      <button
        type="button"
        onClick={() => requestSignIn({
          intent,
          returnUrl: intent === 'report' ? '/issues/create?topic=entry-1' : undefined,
        })}
      >
        Request sign in
      </button>
      <output data-testid="location">{location.pathname}{location.search}</output>
    </>
  );
};

describe('AuthPromptProvider', () => {
  it('keeps contextual actions in place until the user chooses to sign in', async () => {
    const user = userEvent.setup();
    render(
      <AuthPromptProvider>
        <PromptHarness />
      </AuthPromptProvider>,
      { route: '/topics/entry/example/entry-1?tab=evidence' },
    );

    await user.click(screen.getByRole('button', { name: 'Request sign in' }));
    expect(screen.getByRole('dialog', { name: 'Sign in to react' })).toBeInTheDocument();
    expect(screen.getByText(/return here and can choose your reaction/i)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/topics/entry/example/entry-1?tab=evidence');

    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/topics/entry/example/entry-1?tab=evidence');
  });

  it('continues to sign in with an exact safe return path', async () => {
    const user = userEvent.setup();
    render(
      <AuthPromptProvider>
        <PromptHarness intent="report" />
      </AuthPromptProvider>,
      { route: '/topics/entry/example/entry-1' },
    );

    await user.click(screen.getByRole('button', { name: 'Request sign in' }));
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(
      '/login?returnUrl=%2Fissues%2Fcreate%3Ftopic%3Dentry-1&intent=report',
    ));
  });
});
