import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import ClipboardPage, { addToClipboard, removeFromClipboard } from './ClipboardPage';

jest.mock('../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

const STORAGE_KEY = 'wt_clipboard';

describe('ClipboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows empty state when clipboard has no items', async () => {
    render(<ClipboardPage />);
    expect(await screen.findByText(/your clipboard is empty/i)).toBeInTheDocument();
  });

  it('renders clipboard items from localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          _id: 'topic-1',
          title: 'Climate Change',
          type: 'topic',
          entryId: 'topic-1',
          friendlyUrl: 'climate-change',
          addedAt: '2026-04-13T00:00:00.000Z',
        },
      ]),
    );

    render(<ClipboardPage />);
    expect(await screen.findByText('Climate Change')).toBeInTheDocument();
    expect(screen.getByText('topic')).toBeInTheDocument();
  });

  it('removes one item and updates localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          _id: 'topic-1',
          title: 'Climate Change',
          type: 'topic',
          entryId: 'topic-1',
          friendlyUrl: 'climate-change',
          addedAt: '2026-04-13T00:00:00.000Z',
        },
      ]),
    );

    render(<ClipboardPage />);
    await screen.findByText('Climate Change');
    await user.click(screen.getByTitle(/remove/i));

    await waitFor(() => expect(screen.getByText(/your clipboard is empty/i)).toBeInTheDocument());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([]));
  });

  it('clears all clipboard items', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          _id: 'topic-1',
          title: 'Climate Change',
          type: 'topic',
          entryId: 'topic-1',
          friendlyUrl: 'climate-change',
          addedAt: '2026-04-13T00:00:00.000Z',
        },
        {
          _id: 'arg-1',
          title: 'Argument A',
          type: 'argument',
          entryId: 'arg-1',
          friendlyUrl: 'argument-a',
          addedAt: '2026-04-13T00:10:00.000Z',
        },
      ]),
    );

    render(<ClipboardPage />);
    await screen.findByText('Climate Change');
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    await waitFor(() => expect(screen.getByText(/your clipboard is empty/i)).toBeInTheDocument());
  });

  it('addToClipboard deduplicates and caps to 100 items', () => {
    addToClipboard({
      _id: 'topic-1',
      title: 'Climate Change',
      type: 'topic',
      entryId: 'topic-1',
      friendlyUrl: 'climate-change',
    });
    addToClipboard({
      _id: 'topic-1',
      title: 'Climate Change (updated)',
      type: 'topic',
      entryId: 'topic-1',
      friendlyUrl: 'climate-change',
    });

    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Array<{ _id: string; title: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toContain('updated');

    for (let index = 0; index < 120; index += 1) {
      addToClipboard({
        _id: `id-${index}`,
        title: `Item ${index}`,
        type: 'topic',
        entryId: `id-${index}`,
      });
    }
    const cappedRows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Array<{ _id: string }>;
    expect(cappedRows).toHaveLength(100);
  });

  it('removeFromClipboard removes matching ids', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { _id: 'a', title: 'A', type: 'topic', entryId: 'a', addedAt: '2026-04-13T00:00:00.000Z' },
        { _id: 'b', title: 'B', type: 'topic', entryId: 'b', addedAt: '2026-04-13T00:00:00.000Z' },
      ]),
    );
    removeFromClipboard('a');
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Array<{ _id: string }>;
    expect(rows).toEqual([{ _id: 'b', title: 'B', type: 'topic', entryId: 'b', addedAt: '2026-04-13T00:00:00.000Z' }]);
  });
});
