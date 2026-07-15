import React from 'react';
import userEvent from '@testing-library/user-event';
import VisualizePage from './VisualizePage';
import { render, screen, waitFor } from '../test-utils/render';

const mockGetHomeData = jest.fn();
const mockGetOutlineTree = jest.fn();

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getHomeData: (...args: unknown[]) => mockGetHomeData(...args),
    getOutlineTree: (...args: unknown[]) => mockGetOutlineTree(...args),
  },
}));

describe('VisualizePage', () => {
  beforeEach(() => {
    mockGetHomeData.mockReset();
    mockGetOutlineTree.mockReset();
  });

  it('renders live metrics and topic connections', async () => {
    const user = userEvent.setup();

    mockGetHomeData.mockResolvedValue({
      topics: [
        { _id: 't1', title: 'Climate Policy', friendlyUrl: 'climate-policy' },
        { _id: 't2', title: 'Energy Grid', friendlyUrl: 'energy-grid' },
      ],
      arguments: [
        { _id: 'a1', title: 'Carbon pricing lowers emissions', friendlyUrl: 'carbon-pricing', ownerId: 't1' },
      ],
      questions: [
        { _id: 'q1', title: 'How fast can renewables scale?', friendlyUrl: 'renewables-scale', ownerId: 't1' },
      ],
      issues: [],
      opinions: [],
      artifacts: [],
      answers: [],
    });
    mockGetOutlineTree.mockResolvedValue({
      success: true,
      trees: [
        {
          _id: 't1',
          title: 'Climate Policy',
          friendlyUrl: 'climate-policy',
          objectName: 'topic',
          children: [
            {
              _id: 't2',
              title: 'Energy Grid',
              friendlyUrl: 'energy-grid',
              objectName: 'topic',
              children: [
                {
                  _id: 't3',
                  title: 'Grid Storage',
                  friendlyUrl: 'grid-storage',
                  objectName: 'topic',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });

    render(<VisualizePage />, { route: '/visualize' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /knowledge graph explorer/i })).toBeInTheDocument();
    });

    expect(mockGetOutlineTree).toHaveBeenCalledWith(undefined, 4);
    expect(screen.getByText('3')).toBeInTheDocument(); // complete outline topic count
    expect(screen.getByRole('button', { name: /climate policy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grid storage/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /climate policy/i }));

    expect(screen.getByText(/carbon pricing lowers emissions/i)).toBeInTheDocument();
    expect(screen.getByText(/how fast can renewables scale/i)).toBeInTheDocument();
  });
});
