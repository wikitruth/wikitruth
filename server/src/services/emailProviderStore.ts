import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export type EmailProviderType = 'resend' | 'smtp';
export type EmailProviderSecurity = 'ssl' | 'starttls';

export interface EmailProviderSecrets {
  apiKey?: string;
  username?: string;
  password?: string;
  webhookSecret?: string;
}

export interface StoredEmailProvider {
  id: string;
  name: string;
  type: EmailProviderType;
  enabled: boolean;
  fromName: string;
  fromAddress: string;
  host?: string;
  port?: number;
  security?: EmailProviderSecurity;
  encryptedSecrets: string;
  verifiedAt?: string | null;
  lastVerifiedRecipientMasked?: string;
  lastError?: string;
  createDate: string;
  editDate: string;
}

interface EmailProviderStoreDocument {
  version: 1;
  activeProviderId: string;
  settings: EmailOperationsSettings;
  providers: StoredEmailProvider[];
}

export interface EmailOperationsSettings {
  contactRecipient: string;
}

export interface PublicEmailProvider {
  id: string;
  name: string;
  type: EmailProviderType;
  enabled: boolean;
  active: boolean;
  fromName: string;
  fromAddress: string;
  host?: string;
  port?: number;
  security?: EmailProviderSecurity;
  usernameMasked?: string;
  secretConfigured: boolean;
  webhookSecretConfigured: boolean;
  verifiedAt?: string | null;
  lastVerifiedRecipientMasked?: string;
  lastError?: string;
  createDate: string;
  editDate: string;
}

export interface SaveEmailProviderInput {
  id?: string;
  name: string;
  type: EmailProviderType;
  enabled?: boolean;
  fromName: string;
  fromAddress: string;
  host?: string;
  port?: number;
  security?: EmailProviderSecurity;
  secrets?: EmailProviderSecrets;
}

export interface EmailProviderStoreOptions {
  storePath?: string;
  keyPath?: string;
  masterKey?: string;
}

const EMPTY_STORE: EmailProviderStoreDocument = {
  version: 1,
  activeProviderId: '',
  settings: { contactRecipient: '' },
  providers: [],
};

function defaultStorePath(): string {
  return path.resolve(process.env.EMAIL_PROVIDER_STORE_PATH || path.join(process.cwd(), '.runtime', 'secrets', 'email-providers.json'));
}

function defaultKeyPath(storePath: string): string {
  return path.resolve(process.env.EMAIL_PROVIDER_KEY_PATH || path.join(path.dirname(storePath), 'email-provider.key'));
}

function ensurePrivateDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function fileMasterKey(options: EmailProviderStoreOptions): string {
  if (options.masterKey) return options.masterKey;
  const configured = String(process.env.WIKITRUTH_CRYPTO_KEY || process.env.CRYPTO_KEY || '').trim();
  if (configured) return configured;
  const storePath = options.storePath || defaultStorePath();
  const keyPath = options.keyPath || defaultKeyPath(storePath);
  ensurePrivateDirectory(path.dirname(keyPath));
  if (fs.existsSync(keyPath)) {
    fs.chmodSync(keyPath, 0o600);
    return fs.readFileSync(keyPath, 'utf8').trim();
  }
  const generated = randomBytes(32).toString('base64url');
  fs.writeFileSync(keyPath, generated, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.chmodSync(keyPath, 0o600);
  return generated;
}

function encryptionKey(options: EmailProviderStoreOptions): Buffer {
  return createHash('sha256')
    .update(`wikitruth:email-provider-store:v1:${fileMasterKey(options)}`, 'utf8')
    .digest();
}

export function encryptEmailPayload<T>(value: T, options: EmailProviderStoreOptions = {}): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(options), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptEmailPayload<T>(value: string, options: EmailProviderStoreOptions = {}): T {
  const [version, ivValue, tagValue, encryptedValue] = String(value || '').split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('Email provider credential payload is invalid');
  }
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(options), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(decrypted) as T;
}

export function encryptEmailSecrets(value: EmailProviderSecrets, options: EmailProviderStoreOptions = {}): string {
  return encryptEmailPayload(value, options);
}

export function decryptEmailSecrets(value: string, options: EmailProviderStoreOptions = {}): EmailProviderSecrets {
  return decryptEmailPayload<EmailProviderSecrets>(value, options);
}

function readStore(options: EmailProviderStoreOptions = {}): EmailProviderStoreDocument {
  const storePath = options.storePath || defaultStorePath();
  if (!fs.existsSync(storePath)) return { ...EMPTY_STORE, settings: { ...EMPTY_STORE.settings }, providers: [] };
  fs.chmodSync(storePath, 0o600);
  const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8')) as Partial<EmailProviderStoreDocument>;
  if (parsed.version !== 1 || !Array.isArray(parsed.providers)) {
    throw new Error('Email provider store format is unsupported');
  }
  return {
    version: 1,
    activeProviderId: String(parsed.activeProviderId || ''),
    settings: { contactRecipient: String(parsed.settings?.contactRecipient || '') },
    providers: parsed.providers,
  };
}

function writeStore(document: EmailProviderStoreDocument, options: EmailProviderStoreOptions = {}): void {
  const storePath = options.storePath || defaultStorePath();
  const directory = path.dirname(storePath);
  ensurePrivateDirectory(directory);
  const temporaryPath = path.join(directory, `.${path.basename(storePath)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
  fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  fs.chmodSync(temporaryPath, 0o600);
  fs.renameSync(temporaryPath, storePath);
  fs.chmodSync(storePath, 0o600);
}

function maskEmail(value: string): string {
  const [local = '', domain = ''] = String(value || '').split('@');
  if (!domain) return value ? `${value.slice(0, 1)}***` : '';
  return `${local.slice(0, 1)}***@${domain}`;
}

function publicProvider(provider: StoredEmailProvider, activeProviderId: string, options: EmailProviderStoreOptions): PublicEmailProvider {
  const secrets = decryptEmailSecrets(provider.encryptedSecrets, options);
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    enabled: provider.enabled,
    active: provider.id === activeProviderId,
    fromName: provider.fromName,
    fromAddress: provider.fromAddress,
    host: provider.host,
    port: provider.port,
    security: provider.security,
    usernameMasked: secrets.username ? maskEmail(secrets.username) : undefined,
    secretConfigured: Boolean(provider.type === 'resend' ? secrets.apiKey : secrets.password),
    webhookSecretConfigured: Boolean(secrets.webhookSecret),
    verifiedAt: provider.verifiedAt || null,
    lastVerifiedRecipientMasked: provider.lastVerifiedRecipientMasked,
    lastError: provider.lastError,
    createDate: provider.createDate,
    editDate: provider.editDate,
  };
}

export function listEmailProviders(options: EmailProviderStoreOptions = {}): PublicEmailProvider[] {
  const store = readStore(options);
  return store.providers.map((provider) => publicProvider(provider, store.activeProviderId, options));
}

export function getEmailOperationsSettings(options: EmailProviderStoreOptions = {}): EmailOperationsSettings {
  return readStore(options).settings;
}

export function saveEmailOperationsSettings(
  input: EmailOperationsSettings,
  options: EmailProviderStoreOptions = {},
): EmailOperationsSettings {
  const contactRecipient = String(input.contactRecipient || '').trim().toLowerCase();
  if (contactRecipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactRecipient)) {
    throw new Error('Contact recipient must be a valid email address');
  }
  const store = readStore(options);
  store.settings = { contactRecipient };
  writeStore(store, options);
  return store.settings;
}

export function getStoredEmailProvider(id: string, options: EmailProviderStoreOptions = {}): StoredEmailProvider | null {
  return readStore(options).providers.find((provider) => provider.id === id) || null;
}

export function listStoredEmailProviders(options: EmailProviderStoreOptions = {}): StoredEmailProvider[] {
  return readStore(options).providers;
}

export function getActiveStoredEmailProvider(options: EmailProviderStoreOptions = {}): StoredEmailProvider | null {
  const store = readStore(options);
  if (!store.activeProviderId) return null;
  const provider = store.providers.find((item) => item.id === store.activeProviderId);
  return provider?.enabled ? provider : null;
}

function validateProvider(input: SaveEmailProviderInput, mergedSecrets: EmailProviderSecrets): void {
  if (!input.name.trim()) throw new Error('Provider name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.fromAddress.trim())) throw new Error('A valid sender address is required');
  if (input.type === 'resend' && !String(mergedSecrets.apiKey || '').trim()) throw new Error('Resend API key is required');
  if (input.type === 'smtp') {
    if (!String(input.host || '').trim()) throw new Error('SMTP host is required');
    if (!String(mergedSecrets.username || '').trim() || !String(mergedSecrets.password || '').trim()) {
      throw new Error('SMTP username and password are required');
    }
    const port = Number(input.port || 0);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP port is invalid');
  }
}

export function saveEmailProvider(input: SaveEmailProviderInput, options: EmailProviderStoreOptions = {}): PublicEmailProvider {
  const store = readStore(options);
  const existingIndex = input.id ? store.providers.findIndex((provider) => provider.id === input.id) : -1;
  const existing = existingIndex >= 0 ? store.providers[existingIndex] : null;
  const existingSecrets = existing ? decryptEmailSecrets(existing.encryptedSecrets, options) : {};
  const mergedSecrets = { ...existingSecrets, ...(input.secrets || {}) };
  Object.keys(mergedSecrets).forEach((key) => {
    if (!String(mergedSecrets[key as keyof EmailProviderSecrets] || '').trim()) delete mergedSecrets[key as keyof EmailProviderSecrets];
  });
  validateProvider(input, mergedSecrets);
  const now = new Date().toISOString();
  const secretsChanged = JSON.stringify(existingSecrets) !== JSON.stringify(mergedSecrets);
  const provider: StoredEmailProvider = {
    id: existing?.id || randomUUID(),
    name: input.name.trim(),
    type: input.type,
    enabled: input.enabled !== false,
    fromName: input.fromName.trim() || 'Wikitruth',
    fromAddress: input.fromAddress.trim().toLowerCase(),
    ...(input.type === 'smtp' ? {
      host: String(input.host || '').trim(),
      port: Number(input.port),
      security: input.security === 'starttls' ? 'starttls' : 'ssl',
    } : {}),
    encryptedSecrets: encryptEmailSecrets(mergedSecrets, options),
    verifiedAt: existing?.verifiedAt || null,
    lastVerifiedRecipientMasked: existing?.lastVerifiedRecipientMasked,
    lastError: '',
    createDate: existing?.createDate || now,
    editDate: now,
  };
  if (existing && secretsChanged) provider.verifiedAt = null;
  if (existingIndex >= 0) store.providers[existingIndex] = provider;
  else store.providers.push(provider);
  writeStore(store, options);
  return publicProvider(provider, store.activeProviderId, options);
}

export function updateEmailProviderVerification(
  id: string,
  result: { verified: boolean; recipient?: string; error?: string },
  options: EmailProviderStoreOptions = {},
): PublicEmailProvider {
  const store = readStore(options);
  const provider = store.providers.find((item) => item.id === id);
  if (!provider) throw new Error('Email provider not found');
  provider.verifiedAt = result.verified ? new Date().toISOString() : null;
  provider.lastVerifiedRecipientMasked = result.recipient ? maskEmail(result.recipient) : provider.lastVerifiedRecipientMasked;
  provider.lastError = result.verified ? '' : String(result.error || 'Provider verification failed').slice(0, 500);
  provider.editDate = new Date().toISOString();
  writeStore(store, options);
  return publicProvider(provider, store.activeProviderId, options);
}

export function activateEmailProvider(id: string, options: EmailProviderStoreOptions = {}): PublicEmailProvider {
  const store = readStore(options);
  const provider = store.providers.find((item) => item.id === id);
  if (!provider) throw new Error('Email provider not found');
  if (!provider.enabled) throw new Error('Enable the provider before activation');
  if (!provider.verifiedAt) throw new Error('Verify the provider before activation');
  store.activeProviderId = id;
  provider.editDate = new Date().toISOString();
  writeStore(store, options);
  return publicProvider(provider, store.activeProviderId, options);
}

export function setEmailProviderEnabled(id: string, enabled: boolean, options: EmailProviderStoreOptions = {}): PublicEmailProvider {
  const store = readStore(options);
  const provider = store.providers.find((item) => item.id === id);
  if (!provider) throw new Error('Email provider not found');
  provider.enabled = enabled;
  provider.editDate = new Date().toISOString();
  if (!enabled && store.activeProviderId === id) store.activeProviderId = '';
  writeStore(store, options);
  return publicProvider(provider, store.activeProviderId, options);
}

export function removeEmailProvider(id: string, options: EmailProviderStoreOptions = {}): void {
  const store = readStore(options);
  if (store.activeProviderId === id) throw new Error('Deactivate the active provider before removal');
  const next = store.providers.filter((provider) => provider.id !== id);
  if (next.length === store.providers.length) throw new Error('Email provider not found');
  store.providers = next;
  writeStore(store, options);
}

export function readEmailProviderSecrets(provider: StoredEmailProvider, options: EmailProviderStoreOptions = {}): EmailProviderSecrets {
  return decryptEmailSecrets(provider.encryptedSecrets, options);
}

export function emailProviderStorePath(options: EmailProviderStoreOptions = {}): string {
  return options.storePath || defaultStorePath();
}
