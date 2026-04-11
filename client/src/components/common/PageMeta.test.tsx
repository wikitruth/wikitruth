import React from 'react';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import PageMeta from './PageMeta';

const renderPageMeta = (props: React.ComponentProps<typeof PageMeta>) => {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PageMeta {...props} />
      </MemoryRouter>
    </HelmetProvider>
  );
};

describe('PageMeta', () => {
  it('renders without crashing', () => {
    const { container } = renderPageMeta({ title: 'My Page' });
    expect(container).toBeTruthy();
  });

  it('renders with all props', () => {
    const { container } = renderPageMeta({
      title: 'Test',
      description: 'A test description',
      ogImage: 'https://example.com/img.png',
      ogType: 'article',
      canonicalUrl: 'https://example.com/page',
    });
    expect(container).toBeTruthy();
  });

  it('renders without optional props', () => {
    const { container } = renderPageMeta({ title: 'Minimal' });
    expect(container).toBeTruthy();
  });
});
