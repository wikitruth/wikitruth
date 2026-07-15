import React from 'react';
import { render, screen, waitFor } from '../test-utils/render';
import apiService from '../services/api';
import { ApplicationProvider, useApplicationContext } from './ApplicationContext';
import type { Application } from '../types';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { getApplicationContext: jest.fn() },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

const fixPhApplication: Application = {
  id: 'fixtheph',
  title: 'Fix The Philippines',
  navTitle: 'FixPH',
  slogan: 'Philippine transparency and accountability.',
  logoIcon: '/img/fixtheph/logo-64x64.png',
  homeUrl: '/civic',
  aboutUrl: '/civic',
  exploreUrl: '/civic',
  civicTenant: {
    tenantId: 'fixtheph',
    status: 'active',
    countryCode: 'PH',
    title: 'Fix The Philippines',
    navTitle: 'FixPH',
    slogan: 'Philippine transparency and accountability.',
    domains: ['fixthephilippines.org'],
    branding: {
      logoIcon: '/img/fixtheph/logo-64x64.png',
      favicon: '/img/fixtheph/favicons/favicon.ico',
      primaryColor: '#2f6b4f',
      accentColor: '#d96b27',
      surfaceColor: '#f4f0e5',
      fontFamily: 'Georgia',
    },
    localization: { defaultLocale: 'en-PH', supportedLocales: ['en-PH'], timezone: 'Asia/Manila', currency: 'PHP' },
    geography: { levels: [{ key: 'country', label: 'Country' }], addressFields: ['address'] },
    sections: [],
    featureFlags: {},
    extensionSchemas: {},
    moderationPolicyVersion: '1',
    electionSystem: 'plurality',
    deploymentMode: 'shared',
  },
};

const Consumer: React.FC = () => {
  const context = useApplicationContext();
  return (
    <div>
      <span data-testid="app-name">{context.application?.navTitle || 'Wikitruth'}</span>
      <span data-testid="app-path">{context.applicationPath('/search?tab=topics#browse')}</span>
      <span data-testid="platform-home">{context.platformHomeUrl}</span>
    </div>
  );
};

describe('ApplicationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.className = '';
    document.documentElement.removeAttribute('style');
  });

  it('activates a complete same-origin FixPH shell for local civic routes', async () => {
    mockedApi.getApplicationContext.mockResolvedValue({
      application: fixPhApplication,
      applications: [fixPhApplication],
      appCategories: [],
    });

    const rendered = render(
      <ApplicationProvider><Consumer /></ApplicationProvider>,
      { route: '/civic/projects' },
    );

    await waitFor(() => expect(screen.getByTestId('app-name')).toHaveTextContent('FixPH'));
    expect(mockedApi.getApplicationContext).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('app-path')).toHaveTextContent('/search?tab=topics&civic=1#browse');
    expect(screen.getByTestId('platform-home')).toHaveTextContent('/');
    expect(document.body).toHaveClass('wt-tenant-app', 'app-fixtheph');
    expect(document.body.dataset.application).toBe('fixtheph');
    expect(document.documentElement.style.getPropertyValue('--tenant-primary')).toBe('#2f6b4f');
    expect(document.title).toBe('FixPH');
    expect(document.head.querySelector('meta[name="application-name"]')).toHaveAttribute('content', 'FixPH');
    expect(document.head.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#2f6b4f');
    expect(document.head.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/img/fixtheph/favicons/favicon.ico');
    expect(document.head.querySelector('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/img/fixtheph/favicons/manifest.json',
    );

    rendered.unmount();
    expect(document.body).not.toHaveClass('wt-tenant-app', 'app-fixtheph');
    expect(document.documentElement.style.getPropertyValue('--tenant-primary')).toBe('');
  });

  it('keeps Wikitruth as the default application shell', async () => {
    mockedApi.getApplicationContext.mockResolvedValue({ application: null, applications: [], appCategories: [] });

    render(<ApplicationProvider><Consumer /></ApplicationProvider>, { route: '/' });

    await waitFor(() => expect(mockedApi.getApplicationContext).toHaveBeenCalledWith(false));
    expect(screen.getByTestId('app-name')).toHaveTextContent('Wikitruth');
    expect(screen.getByTestId('app-path')).toHaveTextContent('/search?tab=topics#browse');
    expect(document.body).not.toHaveClass('wt-tenant-app');
    await waitFor(() => expect(document.title).toBe('Wikitruth'));
  });
});
