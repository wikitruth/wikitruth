import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import type { User } from '../../types';
import createApiClient from './client';

const request = createApiClient();

export interface PasskeyRuntimeConfig {
  enabled: boolean;
  rpName: string;
  canonicalOrigin: string;
  isCanonicalOrigin: boolean;
  passwordlessEnabled: boolean;
  adminStepUpRequired: boolean;
  stepUpMaxAgeSeconds: number;
}

export interface PasskeyCredentialSummary {
  id: string;
  credentialId: string;
  name: string;
  transports: string[];
  deviceType: 'singleDevice' | 'multiDevice' | string;
  backedUp: boolean;
  status: string;
  createDate: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface RecoveryCodeStatus {
  configured: boolean;
  unusedCount: number;
  createdAt: string | null;
}

export interface AuthenticationAssurance {
  method: string;
  authenticatedAt: string;
  passkeyVerifiedAt?: string;
  passkeyCredentialId?: string;
  recoveredAt?: string;
}

export interface PasskeyState {
  credentials: PasskeyCredentialSummary[];
  recovery: RecoveryCodeStatus;
  passwordLoginDisabled: boolean;
  assurance?: AuthenticationAssurance | null;
}

interface CeremonyResponse<T> {
  ceremonyId: string;
  options: T;
}

interface AuthenticatedResponse {
  success: boolean;
  user: User;
  activeRole?: string;
  credential?: PasskeyCredentialSummary;
  assurance?: AuthenticationAssurance;
}

function ensureSupported(): void {
  if (!browserSupportsWebAuthn()) {
    throw new Error('This browser or device does not support passkeys.');
  }
}

async function getAuthenticationResponse(
  purpose: 'authentication' | 'step_up',
  useBrowserAutofill = false
): Promise<AuthenticatedResponse> {
  ensureSupported();
  const ceremony = await request<CeremonyResponse<PublicKeyCredentialRequestOptionsJSON>>(
    '/auth/passkeys/authentication/options',
    { method: 'POST', body: JSON.stringify({ purpose }) }
  );
  const response = await startAuthentication({
    optionsJSON: ceremony.options,
    useBrowserAutofill,
    verifyBrowserAutofillInput: useBrowserAutofill,
  });
  return request<AuthenticatedResponse>('/auth/passkeys/authentication/verify', {
    method: 'POST',
    body: JSON.stringify({ ceremonyId: ceremony.ceremonyId, purpose, response }),
  });
}

export const passkeyApi = {
  supported: browserSupportsWebAuthn,

  config: async () => {
    const result = await request<{ success: boolean; passkeys: PasskeyRuntimeConfig }>(
      '/auth/passkeys/config'
    );
    return result.passkeys;
  },

  state: async (): Promise<PasskeyState> => {
    const result = await request<{ success: boolean } & PasskeyState>('/auth/passkeys');
    return result;
  },

  register: async (name: string): Promise<PasskeyCredentialSummary> => {
    ensureSupported();
    const ceremony = await request<CeremonyResponse<PublicKeyCredentialCreationOptionsJSON>>(
      '/auth/passkeys/registration/options',
      { method: 'POST', body: '{}' }
    );
    const response = await startRegistration({ optionsJSON: ceremony.options });
    const result = await request<{ success: boolean; credential: PasskeyCredentialSummary }>(
      '/auth/passkeys/registration/verify',
      {
        method: 'POST',
        body: JSON.stringify({ ceremonyId: ceremony.ceremonyId, response, name }),
      }
    );
    return result.credential;
  },

  passwordlessSignup: async (input: {
    username: string;
    email: string;
    name?: string;
    recaptchaResponse?: string;
  }): Promise<AuthenticatedResponse> => {
    ensureSupported();
    const ceremony = await request<CeremonyResponse<PublicKeyCredentialCreationOptionsJSON>>(
      '/auth/passkeys/signup/options',
      {
        method: 'POST',
        body: JSON.stringify({
          username: input.username,
          email: input.email,
          recaptchaResponse: input.recaptchaResponse,
        }),
      }
    );
    const response = await startRegistration({ optionsJSON: ceremony.options });
    return request<AuthenticatedResponse>('/auth/passkeys/signup/verify', {
      method: 'POST',
      body: JSON.stringify({
        ceremonyId: ceremony.ceremonyId,
        response,
        name: input.name || 'Primary passkey',
      }),
    });
  },

  authenticate: getAuthenticationResponse,

  rename: async (id: string, name: string): Promise<PasskeyCredentialSummary> => {
    const result = await request<{ success: boolean; credential: PasskeyCredentialSummary }>(
      `/auth/passkeys/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify({ name }) }
    );
    return result.credential;
  },

  revoke: (id: string) =>
    request<{ success: boolean; credential: PasskeyCredentialSummary }>(
      `/auth/passkeys/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),

  generateRecoveryCodes: () =>
    request<{ success: boolean; codes: string[]; returnedOnce: boolean }>(
      '/auth/recovery-codes',
      { method: 'POST', body: '{}' }
    ),

  recoveryLogin: (username: string, code: string) =>
    request<AuthenticatedResponse & { recoveryRequired: boolean }>(
      '/auth/recovery-codes/login',
      { method: 'POST', body: JSON.stringify({ username, code }) }
    ),

  setPasswordLogin: (enabled: boolean) =>
    request<{ success: boolean; passwordLoginDisabled: boolean }>('/auth/password-login', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  createHandoff: async (targetOrigin: string, returnPath: string) => {
    const result = await request<{
      success: boolean;
      handoff: { callbackUrl: string; expiresIn: number };
    }>('/auth/handoffs', {
      method: 'POST',
      body: JSON.stringify({ targetOrigin, returnPath }),
    });
    return result.handoff;
  },

  exchangeHandoff: (code: string) =>
    request<AuthenticatedResponse & { returnPath: string }>('/auth/handoffs/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};

export default passkeyApi;
