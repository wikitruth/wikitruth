import React from 'react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import AccountsList from './Accounts/AccountsList';
import AccountDetails from './Accounts/AccountDetails';
import AdminsList from './Administrators/AdminsList';
import AdminDetails from './Administrators/AdminDetails';
import UsersList from './Users/UsersList';
import UserDetails from './Users/UserDetails';
import { render, screen, waitFor } from '../../test-utils/render';
import adminApi from '../../services/api/admin';
import { createRealtimeChannel } from '../../services/realtime';

jest.mock('../../services/api/admin', () => ({
  __esModule: true,
  default: {
    dashboard: jest.fn(),
    users: jest.fn(),
    accounts: jest.fn(),
    administrators: jest.fn(),
    deleteUser: jest.fn(),
    deleteAccount: jest.fn(),
    deleteAdministrator: jest.fn(),
    deleteAdminGroup: jest.fn(),
    deleteCategory: jest.fn(),
    deleteStatus: jest.fn(),
    user: jest.fn(),
    account: jest.fn(),
    administrator: jest.fn(),
  },
}));

jest.mock('../../services/realtime', () => ({
  createRealtimeChannel: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: () => true,
  })),
}));

const mockedAdminApi = adminApi as jest.Mocked<typeof adminApi>;
const mockedCreateRealtimeChannel = createRealtimeChannel as jest.MockedFunction<
  typeof createRealtimeChannel
>;

beforeEach(() => {
  mockedCreateRealtimeChannel.mockClear();
  mockedAdminApi.dashboard.mockResolvedValue({
    counts: { users: 2, accounts: 1, categories: 3, statuses: 1, administrators: 1, groups: 4 },
  } as Record<string, unknown>);
  const emptyPage = { success: true, items: [], total: 0, page: 1, limit: 25, pages: 1, query: '' };
  mockedAdminApi.users.mockResolvedValue(emptyPage);
  mockedAdminApi.accounts.mockResolvedValue(emptyPage);
  mockedAdminApi.administrators.mockResolvedValue(emptyPage);
  mockedAdminApi.user.mockResolvedValue(null);
  mockedAdminApi.account.mockResolvedValue(null);
  mockedAdminApi.administrator.mockResolvedValue(null);
});

describe('Admin pages', () => {
  it('renders admin dashboard', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/realtime status/i)).toBeInTheDocument();
    expect(await screen.findByText(/administrators/i)).toBeInTheDocument();
    expect(await screen.findByText(/groups/i)).toBeInTheDocument();
    expect(mockedCreateRealtimeChannel).toHaveBeenCalledTimes(1);
  });

  it('renders users list page', async () => {
    render(<UsersList />);
    expect(await screen.findByRole('heading', { level: 1, name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('formats structured names in account and administrator lists', async () => {
    mockedAdminApi.accounts.mockResolvedValue({
      success: true,
      items: [{ _id: 'account-1', name: { full: 'Ada Lovelace' } }],
      total: 1,
      page: 1,
      limit: 25,
      pages: 1,
      query: '',
    });
    mockedAdminApi.administrators.mockResolvedValue({
      success: true,
      items: [{ _id: 'admin-1', name: { first: 'Grace', last: 'Hopper' } }],
      total: 1,
      page: 1,
      limit: 25,
      pages: 1,
      query: '',
    });

    const accountView = render(<AccountsList />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    accountView.unmount();

    render(<AdminsList />);
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('searches and pages users on the server', async () => {
    const user = userEvent.setup();
    mockedAdminApi.users
      .mockResolvedValueOnce({
        success: true,
        items: [{ _id: 'user-1', username: 'Ada' }],
        total: 30,
        page: 1,
        limit: 25,
        pages: 2,
        query: '',
      })
      .mockResolvedValueOnce({
        success: true,
        items: [{ _id: 'user-30', username: 'Grace' }],
        total: 30,
        page: 2,
        limit: 25,
        pages: 2,
        query: '',
      })
      .mockResolvedValueOnce({
        success: true,
        items: [{ _id: 'user-30', username: 'Grace' }],
        total: 1,
        page: 1,
        limit: 25,
        pages: 1,
        query: 'Grace',
      });

    render(<UsersList />);
    await screen.findByText('Ada');
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await screen.findByText('Grace');
    expect(mockedAdminApi.users).toHaveBeenLastCalledWith({ page: 2, limit: 25, query: '' });

    await user.type(screen.getByLabelText(/^search$/i), 'Grace');
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    await waitFor(() =>
      expect(mockedAdminApi.users).toHaveBeenLastCalledWith({ page: 1, limit: 25, query: 'Grace' })
    );
    expect(screen.getByText(/results for “Grace”/i)).toBeInTheDocument();
  });

  it('recovers when an administrator list request fails', async () => {
    const user = userEvent.setup();
    mockedAdminApi.users
      .mockRejectedValueOnce(new Error('Admin storage is unavailable'))
      .mockResolvedValueOnce({
        success: true,
        items: [{ _id: 'user-1', username: 'Recovered user' }],
        total: 1,
        page: 1,
        limit: 25,
        pages: 1,
        query: '',
      });

    render(<UsersList />);
    expect(await screen.findByText('Admin storage is unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Recovered user')).toBeInTheDocument();
  });

  it('renders user details action panel', async () => {
    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/user-1' }
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /user details/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/role and password actions/i)).toBeInTheDocument();
  });

  it('does not expose stored credentials in user details', async () => {
    mockedAdminApi.user.mockResolvedValue({
      _id: 'user-1',
      username: 'example-user',
      password: 'stored-password-hash',
      security: {
        clientSecret: 'stored-client-secret',
        assurance: 'verified',
      },
    });

    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/user-1' }
    );

    expect(await screen.findByText('example-user')).toBeInTheDocument();
    expect(screen.queryByText('stored-password-hash')).not.toBeInTheDocument();
    expect(screen.queryByText(/stored-client-secret/)).not.toBeInTheDocument();
    expect(screen.getByText(/\[redacted\]/)).toBeInTheDocument();
    expect(screen.getByText(/verified/)).toBeInTheDocument();
  });

  it('retries a failed direct detail request', async () => {
    const user = userEvent.setup();
    mockedAdminApi.user
      .mockRejectedValueOnce(new Error('Temporary admin failure'))
      .mockResolvedValueOnce({ _id: 'user-1', username: 'Recovered detail' });

    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/user-1' }
    );

    expect(await screen.findByText('Temporary admin failure')).toBeInTheDocument();
    const callsBeforeRetry = mockedAdminApi.user.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Recovered detail')).toBeInTheDocument();
    expect(mockedAdminApi.user.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
  });

  it('renders account details action panel', async () => {
    render(<AccountDetails />);
    expect(await screen.findByRole('heading', { name: /account details/i })).toBeInTheDocument();
    expect(screen.getByText(/account link, notes, and status/i)).toBeInTheDocument();
  });

  it('renders administrator details action panel', async () => {
    render(<AdminDetails />);
    expect(
      await screen.findByRole('heading', { name: /administrator details/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/permissions, groups, and linked user/i)).toBeInTheDocument();
  });
});
