import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test-utils/render';
import HomeRankingBuckets, { type HomeRankings } from './HomeRankingBuckets';

const entry = (id: string, title: string) => ({ _id: id, title }) as never;
const rankings: HomeRankings = {
  formulas: {
    latest: 'Newest edits.', trending: 'Recent momentum.', top: 'Durable engagement.',
    disclaimer: 'Discovery only; never truth.',
  },
  candidateCount: 3,
  candidateWindow: 'recent accepted entries',
  buckets: {
    latest: [entry('1', 'Latest item')],
    trending: [entry('2', 'Trending item')],
    top: [entry('3', 'Top item')],
  },
};

describe('HomeRankingBuckets', () => {
  it('explains and switches transparent discovery rankings', async () => {
    const user = userEvent.setup();
    render(<HomeRankingBuckets rankings={rankings} renderEntry={(item) => <li key={item._id}>{item.title}</li>} />);
    expect(screen.getByText('Latest item')).toBeInTheDocument();
    expect(screen.getByText(/Newest edits/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Trending/i }));
    expect(screen.getByText('Trending item')).toBeInTheDocument();
    expect(screen.getByText(/never truth/i)).toBeInTheDocument();
  });
});
