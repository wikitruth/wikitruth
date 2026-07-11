import React from 'react';
import { render, screen } from '../../test-utils/render';
import GeoPatternBackground from './GeoPatternBackground';
import { createGeoPatternDataUrl } from '../../utils/geoPattern';

jest.mock('../../utils/geoPattern', () => ({
  createGeoPatternDataUrl: jest.fn(() => 'url("data:image/svg+xml;base64,abc")'),
}));

const generateMock = createGeoPatternDataUrl as jest.Mock;

describe('GeoPatternBackground', () => {
  it('renders with default height', () => {
    const { container } = render(<GeoPatternBackground seed="test" />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ height: '120px' });
  });

  it('renders with custom height', () => {
    const { container } = render(<GeoPatternBackground seed="test" height={200} />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle({ height: '200px' });
  });

  it('applies the wt-geo-pattern class', () => {
    const { container } = render(<GeoPatternBackground seed="test" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('wt-geo-pattern');
  });

  it('applies custom className', () => {
    const { container } = render(<GeoPatternBackground seed="test" className="my-class" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('my-class');
  });

  it('renders children', () => {
    render(
      <GeoPatternBackground seed="test">
        <span>Child content</span>
      </GeoPatternBackground>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('generates pattern from seed', () => {
    render(<GeoPatternBackground seed="my-seed" />);
    expect(generateMock).toHaveBeenCalledWith('my-seed');
  });
});
