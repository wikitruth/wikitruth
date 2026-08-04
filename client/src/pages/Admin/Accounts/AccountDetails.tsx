import React, { useState } from 'react';
import { useParams } from 'react-router';
import adminApi from '../../../services/api/admin';
import AdminDetailsPage from '../common/AdminDetailsPage';

const AccountDetails: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [userId, setUserId] = useState('');
  const [note, setNote] = useState('');
  const [statusId, setStatusId] = useState('');
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
      <AdminDetailsPage title="Account Details" backPath="/admin/accounts" loadItem={adminApi.account} />
      <div className="container">
        <div className="panel panel-default">
          <div className="panel-heading">
            <strong>Account Link, Notes, and Status</strong>
          </div>
          <div className="panel-body">
            {error ? <div className="alert alert-danger">{error}</div> : null}
            {message ? <div className="alert alert-success">{message}</div> : null}

            <div className="form-group">
              <label htmlFor="account-link-user">Link User</label>
              <div className="input-group">
                <input
                  id="account-link-user"
                  className="form-control"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="User id"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={busy || !id || !userId.trim()}
                    onClick={() => runAction(() => adminApi.linkAccountUser(id, userId.trim()), 'User linked to account.')}
                  >
                    Link
                  </button>
                  <button
                    className="btn btn-default"
                    type="button"
                    disabled={busy || !id}
                    onClick={() => runAction(() => adminApi.unlinkAccountUser(id), 'User unlinked from account.')}
                  >
                    Unlink
                  </button>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="account-note">Add Note</label>
              <div className="input-group">
                <input
                  id="account-note"
                  className="form-control"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Account note"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-info"
                    type="button"
                    disabled={busy || !id || !note.trim()}
                    onClick={() => runAction(() => adminApi.addAccountNote(id, note.trim()), 'Account note added.')}
                  >
                    Add Note
                  </button>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="account-status">Push Status</label>
              <div className="input-group">
                <input
                  id="account-status"
                  className="form-control"
                  value={statusId}
                  onChange={(event) => setStatusId(event.target.value)}
                  placeholder="Status id (e.g. active)"
                />
                <span className="input-group-btn">
                  <button
                    className="btn btn-warning"
                    type="button"
                    disabled={busy || !id || !statusId.trim()}
                    onClick={() => runAction(() => adminApi.addAccountStatus(id, statusId.trim()), 'Account status updated.')}
                  >
                    Push Status
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

export default AccountDetails;
