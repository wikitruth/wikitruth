import React from 'react';
import { fireEvent, render, screen } from '../../test-utils/render';
import Header from './Header';

const mockUseApplicationContext = jest.fn();
const mockNotificationSummary = jest.fn();
let mockUser: { _id: string; username: string; email: string; roles: Record<string, unknown> } | null = null;

jest.mock('../../services/api/notifications', () => ({
  __esModule: true,
  default: {
    summary: (...args: unknown[]) => mockNotificationSummary(...args),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    activeRole: 'reader',
    setActiveRole: jest.fn(),
    availableRoles: ['reader'],
  }),
}));

jest.mock('../../context/ApplicationContext', () => ({
  useApplicationContext: () => mockUseApplicationContext(),
}));

jest.mock('./ThemeToggle', () => ({
  __esModule: true,
  default: ({ focused = false }: { focused?: boolean }) => (
    <button type="button" data-focused={focused}>Theme toggle</button>
  ),
}));

describe('Header parity navigation', () => {
  beforeEach(() => {
    mockUser = null;
    mockNotificationSummary.mockResolvedValue({ unreadCount: 0 });
    mockUseApplicationContext.mockReturnValue({
      application: null,
      applicationPath: (path: string) => path,
    });
  });

  it('restores the legacy default section links in the More menu', async () => {
    render(<Header />);

    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }));

    expect(await screen.findByRole('link', { name: /debates/i })).toHaveAttribute(
      'href',
      '/topics/entry/debates-discussions'
    );
    expect(screen.getByRole('link', { name: /dictionary/i })).toHaveAttribute(
      'href',
      '/topics/entry/dictionary'
    );
    expect(screen.getByRole('link', { name: /manuscripts/i })).toHaveAttribute(
      'href',
      '/topics/entry/sacred-texts'
    );
  });

  it('renders application sections and converts legacy topic URLs', async () => {
    mockUseApplicationContext.mockReturnValue({
      application: {
        id: 'fixtheph',
        title: 'Fix The Philippines',
        navTitle: 'FixPH',
        logoIcon: '/img/fixtheph/logo-64x64.png',
        homeUrl: '/civic',
        exploreUrl: '/civic',
        aboutUrl: '/topic/fixthephilippines-org',
        sections: [
          {
            title: 'Incidents',
            description: 'Incidents in the Philippines',
            iconClass: 'fa fa-bolt',
            url: '/topic/incidents-in-the-philippines',
          },
        ],
      },
      applicationPath: (path: string) => path,
    });

    render(<Header />);

    expect(screen.getByRole('link', { name: /fixph/i })).toHaveAttribute('href', '/civic');
    expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('href', '/civic');
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }));

    expect(await screen.findByRole('link', { name: /incidents/i })).toHaveAttribute(
      'href',
      '/topics/entry/incidents-in-the-philippines'
    );
    expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute(
      'href',
      '/topics/entry/fixthephilippines-org'
    );
    expect(screen.queryByRole('link', { name: /debates/i })).not.toBeInTheDocument();
  });

  it('keeps anonymous contribution available without occupying the mobile navbar', async () => {
    const { container } = render(<Header />);

    const directContribution = container.querySelector('.wt-account-nav > li.hidden-xs a[href="/contribute"]');
    expect(directContribution).toHaveAttribute('aria-label', 'Contribute anonymously');

    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }));
    const mobileContribution = container.querySelector('#header-more-menu > li.visible-xs a[href="/contribute"]');
    expect(mobileContribution).toHaveTextContent('Contribute anonymously');
    expect(container.querySelector('#header-more-menu')).toHaveClass('wt-header-more-menu');
  });

  it('updates account navigation when shared authentication state changes', () => {
    const { rerender } = render(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();

    mockUser = { _id: 'user-1', username: 'email_user', email: 'email@example.test', roles: {} };
    rerender(<Header />);
    expect(screen.getByRole('button', { name: 'Account menu for email_user' })).toBeInTheDocument();

    mockUser = null;
    rerender(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does not repeat the sign-in link on the sign-in page', () => {
    render(<Header />, { route: '/login' });

    expect(screen.queryByRole('link', { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it('uses a minimal branded header for focused authentication screens', () => {
    render(<Header focused />, { route: '/login' });

    expect(screen.getByRole('link', { name: /wikitruth/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /theme toggle/i })).toHaveAttribute('data-focused', 'true');
    expect(screen.queryByRole('button', { name: /toggle navigation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('includes the theme control in standard account navigation', () => {
    render(<Header />);

    expect(screen.getByRole('button', { name: /theme toggle/i })).toHaveAttribute('data-focused', 'false');
  });
});
