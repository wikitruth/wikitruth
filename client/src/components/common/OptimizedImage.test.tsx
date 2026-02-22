import React from 'react';
import OptimizedImage from './OptimizedImage';
import { render, screen } from '../../test-utils/render';

describe('OptimizedImage', () => {
  it('renders optimized image attributes', () => {
    render(<OptimizedImage src="/img/logo.png" alt="logo" width={10} height={10} />);

    const image = screen.getByRole('img', { name: /logo/i });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
  });
});
