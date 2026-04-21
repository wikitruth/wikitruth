import React from 'react';
import SearchPage from './SearchPage';
import { render, screen, waitFor } from '../test-utils/render';

const mockSearch = jest.fn();
const mockUseAuth = jest.fn();
const mockUseNotification = jest.fn();

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: () => mockUseNotification(),
}));

describe('SearchPage', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    mockUseAuth.mockReset();
    mockUseNotification.mockReset();
    mockUseAuth.mockReturnValue({ user: null });
    mockUseNotification.mockReturnValue({
      toasts: [],
      addToast: jest.fn(),
      removeToast: jest.fn(),
    });
  });

  it('requests all-tab search and renders bucket sections with view-more links', async () => {
    mockSearch.mockResolvedValue({
      tab: 'all',
      content: 'all',
      results: true,
      topics: [{ _id: 't1', title: 'Topic One', friendlyUrl: 'topic-one' }],
      arguments: [{ _id: 'a1', title: 'Argument One', friendlyUrl: 'argument-one' }],
      questions: [],
      answers: [],
      artifacts: [],
      issues: [],
      opinions: [],
      topicsMore: true,
      argumentsMore: true,
    });

    render(<SearchPage />, { route: '/search?q=truth' });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('truth', { tab: 'all', content: 'all' });
    });

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /topics/i })).toBeInTheDocument();
    expect(screen.getByText(/topic one/i)).toBeInTheDocument();
    expect(screen.getByText(/argument one/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /view more/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('passes tab/content from query params and renders scoped radios for authenticated users', async () => {
    mockUseAuth.mockReturnValue({ user: { _id: 'u1', username: 'demo' } });
    mockSearch.mockResolvedValue({
      tab: 'topics',
      content: 'journal',
      results: true,
      topics: [{ _id: 't2', title: 'Journal Topic', friendlyUrl: 'journal-topic' }],
      arguments: [],
      questions: [],
      answers: [],
      artifacts: [],
      issues: [],
      opinions: [],
    });

    render(<SearchPage />, { route: '/search?q=journal&tab=topics&content=diary' });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('journal', { tab: 'topics', content: 'journal' });
    });

    expect(screen.getByLabelText(/all content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/public wiki/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/my journal/i)).toBeInTheDocument();
    expect(screen.getByText(/journal topic/i)).toBeInTheDocument();
  });
});
