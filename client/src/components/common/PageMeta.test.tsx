import React from 'react';
import { render, waitFor } from '@testing-library/react';
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
  afterEach(() => {
    document.title = '';
  });

  it('renders OpenGraph and Twitter tags with all props', async () => {
    renderPageMeta({
      title: 'Test',
      description: 'A test description',
      ogImage: 'https://example.com/img.png',
      ogType: 'article',
      canonicalUrl: 'https://example.com/page',
    });

    await waitFor(() => {
      expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toContain('Test');
      expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('A test description');
      expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('article');
      expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://example.com/img.png');
      expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://example.com/page');
      expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary');
      expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toContain('Test');
      expect(document.head.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe('A test description');
      expect(document.head.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/img.png');
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://example.com/page');
    });
  });

  it('renders core social title tags without optional props', async () => {
    renderPageMeta({ title: 'Minimal' });

    await waitFor(() => {
      expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toContain('Minimal');
      expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toContain('Minimal');
      expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website');
      expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary');
    });
  });
});
