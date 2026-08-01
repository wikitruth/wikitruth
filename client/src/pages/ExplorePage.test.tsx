import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useApplicationContext } from '../context/ApplicationContext';
import ExplorePage from './ExplorePage';

jest.mock('../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getHomeData: jest.fn(),
  },
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../context/ApplicationContext', () => ({
  useApplicationContext: jest.fn(),
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseApplicationContext = useApplicationContext as jest.MockedFunction<typeof useApplicationContext>;

describe('ExplorePage parity controls', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedUseNotification.mockReturnValue({
      addToast: jest.fn(),
      removeToast: jest.fn(),
      toasts: [],
    });
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });
    mockedUseApplicationContext.mockReturnValue({
      application: { exploreTopicId: 'root-topic' },
      applications: [],
      appCategories: [],
      loading: false,
      error: null,
      localTenantContext: false,
      platformHomeUrl: '/',
      applicationPath: (path: string) => path,
      refresh: jest.fn(),
    });
    mockedApi.getHomeData.mockResolvedValue({
      appCategories: [
        {
          _id: 'category-1',
          title: 'Culture & Society',
          friendlyUrl: 'culture-society',
          subtopics: [],
          childrenCount: { topics: { accepted: 13 } },
        },
      ],
      questions: [
        {
          _id: 'accepted-question',
          title: 'Accepted question',
          friendlyUrl: 'accepted-question',
          screening: { status: 1 },
        },
        {
          _id: 'pending-question',
          title: 'Pending question',
          friendlyUrl: 'pending-question',
          screening: { status: 0 },
        },
      ],
    } as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('restores Explore header actions and keeps compact category and tab labels readable', async () => {
    render(<ExplorePage />, { route: '/explore' });

    expect(await screen.findByRole('heading', { name: /explore/i })).toHaveClass('page-header');
    expect(screen.getByRole('link', { name: 'Jump to latest posts' })).toHaveAttribute('href', '#browse');
    expect(screen.getByRole('link', { name: 'Visualize' })).toHaveAttribute(
      'href',
      '/visualize/topic/root-topic'
    );
    const categoryLink = screen.getByRole('link', { name: 'View all 13 topics' });
    expect(categoryLink).toHaveTextContent('All 13');
    expect(categoryLink).not.toHaveTextContent('more');
    expect(screen.getByRole('tab', { name: 'Questions' }).querySelector('span')).toHaveClass(
      'wt-explore-tab-label'
    );
    expect(screen.getByRole('tab', { name: 'Questions' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('collapses advanced filters and applies content state filtering', async () => {
    const user = userEvent.setup();
    render(<ExplorePage />, { route: '/explore' });

    expect(await screen.findByText('Accepted question')).toBeInTheDocument();
    expect(screen.getByText('Pending question')).toBeInTheDocument();
    expect(screen.getByLabelText('Accepted after screening')).toBeInTheDocument();

    const filterToggle = screen.getByRole('button', { name: 'Advanced filters' });
    expect(filterToggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('explore-advanced-filters')).not.toHaveClass('is-open');
    await user.click(filterToggle);
    expect(screen.getByRole('button', { name: 'Hide advanced filters' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(document.getElementById('explore-advanced-filters')).toHaveClass('is-open');

    await user.click(screen.getByRole('button', { name: 'Accepted' }));
    await waitFor(() => expect(screen.queryByText('Pending question')).not.toBeInTheDocument());
    expect(screen.getByText('Accepted question')).toBeInTheDocument();
    expect(screen.queryByLabelText('Accepted after screening')).not.toBeInTheDocument();
  });
});
