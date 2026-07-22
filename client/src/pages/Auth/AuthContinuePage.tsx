import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import PageMeta from '../../components/common/PageMeta';
import { useAuth } from '../../context/AuthContext';
import passkeyApi from '../../services/api/passkeys';

function safeReturnPath(value: string | null): string {
  const candidate = String(value || '').trim();
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
}

const AuthContinuePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || started.current) return;
    started.current = true;

    const continueAuthentication = async () => {
      const config = await passkeyApi.config();
      const requestedTarget = String(searchParams.get('targetOrigin') || '').trim();
      const returnPath = safeReturnPath(searchParams.get('returnUrl'));

      if (!config.isCanonicalOrigin) {
        const canonicalUrl = new URL('/auth/continue', config.canonicalOrigin);
        canonicalUrl.searchParams.set('targetOrigin', requestedTarget || window.location.origin);
        canonicalUrl.searchParams.set('returnUrl', returnPath);
        window.location.replace(canonicalUrl.toString());
        return;
      }

      if (!isAuthenticated) {
        const localReturn = `${location.pathname}${location.search}`;
        navigate(`/login?returnUrl=${encodeURIComponent(localReturn)}`, { replace: true });
        return;
      }

      const handoff = await passkeyApi.createHandoff(requestedTarget, returnPath);
      window.location.assign(handoff.callbackUrl);
    };

    void continueAuthentication().catch(authError => {
      setError(authError instanceof Error ? authError.message : 'Could not continue authentication.');
    });
  }, [isAuthenticated, isLoading, location.pathname, location.search, navigate, searchParams]);

  return (
    <div className="container" style={{ maxWidth: '620px', marginTop: '60px' }}>
      <PageMeta title="Continue secure sign-in" />
      <div className="panel panel-default">
        <div className="panel-body text-center">
          <i className="fa fa-key fa-3x text-primary" aria-hidden="true" />
          <h2>Continuing secure sign-in</h2>
          {error ? <Alert type="danger">{error}</Alert> : (
            <p className="text-muted">Creating a short-lived, one-time sign-in for the trusted tenant...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthContinuePage;
