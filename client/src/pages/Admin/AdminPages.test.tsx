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
    systemHealth: jest.fn(),
    userSecurity: jest.fn(),
    runUserSecurityAction: jest.fn(),
    users: jest.fn(),
    accounts: jest.fn(),
    administrators: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    updateUserRoles: jest.fn(),
    resetUserPassword: jest.fn(),
    linkUserAdminRole: jest.fn(),
    unlinkUserAdminRole: jest.fn(),
    linkUserAccountRole: jest.fn(),
    unlinkUserAccountRole: jest.fn(),
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
  jest.clearAllMocks();
  mockedCreateRealtimeChannel.mockClear();
  mockedAdminApi.dashboard.mockResolvedValue({
    success: true,
    counts: { users: 2, accounts: 1, categories: 3, statuses: 1, administrators: 1, groups: 4 },
    queues: { quarantined: 0, emailQueued: 0, emailFailed: 0, notificationFailed: 0 },
    authorization: { adminId: 'admin-1', effectivePermissions: ['admin.access'], legacySuperAdmin: true },
    permissionCatalog: ['admin.access'],
  });
  mockedAdminApi.systemHealth.mockResolvedValue({ success: true, health: {
    generatedAt: '2026-08-04T00:00:00.000Z', overall: 'healthy',
    components: { mongo: { status: 'healthy', summary: 'MongoDB responded.' } },
    migrationLedger: { status: 'unknown', summary: 'No migration ledger.' },
    recentErrors: { status: 'unknown', summary: 'No error store.' },
  } });
  const emptyPage = { success: true, items: [], total: 0, page: 1, limit: 25, pages: 1, query: '' };
  mockedAdminApi.users.mockResolvedValue(emptyPage);
  mockedAdminApi.accounts.mockResolvedValue(emptyPage);
  mockedAdminApi.administrators.mockResolvedValue(emptyPage);
  mockedAdminApi.user.mockResolvedValue(null);
  mockedAdminApi.account.mockResolvedValue(null);
  mockedAdminApi.administrator.mockResolvedValue(null);
  mockedAdminApi.userSecurity.mockResolvedValue({ success: true, security: {
    user: { id: 'user-1', username: 'example-user', email: 'user@example.test', state: 'active', isActive: true, passwordLoginDisabled: false, linkedAdminId: '', linkedAccountId: '' },
    activeSessions: 1, lastSeen: '2026-08-04T00:00:00.000Z', activePasskeys: 2,
    activeApiClients: 0, unusedRecoveryCodes: 4, verified: true, locked: false,
  } });
  mockedAdminApi.createUser.mockResolvedValue({} as never);
  mockedAdminApi.updateUser.mockResolvedValue({} as never);
  mockedAdminApi.updateUserRoles.mockResolvedValue({} as never);
  mockedAdminApi.deleteUser.mockResolvedValue({ success: true });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Admin pages', () => {
  it('renders admin dashboard', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByRole('heading', { name: /admin operations/i })).toBeInTheDocument();
    expect(await screen.findByText(/realtime channel/i)).toBeInTheDocument();
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

  it('keeps the list intact when user creation fails', async () => {
    const user = userEvent.setup();
    mockedAdminApi.createUser.mockRejectedValueOnce(new Error('Username already exists'));

    render(<UsersList />);
    await screen.findByText(/no users found/i);
    const listCallsBeforeCreate = mockedAdminApi.users.mock.calls.length;
    await user.type(screen.getByLabelText(/^username$/i), 'duplicate');
    await user.type(screen.getByLabelText(/^email$/i), 'duplicate@example.test');
    await user.type(screen.getByLabelText(/^password$/i), 'safe-password');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('Username already exists')).toBeInTheDocument();
    expect(mockedAdminApi.users).toHaveBeenCalledTimes(listCallsBeforeCreate);
    expect(screen.getByLabelText(/^username$/i)).toHaveValue('duplicate');
  });

  it('reports partial bulk-delete failures and retains the failed selection', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockedAdminApi.users
      .mockResolvedValueOnce({
        success: true,
        items: [
          { _id: 'user-1', username: 'Ada' },
          { _id: 'user-2', username: 'Grace' },
        ],
        total: 2,
        page: 1,
        limit: 25,
        pages: 1,
        query: '',
      })
      .mockResolvedValueOnce({
        success: true,
        items: [{ _id: 'user-2', username: 'Grace' }],
        total: 1,
        page: 1,
        limit: 25,
        pages: 1,
        query: '',
      });
    mockedAdminApi.deleteUser
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('Protected administrator account'));

    render(<UsersList />);
    await user.click(await screen.findByRole('checkbox', { name: /select ada/i }));
    await user.click(screen.getByRole('checkbox', { name: /select grace/i }));
    await user.click(screen.getByRole('button', { name: /delete selected users \(2\)/i }));

    expect(await screen.findByText(/deleted 1 record/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to delete 1 record/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete selected users \(1\)/i })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /select grace/i })).toBeChecked();
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
    expect(await screen.findByText(/account operations/i)).toBeInTheDocument();
    expect(screen.getByText(/security posture/i)).toBeInTheDocument();
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
    expect(screen.getAllByText(/verified/i).length).toBeGreaterThan(0);
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
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Recovered detail')).toBeInTheDocument();
    expect(mockedAdminApi.user.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a direct not-found detail response without scanning the list', async () => {
    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/missing-user' }
    );

    expect(await screen.findByText('Entry not found')).toBeInTheDocument();
    expect(mockedAdminApi.user).toHaveBeenCalledWith('missing-user');
    expect(mockedAdminApi.users).not.toHaveBeenCalled();
  });

  it('shows update failures without replacing the loaded user', async () => {
    const user = userEvent.setup();
    mockedAdminApi.user.mockResolvedValue({
      _id: 'user-1',
      username: 'Ada',
      email: 'ada@example.test',
      roles: { screener: false, reviewer: true },
    });
    mockedAdminApi.updateUser.mockRejectedValueOnce(new Error('Concurrent update detected'));

    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/user-1' }
    );

    await screen.findByDisplayValue('Ada');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Concurrent update detected')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();
    expect(mockedAdminApi.updateUserRoles).not.toHaveBeenCalled();
  });

  it('keeps permanent deletion out of the account recovery flow', async () => {
    mockedAdminApi.user.mockResolvedValue({ _id: 'user-1', username: 'Root user' });

    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/user-1' }
    );

    await screen.findByDisplayValue('Root user');
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/permanent deletion is intentionally absent/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /user details/i })).toBeInTheDocument();
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
