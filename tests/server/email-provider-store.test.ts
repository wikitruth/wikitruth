import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  activateEmailProvider,
  decryptEmailSecrets,
  getEmailOperationsSettings,
  listEmailProviders,
  readEmailProviderSecrets,
  saveEmailOperationsSettings,
  saveEmailProvider,
  updateEmailProviderVerification,
  type EmailProviderStoreOptions,
} from '../../server/src/services/emailProviderStore';

describe('email provider store', () => {
  let root: string;
  let options: EmailProviderStoreOptions;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'wikitruth-email-provider-'));
    options = {
      storePath: path.join(root, 'secrets', 'providers.json'),
      keyPath: path.join(root, 'secrets', 'providers.key'),
      masterKey: 'unit-test-master-key',
    };
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('encrypts secrets, masks them, and writes private files', () => {
    const provider = saveEmailProvider({
      name: 'Primary Resend',
      type: 'resend',
      fromName: 'Wikitruth',
      fromAddress: 'hello@wikitruth.example',
      secrets: { apiKey: 're_secret_value', webhookSecret: 'whsec_value' },
    }, options);

    const raw = fs.readFileSync(options.storePath as string, 'utf8');
    expect(raw).not.toContain('re_secret_value');
    expect(raw).not.toContain('whsec_value');
    expect(provider.secretConfigured).toBe(true);
    expect(provider.webhookSecretConfigured).toBe(true);
    expect(fs.statSync(options.storePath as string).mode & 0o777).toBe(0o600);
    expect(fs.statSync(path.dirname(options.storePath as string)).mode & 0o777).toBe(0o700);
    expect(readEmailProviderSecrets({
      ...provider,
      encryptedSecrets: JSON.parse(raw).providers[0].encryptedSecrets,
    }, options)).toEqual({ apiKey: 're_secret_value', webhookSecret: 'whsec_value' });
  });

  it('preserves verification when non-secret settings change and requires verification before activation', () => {
    const created = saveEmailProvider({
      name: 'SMTP', type: 'smtp', fromName: 'Wikitruth', fromAddress: 'mail@wikitruth.example',
      host: 'smtp.example', port: 587, security: 'starttls',
      secrets: { username: 'sender@example.test', password: 'secret' },
    }, options);
    expect(() => activateEmailProvider(created.id, options)).toThrow('Verify');
    updateEmailProviderVerification(created.id, { verified: true, recipient: 'admin@example.test' }, options);
    const updated = saveEmailProvider({
      id: created.id, name: 'Renamed SMTP', type: 'smtp', fromName: 'Wikitruth',
      fromAddress: 'mail@wikitruth.example', host: 'smtp.example', port: 587, security: 'starttls',
    }, options);
    expect(updated.verifiedAt).toBeTruthy();
    expect(activateEmailProvider(created.id, options).active).toBe(true);
  });

  it('stores operational settings without exposing provider secrets', () => {
    expect(getEmailOperationsSettings(options)).toEqual({ contactRecipient: '' });
    expect(saveEmailOperationsSettings({ contactRecipient: 'Contact@Example.Test' }, options))
      .toEqual({ contactRecipient: 'contact@example.test' });
    expect(listEmailProviders(options)).toEqual([]);
    expect(() => decryptEmailSecrets('invalid', options)).toThrow('invalid');
  });
});
