import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import PageMeta from '../../components/common/PageMeta';
import { useAuth } from '../../context/AuthContext';
import passkeyApi from '../../services/api/passkeys';

function safeReturnPath(value: string | null): string {
  const candidate = String(value || '').trim();
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
}

const AuthHandoffPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = String(searchParams.get('code') || '').trim();
    if (!code) {
      setError('The sign-in handoff code is missing. Start again from this tenant.');
      return;
    }
    void passkeyApi.exchangeHandoff(code)
      .then(async result => {
        await refreshAuth?.();
        navigate(safeReturnPath(result.returnPath || searchParams.get('returnUrl')), { replace: true });
      })
      .catch(handoffError => {
        setError(handoffError instanceof Error ? handoffError.message : 'The sign-in handoff failed.');
      });
  }, [navigate, refreshAuth, searchParams]);

  return (
    <div className="container" style={{ maxWidth: '620px', marginTop: '60px' }}>
      <PageMeta title="Completing secure sign-in" />
      <div className="panel panel-default">
        <div className="panel-body text-center">
          <i className="fa fa-shield fa-3x text-primary" aria-hidden="true" />
          <h2>Completing secure sign-in</h2>
          {error ? <Alert type="danger">{error}</Alert> : (
            <p className="text-muted">Verifying this one-time handoff...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthHandoffPage;
