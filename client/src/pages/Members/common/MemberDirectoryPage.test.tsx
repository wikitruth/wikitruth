import React from 'react';
import { render, screen, within } from '../../../test-utils/render';
import MemberDirectoryPage from './MemberDirectoryPage';

describe('MemberDirectoryPage', () => {
  it('does not repeat a username when it is also the display name', async () => {
    render(
      <MemberDirectoryPage
        title="Contributors"
        tab="contributors"
        fetchMembers={async () => [{
          _id: 'member-1',
          username: 'same-user',
          name: { full: 'same-user' },
        }]}
      />,
    );

    const profileLink = await screen.findByRole('link', { name: 'same-user' });
    const card = profileLink.closest('.media');

    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getAllByText('same-user')).toHaveLength(1);
  });

  it('keeps a distinct display name and username visible', async () => {
    render(
      <MemberDirectoryPage
        title="Contributors"
        tab="contributors"
        fetchMembers={async () => [{
          _id: 'member-2',
          username: 'ada',
          name: { full: 'Ada Lovelace' },
        }]}
      />,
    );

    const profileLink = await screen.findByRole('link', { name: 'Ada Lovelace' });
    const card = profileLink.closest('.media');

    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('ada')).toBeInTheDocument();
  });
});
