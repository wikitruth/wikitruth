import React from 'react';
import SearchPage from './SearchPage';
import { render, screen, waitFor } from '../test-utils/render';

const mockSearch = jest.fn();

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

describe('SearchPage', () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it('renders parity result buckets returned by search API', async () => {
    mockSearch.mockResolvedValue({
      topics: [{ _id: 't1', title: 'Topic One', friendlyUrl: 'topic-one' }],
      arguments: [{ _id: 'a1', title: 'Argument One', friendlyUrl: 'argument-one' }],
      questions: [{ _id: 'q1', title: 'Question One', friendlyUrl: 'question-one' }],
      answers: [{ _id: 'an1', title: 'Answer One' }],
      issues: [{ _id: 'i1', title: 'Issue One', friendlyUrl: 'issue-one' }],
      opinions: [{ _id: 'o1', title: 'Opinion One', friendlyUrl: 'opinion-one' }],
      artifacts: [{ _id: 'ar1', title: 'Artifact One', friendlyUrl: 'artifact-one' }],
    });

    render(<SearchPage />, { route: '/search?q=truth' });

    await waitFor(() => {
      expect(screen.getByText(/found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/topics \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/arguments \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/questions \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/answers \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/issues \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/opinions \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/artifacts \(1\)/i)).toBeInTheDocument();
  });
});
