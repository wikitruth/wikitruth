import React from 'react';
import { render, screen, waitFor } from '../../test-utils/render';
import ContextSidebar from './ContextSidebar';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { LegacyEntity } from '../../types/legacy';

function makeEntity(overrides: Partial<LegacyEntity>): LegacyEntity {
  return overrides as LegacyEntity;
}

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getHomeData: jest.fn(),
    getTopicEntry: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ContextSidebar', () => {
  beforeEach(() => {
    mockedApi.getHomeData.mockReset();
    mockedApi.getTopicEntry.mockReset();
    mockedUseAuth.mockReturnValue({
      user: { _id: 'user-1', username: 'demo', roles: {} },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'contributor',
      setActiveRole: jest.fn(),
      availableRoles: ['contributor'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
  });

  it('matches legacy section ordering and renders nested topic ancestry', async () => {
    mockedApi.getHomeData.mockResolvedValue({
      applications: [],
      appCategories: [makeEntity({ _id: 'explore-1', friendlyUrl: 'science', title: 'Science' })],
      diaryCategories: [makeEntity({ _id: 'diary-1', friendlyUrl: 'notes', title: 'Notes' })],
      myGroups: [makeEntity({ _id: 'group-1', friendlyUrl: 'research', title: 'Research' })],
    });
    mockedApi.getTopicEntry.mockResolvedValue({
      topic: makeEntity({ _id: 'topic-1', friendlyUrl: 'topic', title: 'Long Topic', contextTitle: 'Topic' }),
      parentTopic: makeEntity({ _id: 'parent-1', friendlyUrl: 'parent', title: 'Long Parent', contextTitle: 'Parent' }),
      grandParentTopic: makeEntity({ _id: 'grand-1', friendlyUrl: 'grand', title: 'Grand' }),
      topicChildren: [makeEntity({ _id: 'child-1', friendlyUrl: 'child', title: 'Child' })],
      topicChildrenMore: true,
      topicSiblings: [makeEntity({ _id: 'sibling-1', friendlyUrl: 'sibling', title: 'Sibling' })],
      parentSiblings: [makeEntity({ _id: 'uncle-1', friendlyUrl: 'uncle', title: 'Uncle' })],
      parentSiblingsMore: true,
    });

    render(<ContextSidebar />, { route: '/topics/entry/topic/topic-1' });

    await waitFor(() => expect(screen.getByRole('link', { name: 'Research' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Parent' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Topic' }).some((link) => link.getAttribute('href') === '/topics/entry/topic/topic-1'),
    ).toBe(true);
    expect(screen.getByRole('link', { name: 'Child' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Uncle' })).toBeInTheDocument();

    const sidebar = screen.getByRole('complementary', { name: /contextual navigation/i });
    const headers = Array.from(sidebar.querySelectorAll('.dropdown-header'));
    expect(headers.map((header) => header.firstChild?.textContent)).toEqual([
      'Apps',
      'In This Section',
      'Related',
      'My Journal',
      'Groups',
      'Explore',
      'My Shortcuts',
    ]);
  });
});
