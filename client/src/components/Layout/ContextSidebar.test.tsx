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
    getAnswerEntry: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseApplicationContext = jest.fn();

jest.mock('../../context/ApplicationContext', () => ({
  useApplicationContext: () => mockUseApplicationContext(),
}));

describe('ContextSidebar', () => {
  beforeEach(() => {
    mockedApi.getHomeData.mockReset();
    mockedApi.getTopicEntry.mockReset();
    mockedApi.getAnswerEntry.mockReset();
    mockUseApplicationContext.mockReturnValue({
      application: null,
      applications: [],
      appCategories: [],
      applicationPath: (path: string) => path,
      localTenantContext: false,
      platformHomeUrl: '/',
    });
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
      diaryCategories: [makeEntity({ _id: 'diary-1', friendlyUrl: 'notes', title: 'Notes' })],
      myGroups: [makeEntity({ _id: 'group-1', friendlyUrl: 'research', title: 'Research' })],
    });
    mockUseApplicationContext.mockReturnValue({
      application: null,
      applications: [],
      appCategories: [makeEntity({ _id: 'explore-1', friendlyUrl: 'science', title: 'Science' })],
      applicationPath: (path: string) => path,
      localTenantContext: false,
      platformHomeUrl: '/',
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

  it('uses the answer id rather than a discussion subroute as sidebar context', async () => {
    mockedApi.getHomeData.mockResolvedValue({});
    mockedApi.getAnswerEntry.mockResolvedValue({
      answer: makeEntity({ _id: 'answer-1', title: 'Answer' }),
      topicLinks: [],
    });

    render(<ContextSidebar />, { route: '/answers/entry/answer-1/discussion' });

    await waitFor(() => expect(mockedApi.getAnswerEntry).toHaveBeenCalledWith('answer-1'));
    expect(mockedApi.getAnswerEntry).not.toHaveBeenCalledWith('discussion');
  });

  it('renders tenant apps and keeps local category navigation in the civic shell', async () => {
    mockedApi.getHomeData.mockResolvedValue({});
    mockUseApplicationContext.mockReturnValue({
      application: { id: 'fixtheph', exploreUrl: '/civic' },
      applications: [{ id: 'fixtheph', title: 'Fix The Philippines', homeUrl: '/civic', logoIcon: '/fixph.png' }],
      appCategories: [makeEntity({ _id: 'ph-1', friendlyUrl: 'ph-subtopic', title: 'PH subtopic' })],
      applicationPath: (path: string) => path.startsWith('/civic') ? path : `${path}${path.includes('?') ? '&' : '?'}civic=1`,
      localTenantContext: true,
      platformHomeUrl: '/',
    });

    render(<ContextSidebar />, { route: '/civic' });

    expect(await screen.findByRole('link', { name: 'Fix The Philippines' })).toHaveAttribute('href', '/civic');
    expect(screen.getByRole('link', { name: 'Wikitruth' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'PH subtopic' })).toHaveAttribute(
      'href',
      '/topics/entry/ph-subtopic/ph-1?civic=1',
    );
  });
});
