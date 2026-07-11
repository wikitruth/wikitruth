import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils/render';
import Header from './Header';

const mockGetHomeData = jest.fn();
const mockMe = jest.fn();

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getHomeData: (...args: unknown[]) => mockGetHomeData(...args),
  },
}));

jest.mock('../../services/api/auth', () => ({
  __esModule: true,
  default: {
    me: (...args: unknown[]) => mockMe(...args),
  },
}));

jest.mock('../../services/api/notifications', () => ({
  __esModule: true,
  default: {
    summary: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    activeRole: 'reader',
    setActiveRole: jest.fn(),
    availableRoles: ['reader'],
  }),
}));

describe('Header parity navigation', () => {
  beforeEach(() => {
    mockMe.mockResolvedValue({ user: null });
    mockGetHomeData.mockResolvedValue({});
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
    mockGetHomeData.mockResolvedValue({
      application: {
        id: 'fixtheph',
        title: 'Fix The Philippines',
        sections: [
          {
            title: 'Incidents',
            description: 'Incidents in the Philippines',
            iconClass: 'fa fa-bolt',
            url: '/topic/incidents-in-the-philippines',
          },
        ],
      },
    });

    render(<Header />);

    await waitFor(() => expect(mockGetHomeData).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /more navigation options/i }));

    expect(await screen.findByRole('link', { name: /incidents/i })).toHaveAttribute(
      'href',
      '/topics/entry/incidents-in-the-philippines'
    );
    expect(screen.queryByRole('link', { name: /debates/i })).not.toBeInTheDocument();
  });
});
