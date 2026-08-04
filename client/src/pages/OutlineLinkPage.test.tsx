import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import OutlineLinkPage from './OutlineLinkPage';
import apiService from '../services/api';

const mockNavigate = jest.fn();

jest.mock('react-router', () => {
  const actual = jest.requireActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getOutlineTree: jest.fn(),
    searchOutlineTargets: jest.fn(),
    createOutlineLink: jest.fn(),
  },
}));

jest.mock('../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('OutlineLinkPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getOutlineTree.mockResolvedValue({
      success: true,
      trees: [
        {
          _id: 'topic-1',
          title: 'Root Topic',
          objectName: 'topic',
          children: [],
        },
      ],
    } as never);
    mockedApi.searchOutlineTargets.mockResolvedValue({
      success: true,
      results: [
        {
          _id: 'arg-1',
          title: 'Argument One',
          objectName: 'argument',
        },
      ],
    } as never);
    mockedApi.createOutlineLink.mockResolvedValue({ success: true } as never);
  });

  it('loads topic hierarchy and creates a link from selected search result', async () => {
    const user = userEvent.setup();
    render(<OutlineLinkPage />, { route: '/outline/link?parentId=topic-1&parentTitle=Root%20Topic' });

    await waitFor(() => expect(mockedApi.getOutlineTree).toHaveBeenCalledWith('topic-1', 2));

    await user.type(screen.getByLabelText(/search topics, arguments, or artifacts/i), 'Argument');
    await waitFor(() =>
      expect(mockedApi.searchOutlineTargets).toHaveBeenLastCalledWith('Argument', {
        types: 'topic,argument,artifact',
        limit: 25,
      }),
    );

    await user.click(await screen.findByRole('button', { name: /argument one/i }));
    await user.selectOptions(screen.getByLabelText(/relationship/i), 'support');
    await user.click(screen.getByRole('button', { name: /create link/i }));

    await waitFor(() =>
      expect(mockedApi.createOutlineLink).toHaveBeenCalledWith({
        parentId: 'topic-1',
        targetId: 'arg-1',
        relationship: 'support',
        citation: undefined,
      }),
    );
    expect(await screen.findByText(/link created successfully/i)).toBeInTheDocument();
  });
});
