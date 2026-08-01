import React from 'react';
import { render, screen } from '../../test-utils/render';
import { ApplicationContext, type ApplicationContextValue } from '../../context/ApplicationContext';
import Footer from './Footer';

describe('Footer application navigation', () => {
  it('uses tenant Home and About destinations while preserving local context', () => {
    const context: ApplicationContextValue = {
      application: { id: 'fixtheph', homeUrl: '/civic', aboutUrl: '/civic' },
      applications: [],
      appCategories: [],
      loading: false,
      error: null,
      localTenantContext: true,
      platformHomeUrl: '/',
      applicationPath: (path) => path.startsWith('/civic') ? path : `${path}?civic=1`,
      refresh: async () => undefined,
    };

    render(
      <ApplicationContext.Provider value={context}>
        <Footer />
      </ApplicationContext.Provider>,
    );

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/civic');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/civic');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact?civic=1');
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://github.com/wikitruth/wikitruth',
    );
    expect(screen.getByRole('link', { name: /license/i })).toHaveAttribute(
      'href',
      'https://github.com/wikitruth/wikitruth/blob/develop/LICENSE',
    );
  });

  it('renders a compact information footer for focused authentication screens', () => {
    render(<Footer compact />);

    expect(screen.getByRole('navigation', { name: /wikitruth information/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Policies' })).toHaveAttribute('href', '/policies');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/wikitruth/wikitruth',
    );
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} Wikitruth`))).toBeInTheDocument();
  });
});
