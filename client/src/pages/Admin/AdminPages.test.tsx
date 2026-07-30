import React from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import AccountsList from './Accounts/AccountsList';
import AccountDetails from './Accounts/AccountDetails';
import AdminsList from './Administrators/AdminsList';
import AdminDetails from './Administrators/AdminDetails';
import UsersList from './Users/UsersList';
import UserDetails from './Users/UserDetails';
import { render, screen } from '../../test-utils/render';
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
const mockedCreateRealtimeChannel = createRealtimeChannel as jest.MockedFunction<typeof createRealtimeChannel>;

beforeEach(() => {
  mockedCreateRealtimeChannel.mockClear();
  mockedAdminApi.dashboard.mockResolvedValue({
    counts: { users: 2, accounts: 1, categories: 3, statuses: 1, administrators: 1, groups: 4 },
  } as Record<string, unknown>);
  mockedAdminApi.users.mockResolvedValue([]);
  mockedAdminApi.accounts.mockResolvedValue([]);
  mockedAdminApi.administrators.mockResolvedValue([]);
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
    mockedAdminApi.accounts.mockResolvedValue([
      { _id: 'account-1', name: { full: 'Ada Lovelace' } },
    ]);
    mockedAdminApi.administrators.mockResolvedValue([
      { _id: 'admin-1', name: { first: 'Grace', last: 'Hopper' } },
    ]);

    const accountView = render(<AccountsList />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    accountView.unmount();

    render(<AdminsList />);
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('renders user details action panel', async () => {
    render(
      <Routes>
        <Route path="/admin/users/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/admin/users/user-1' },
    );
    expect(await screen.findByRole('heading', { level: 1, name: /user details/i })).toBeInTheDocument();
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
      { route: '/admin/users/user-1' },
    );

    expect(await screen.findByText('example-user')).toBeInTheDocument();
    expect(screen.queryByText('stored-password-hash')).not.toBeInTheDocument();
    expect(screen.queryByText(/stored-client-secret/)).not.toBeInTheDocument();
    expect(screen.getByText(/\[redacted\]/)).toBeInTheDocument();
    expect(screen.getByText(/verified/)).toBeInTheDocument();
  });

  it('renders account details action panel', async () => {
    render(<AccountDetails />);
    expect(await screen.findByRole('heading', { name: /account details/i })).toBeInTheDocument();
    expect(screen.getByText(/account link, notes, and status/i)).toBeInTheDocument();
  });

  it('renders administrator details action panel', async () => {
    render(<AdminDetails />);
    expect(await screen.findByRole('heading', { name: /administrator details/i })).toBeInTheDocument();
    expect(screen.getByText(/permissions, groups, and linked user/i)).toBeInTheDocument();
  });
});
