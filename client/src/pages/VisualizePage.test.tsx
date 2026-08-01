import React from 'react';
import { Route, Routes } from 'react-router-dom';
import VisualizePage from './VisualizePage';
import { fireEvent, render, screen, waitFor } from '../test-utils/render';

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
      hierarchyContext: 'root',
      truncated: false,
    });

    render(<VisualizePage />, { route: '/visualize' });

    expect(await screen.findByRole('heading', { name: /visualize/i })).toBeInTheDocument();
    expect(mockGetOutlineTree).toHaveBeenCalledWith(undefined, 1, { childLimit: 11, rootLimit: 20 });
    expect(screen.getByText('3 topics')).toBeInTheDocument();
    expect(screen.getByText('Root topics + 1 child level')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /knowledge graph/i })).toBeInTheDocument();
    expect(screen.queryByText('Knowledge Graph Explorer')).not.toBeInTheDocument();
    expect(screen.queryByText('Topics in Graph')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Up$/)).not.toBeInTheDocument();

    const helpButton = screen.getByRole('button', { name: /how to use the knowledge graph/i });
    fireEvent.click(helpButton);
    expect(screen.getByRole('dialog', { name: /knowledge graph help/i })).toBeInTheDocument();
    expect(helpButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog', { name: /knowledge graph help/i })).not.toBeInTheDocument();
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
          archived: true,
          children: [],
        },
      ],
      hierarchyContext: 'complete',
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
    expect(screen.getByRole('link', { name: 'Up to Health & Medicine' })).toHaveAttribute(
      'href',
      '/visualize/topic/health-medicine/health',
    );
    expect(screen.getByRole('button', { name: 'Up to Health & Medicine' })).toBeInTheDocument();
    expect(screen.getByText(/^Up$/)).toBeInTheDocument();
    expect(screen.getByText('Parents + 2 child levels')).toBeInTheDocument();
    expect(screen.getByText('3 topics')).toBeInTheDocument();
    expect(screen.getByLabelText('Health & Medicine is archived hierarchy context')).toBeInTheDocument();
    expect(screen.getByText('Archived context')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open topic/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /center here/i })).not.toBeInTheDocument();
  });

  it('uses singular topic copy and omits Up navigation for a top-level topic', async () => {
    mockGetOutlineTree.mockResolvedValue({
      success: true,
      tree: {
        _id: 'science',
        title: 'Science',
        friendlyUrl: 'science',
        objectName: 'topic',
        children: [],
      },
      ancestors: [],
      hierarchyContext: 'root',
      truncated: false,
    });

    render(
      <Routes>
        <Route path="/visualize/topic/:friendlyUrl/:id" element={<VisualizePage />} />
      </Routes>,
      { route: '/visualize/topic/science/science' },
    );

    expect(await screen.findByText('1 topic')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Root view' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Up to/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Up$/)).not.toBeInTheDocument();
  });

  it('shows a bounded graph warning instead of inventing root ancestry for an older response', async () => {
    mockGetOutlineTree.mockResolvedValue({
      success: true,
      tree: {
        _id: 'cuba',
        title: 'Cuba',
        friendlyUrl: 'cuba',
        objectName: 'topic',
        children: [],
      },
      truncated: false,
    });

    render(
      <Routes>
        <Route path="/visualize/topic/:friendlyUrl/:id" element={<VisualizePage />} />
      </Routes>,
      { route: '/visualize/topic/cuba/cuba' },
    );

    expect(await screen.findByText('Parent context unavailable')).toBeInTheDocument();
    expect(screen.getByText(/current topic and available children only/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Up$/)).not.toBeInTheDocument();
  });
});
