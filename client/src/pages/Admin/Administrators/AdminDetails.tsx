import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const AdminDetails: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [permissions, setPermissions] = useState('');
  const [groups, setGroups] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsePermissions = (raw: string): Array<{ name: string; permit: boolean }> => {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name, permit: true }));
  };

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
        title="Administrator Details"
        backPath="/admin/administrators"
        loadItem={adminApi.administrator}
      />

      <div className="container">
        <div className="panel panel-default">
          <div className="panel-heading">
            <strong>Permissions, Groups, and Linked User</strong>
          </div>
          <div className="panel-body">
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {message ? <div className="alert alert-success">{message}</div> : null}

            <div className="form-group">
              <label htmlFor="admin-permissions">Permissions (comma-separated)</label>
              <div className="input-group">
                <input
                  id="admin-permissions"
                  className="form-control"
                  value={permissions}
                  onChange={(event) => setPermissions(event.target.value)}
                  placeholder="users.read, users.write"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busy || !id}
                    onClick={() =>
                      runAction(
                        () => adminApi.updateAdministratorPermissions(id, parsePermissions(permissions)),
                        'Administrator permissions updated.',
                      )
                    }
                  >
                    Save Permissions
                  </button>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-groups">Groups (comma-separated)</label>
              <div className="input-group">
                <input
                  id="admin-groups"
                  className="form-control"
                  value={groups}
                  onChange={(event) => setGroups(event.target.value)}
                  placeholder="moderators, operators"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-info"
                    type="button"
                    disabled={busy || !id}
                    onClick={() =>
                      runAction(
                        () => adminApi.updateAdministratorGroups(id, groups.split(',').map((item) => item.trim()).filter(Boolean)),
                        'Administrator groups updated.',
                      )
                    }
                  >
                    Save Groups
                  </button>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-link-user">Link User</label>
              <div className="input-group">
                <input
                  id="admin-link-user"
                  className="form-control"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="User id"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-success"
                    type="button"
                    disabled={busy || !id || !userId.trim()}
                    onClick={() => runAction(() => adminApi.linkAdministratorUser(id, userId.trim()), 'User linked to administrator.')}
                  >
                    Link
                  </button>
                  <button
                    className="btn btn-default"
                    type="button"
                    disabled={busy || !id}
                    onClick={() => runAction(() => adminApi.unlinkAdministratorUser(id), 'User unlinked from administrator.')}
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

export default AdminDetails;
