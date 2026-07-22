const countDocuments = jest.fn();

jest.mock('../../server/src/app', () => ({
  db: { models: { PasskeyCredential: { countDocuments } } },
}));

import type { WikitruthRequest, WikitruthResponse } from '../../server/src/types/http';
import { setAuthenticationAssurance } from '../../server/src/services/authAssuranceService';
import { requirePrivilegedPasskeyAssurance } from '../../server/src/services/privilegedAuthService';

function requestFixture(): WikitruthRequest {
  return {
    app: {
      config: {
        webAuthn: {
          enabled: true,
          rpId: 'wikitruth.net',
          origins: ['https://wikitruth.net'],
          canonicalOrigin: 'https://wikitruth.net',
          stepUpMaxAgeSeconds: 600,
          adminStepUpRequired: true,
        },
      },
    },
    session: {},
    user: { _id: 'admin-1', roles: { admin: 'yes' } },
  } as unknown as WikitruthRequest;
}

function responseFixture(): WikitruthResponse {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as WikitruthResponse;
}

describe('privileged passkey assurance', () => {
  beforeEach(() => countDocuments.mockReset());

  it('requires a recent passkey before a privileged mutation', async () => {
    const req = requestFixture();
    const res = responseFixture();

    await expect(requirePrivilegedPasskeyAssurance(req, res)).resolves.toBe(false);
    expect(res.status).toHaveBeenCalledWith(428);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PASSKEY_STEP_UP_REQUIRED' })
    );
  });

  it('requires administrators to keep two active credentials', async () => {
    const req = requestFixture();
    const res = responseFixture();
    setAuthenticationAssurance(req, 'passkey', {
      passkeyVerifiedAt: new Date().toISOString(),
    });
    countDocuments.mockResolvedValue(1);

    await expect(requirePrivilegedPasskeyAssurance(req, res)).resolves.toBe(false);
    expect(res.status).toHaveBeenCalledWith(428);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PASSKEY_ENROLLMENT_REQUIRED' })
    );
  });

  it('allows an administrator with recent assurance and two credentials', async () => {
    const req = requestFixture();
    const res = responseFixture();
    setAuthenticationAssurance(req, 'passkey', {
      passkeyVerifiedAt: new Date().toISOString(),
    });
    countDocuments.mockResolvedValue(2);

    await expect(requirePrivilegedPasskeyAssurance(req, res)).resolves.toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not let an API client impersonate human passkey presence', async () => {
    const req = requestFixture();
    req.apiClient = { id: 'agent-1' } as never;
    const res = responseFixture();

    await expect(requirePrivilegedPasskeyAssurance(req, res)).resolves.toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HUMAN_PASSKEY_REQUIRED' })
    );
  });
});
