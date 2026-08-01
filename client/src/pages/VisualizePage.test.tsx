import React from 'react';
import { Route, Routes } from 'react-router-dom';
import VisualizePage from './VisualizePage';
import { render, screen, waitFor } from '../test-utils/render';

const mockGetOutlineTree = jest.fn();
const mockSearchOutlineTargets = jest.fn();

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: jest.fn() }),
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getOutlineTree: (...args: unknown[]) => mockGetOutlineTree(...args),
    searchOutlineTargets: (...args: unknown[]) => mockSearchOutlineTargets(...args),
  },
}));

describe('VisualizePage', () => {
  beforeEach(() => {
    mockGetOutlineTree.mockReset();
    mockSearchOutlineTargets.mockReset();
    mockSearchOutlineTargets.mockResolvedValue({ success: true, results: [] });
  });

  it('puts a bounded root graph before compact, honest scope information', async () => {
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
              children: [],
            },
          ],
        },
        {
          _id: 't3',
          title: 'Public Health',
          friendlyUrl: 'public-health',
          objectName: 'topic',
          children: [],
        },
      ],
      ancestors: [],
      truncated: false,
    });

    render(<VisualizePage />, { route: '/visualize' });

    expect(await screen.findByRole('heading', { name: /visualize/i })).toBeInTheDocument();
    expect(mockGetOutlineTree).toHaveBeenCalledWith(undefined, 1, { childLimit: 11, rootLimit: 20 });
    expect(screen.getByText('3 topics')).toBeInTheDocument();
    expect(screen.getByText('Root topics + 1 level below')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /knowledge graph/i })).toBeInTheDocument();
    expect(screen.queryByText('Knowledge Graph Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Topics in Graph')).not.toBeInTheDocument();
  });

  it('loads selected-topic descendants and exposes its parent as upward navigation', async () => {
    mockGetOutlineTree.mockResolvedValue({
      success: true,
      tree: {
        _id: 'addiction',
        title: 'Addiction',
        friendlyUrl: 'addiction',
        objectName: 'topic',
        children: [
          {
            _id: 'recovery',
            title: 'Recovery',
            friendlyUrl: 'recovery',
            objectName: 'topic',
            children: [],
          },
        ],
      },
      ancestors: [
        {
          _id: 'health',
          title: 'Health & Medicine',
          friendlyUrl: 'health-medicine',
          objectName: 'topic',
          children: [],
        },
      ],
      truncated: false,
    });

    render(
      <Routes>
        <Route path="/visualize/topic/:friendlyUrl/:id" element={<VisualizePage />} />
      </Routes>,
      { route: '/visualize/topic/addiction/addiction' },
    );

    await waitFor(() => {
      expect(mockGetOutlineTree).toHaveBeenCalledWith('addiction', 2, { ancestorDepth: 20, childLimit: 11 });
    });
    expect(screen.getByRole('link', { name: 'Health & Medicine' })).toHaveAttribute(
      'href',
      '/visualize/topic/health-medicine/health',
    );
    expect(screen.getByRole('button', { name: 'Up to Health & Medicine' })).toBeInTheDocument();
    expect(screen.getByText('Current topic, ancestors + 2 levels below')).toBeInTheDocument();
    expect(screen.getByText('3 topics')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('.wt-viz-node-action strong')).toHaveTextContent('Addiction');
    });
    expect(screen.getByRole('button', { name: /open topic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /center here/i })).toBeInTheDocument();
  });
});
