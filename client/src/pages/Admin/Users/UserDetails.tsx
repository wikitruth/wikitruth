import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const UserDetails: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [password, setPassword] = useState('');
  const [adminRoleId, setAdminRoleId] = useState('');
  const [accountRoleId, setAccountRoleId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      await action();
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminDetailsPage
        title="User Details"
        backPath="/admin/users"
        loadItem={adminApi.user}
        updateAction={{
          onUpdate: async (userId, payload) => {
            const updated = await adminApi.updateUser(userId, payload);
            const roles = (payload as { roles?: { screener?: unknown; reviewer?: unknown } }).roles;
            await adminApi.updateUserRoles(userId, {
              screener: Boolean(roles?.screener),
              reviewer: Boolean(roles?.reviewer),
            });
            return updated;
          },
          fields: [
            { path: 'username', label: 'Username', required: true },
            { path: 'email', label: 'Email', type: 'email' },
            { path: 'isActive', label: 'Status' },
            { path: 'roles.admin', label: 'Admin Role ID' },
            { path: 'roles.account', label: 'Account Role ID' },
            { path: 'roles.screener', label: 'Can Screen', type: 'checkbox' },
            { path: 'roles.reviewer', label: 'Can Review', type: 'checkbox' },
          ],
        }}
        deleteAction={{
          confirmMessage: 'Delete this user? This action cannot be undone.',
          onDelete: adminApi.deleteUser,
        }}
      />

      <div className="container">
        <div className="panel panel-default">
          <div className="panel-heading">
            <strong>Role and Password Actions</strong>
          </div>
          <div className="panel-body">
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {message ? <div className="alert alert-success">{message}</div> : null}

            <div className="form-group">
              <label htmlFor="admin-reset-password">Reset Password</label>
              <div className="input-group">
                <input
                  id="admin-reset-password"
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-warning"
                    type="button"
                    disabled={busy || !id || password.length < 6}
                    onClick={() =>
                      runAction(
                        () => adminApi.resetUserPassword(id, password),
                        'Password updated.',
                      )
                    }
                  >
                    Reset Password
                  </button>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-role-link">Link Admin Role</label>
              <div className="input-group">
                <input
                  id="admin-role-link"
                  className="form-control"
                  value={adminRoleId}
                  onChange={(event) => setAdminRoleId(event.target.value)}
                  placeholder="Admin record id"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busy || !id || !adminRoleId.trim()}
                    onClick={() =>
                      runAction(
                        () => adminApi.linkUserAdminRole(id, adminRoleId.trim()),
                        'Admin role linked.',
                      )
                    }
                  >
                    Link
                  </button>
                  <button
                    className="btn btn-default"
                    type="button"
                    disabled={busy || !id}
                    onClick={() => runAction(() => adminApi.unlinkUserAdminRole(id), 'Admin role unlinked.')}
                  >
                    Unlink
                  </button>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="account-role-link">Link Account Role</label>
              <div className="input-group">
                <input
                  id="account-role-link"
                  className="form-control"
                  value={accountRoleId}
                  onChange={(event) => setAccountRoleId(event.target.value)}
                  placeholder="Account record id"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busy || !id || !accountRoleId.trim()}
                    onClick={() =>
                      runAction(
                        () => adminApi.linkUserAccountRole(id, accountRoleId.trim()),
                        'Account role linked.',
                      )
                    }
                  >
                    Link
                  </button>
                  <button
                    className="btn btn-default"
                    type="button"
                    disabled={busy || !id}
                    onClick={() => runAction(() => adminApi.unlinkUserAccountRole(id), 'Account role unlinked.')}
                  >
                    Unlink
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDetails;
