import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Modal from '../components/common/Modal';
import {
  buildSignInPath,
  getAuthFlowContent,
  safeReturnUrl,
  type AuthIntent,
} from '../utils/authFlow';

interface AuthPromptRequest {
  intent: AuthIntent;
  returnUrl?: string;
}

interface ResolvedAuthPromptRequest {
  intent: AuthIntent;
  returnUrl: string;
}

interface AuthPromptContextValue {
  requestSignIn: (request: AuthPromptRequest) => void;
}

const AuthPromptContext = createContext<AuthPromptContextValue | undefined>(undefined);

export const AuthPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ResolvedAuthPromptRequest | null>(null);

  const requestSignIn = useCallback((nextRequest: AuthPromptRequest) => {
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    setRequest({
      intent: nextRequest.intent,
      returnUrl: safeReturnUrl(nextRequest.returnUrl || currentUrl),
    });
  }, [location.hash, location.pathname, location.search]);

  const closePrompt = useCallback(() => setRequest(null), []);
  const content = useMemo(
    () => request ? getAuthFlowContent(request.intent, request.returnUrl) : null,
    [request],
  );

  const continueToSignIn = useCallback(() => {
    if (!request) return;
    const signInPath = buildSignInPath(request.returnUrl, request.intent);
    setRequest(null);
    navigate(signInPath);
  }, [navigate, request]);

  const value = useMemo<AuthPromptContextValue>(() => ({ requestSignIn }), [requestSignIn]);

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <Modal
        isOpen={Boolean(request)}
        onClose={closePrompt}
        title={content?.title}
        size="sm"
        className="wt-auth-prompt-modal"
        footer={(
          <>
            <button type="button" className="btn btn-default" onClick={closePrompt}>
              Not now
            </button>
            <button type="button" className="btn btn-primary" onClick={continueToSignIn} data-autofocus>
              <i className="fa fa-sign-in" aria-hidden="true"></i> Sign In
            </button>
          </>
        )}
      >
        {content ? (
          <div className="wt-auth-prompt-copy">
            <p>{content.message}</p>
            <p className="text-muted">{content.continuation}</p>
          </div>
        ) : null}
      </Modal>
    </AuthPromptContext.Provider>
  );
};

export function useAuthPrompt(): AuthPromptContextValue {
  const context = useContext(AuthPromptContext);
  if (!context) {
    throw new Error('useAuthPrompt must be used within an AuthPromptProvider');
  }
  return context;
}
