import React from 'react';
import { MemoryRouter } from 'react-router';
import EntryActionsMenu from '../components/Entry/EntryActionsMenu';
import { AuthProvider } from '../context/AuthContext';

const mockEntry = {
  _id: 'abc123',
  title: 'Should we invest in renewable energy?',
  objectName: 'topic',
  objectType: 1,
  friendlyUrl: '/topic/should-we-invest-in-renewable-energy',
  createUserId: 'user1',
};

const meta = {
  title: 'Entry/EntryActionsMenu',
  component: EntryActionsMenu,
  decorators: [
    (Story: React.ComponentType) => (
      <MemoryRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;

export const Default = {
  args: {
    entry: mockEntry,
  },
};

export const WithEditPath = {
  args: {
    entry: mockEntry,
    editPath: '/topic/abc123/edit',
  },
};
