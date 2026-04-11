import React from 'react';
import GeoPatternBackground from '../components/common/GeoPatternBackground';

const meta = {
  title: 'Data Display/GeoPatternBackground',
  component: GeoPatternBackground,
  args: {
    seed: 'wikitruth',
    height: 120,
  },
};

export default meta;

export const Default = {};

export const Tall = {
  args: { seed: 'tall-pattern', height: 200 },
};

export const DifferentSeeds = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GeoPatternBackground seed="alpha" height={80} />
      <GeoPatternBackground seed="beta" height={80} />
      <GeoPatternBackground seed="gamma" height={80} />
      <GeoPatternBackground seed="delta" height={80} />
    </div>
  ),
};

export const WithChildren = {
  args: {
    seed: 'overlay',
    height: 160,
    children: (
      <h2 style={{ color: '#fff', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
        Overlay Text
      </h2>
    ),
  },
};
