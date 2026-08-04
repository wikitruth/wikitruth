import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';

import { createDatabaseBackup, type BackupDatabaseConnection, type BackupSummary, type BackupUser } from './databaseBackupService';

export interface SnapshotCollectionManifest {
  key: string;
  relativeDirectory: string;
  documents: number;
  bytes: number;
  checksum: string;
}

export interface BackupSnapshotManifest {
  format: 'wikitruth.backup-snapshot';
  version: 1;
  id: string;
  kind: 'manual' | 'pre_restore';
  databaseName: string;
  createdAt: string;
  createdByUserId: string;
  complete: boolean;
  totalDocuments: number;
  totalBytes: number;
  checksum: string;
  collections: SnapshotCollectionManifest[];
  summary: BackupSummary;
  publicCollections: string[];
  privateCollections: string[];
  offsite: {
    configured: boolean;
    verifiedAt: string | null;
    reference: string;
  };
}

export interface SnapshotVerification {
  valid: boolean;
  snapshotId: string;
  checkedAt: string;
  expectedChecksum: string;
  actualChecksum: string;
  missingCollections: string[];
  changedCollections: string[];
}

export interface SnapshotCountComparison {
  collection: string;
  current: number | null;
  snapshot: number;
  change: number | null;
  scope: 'public' | 'private';
}

type CountableCollection = {
  countDocuments?: (query: Record<string, unknown>) => Promise<number>;
  find: (query: Record<string, unknown>) => { sort: (sort: Record<string, 1 | -1>) => { toArray: () => Promise<Record<string, unknown>[]> } };
};

type TemporaryCollection = {
  insertMany: (documents: Record<string, unknown>[], options?: Record<string, unknown>) => Promise<unknown>;
  countDocuments: () => Promise<number>;
};

type TemporaryDatabase = {
  collection: (name: string) => TemporaryCollection;
  dropDatabase: () => Promise<unknown>;
};

type NativeClient = { db: (name: string) => TemporaryDatabase };

function snapshotBase(backupRoot: string): string {
  return path.join(backupRoot, 'snapshots');
}

function assertSnapshotId(id: string): string {
  const normalized = String(id || '').trim();
  if (!/^[0-9TZ-]{16,48}-[a-f0-9]{8}$/.test(normalized)) throw new Error('Invalid snapshot id');
  return normalized;
}

function snapshotDirectory(backupRoot: string, id: string): string {
  const root = snapshotBase(backupRoot);
  const target = path.join(root, assertSnapshotId(id));
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid snapshot path');
  return target;
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function jsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const output: string[] = [];
  const visit = (current: string) => {
    fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((entry) => {
        const target = path.join(current, entry.name);
        if (entry.isDirectory()) visit(target);
        else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'manifest.json') output.push(target);
      });
  };
  visit(directory);
  return output;
}

function collectionDirectories(snapshotRoot: string): string[] {
  const files = jsonFiles(snapshotRoot);
  return Array.from(new Set(files.map((file) => path.dirname(file)))).sort();
}

function inspectCollection(snapshotRoot: string, directory: string): SnapshotCollectionManifest {
  const files = jsonFiles(directory).filter((file) => path.dirname(file) === directory);
  const hash = createHash('sha256');
  let bytes = 0;
  files.forEach((file) => {
    const body = fs.readFileSync(file);
    const relative = path.relative(directory, file);
    bytes += body.byteLength;
    hash.update(relative);
    hash.update('\0');
    hash.update(body);
    hash.update('\0');
  });
  const relativeDirectory = path.relative(snapshotRoot, directory).split(path.sep).join('/');
  return {
    key: relativeDirectory,
    relativeDirectory,
    documents: files.length,
    bytes,
    checksum: hash.digest('hex'),
  };
}

function inspectSnapshot(snapshotRoot: string): { collections: SnapshotCollectionManifest[]; checksum: string; bytes: number; documents: number } {
  const collections = collectionDirectories(snapshotRoot).map((directory) => inspectCollection(snapshotRoot, directory));
  const fingerprint = collections.map((entry) => `${entry.key}:${entry.documents}:${entry.bytes}:${entry.checksum}`).join('\n');
  return {
    collections,
    checksum: sha256(fingerprint),
    bytes: collections.reduce((total, entry) => total + entry.bytes, 0),
    documents: collections.reduce((total, entry) => total + entry.documents, 0),
  };
}

function writeJsonAtomically(file: string, value: unknown): void {
  const staged = `${file}.staged-${process.pid}-${Date.now()}`;
  fs.writeFileSync(staged, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(staged, file);
}

function manifestPath(backupRoot: string, id: string): string {
  return path.join(snapshotDirectory(backupRoot, id), 'manifest.json');
}

export function loadSnapshotManifest(backupRoot: string, id: string): BackupSnapshotManifest {
  const file = manifestPath(backupRoot, id);
  if (!fs.existsSync(file)) throw new Error('Snapshot manifest not found');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as BackupSnapshotManifest;
  if (manifest.format !== 'wikitruth.backup-snapshot' || manifest.version !== 1 || manifest.id !== id || !manifest.complete) {
    throw new Error('Snapshot manifest is incomplete or incompatible');
  }
  return manifest;
}

export function listBackupSnapshots(backupRoot: string): BackupSnapshotManifest[] {
  const root = snapshotBase(backupRoot);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      try {
        return [loadSnapshotManifest(backupRoot, entry.name)];
      } catch (_error) {
        return [];
      }
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createBackupSnapshot(options: {
  connection: BackupDatabaseConnection;
  backupRoot: string;
  databaseName: string;
  publicCollections: string[];
  privateCollections: string[];
  users: BackupUser[];
  createdByUserId: string;
  kind?: 'manual' | 'pre_restore';
  offsiteConfigured?: boolean;
}): Promise<BackupSnapshotManifest> {
  const id = `${new Date().toISOString().replace(/[:.]/g, '-').replace('Z', 'Z')}-${randomBytes(4).toString('hex')}`;
  const target = snapshotDirectory(options.backupRoot, id);
  fs.mkdirSync(target, { recursive: true, mode: 0o700 });
  try {
    const summary = await createDatabaseBackup({
      connection: options.connection,
      databaseName: options.databaseName,
      publicRoot: path.join(target, 'public'),
      privateUsersRoot: path.join(target, 'private', 'users'),
      publicCollections: options.publicCollections,
      privateCollections: options.privateCollections,
      users: options.users,
    });
    const inspection = inspectSnapshot(target);
    const manifest: BackupSnapshotManifest = {
      format: 'wikitruth.backup-snapshot', version: 1, id,
      kind: options.kind || 'manual', databaseName: options.databaseName,
      createdAt: new Date().toISOString(), createdByUserId: options.createdByUserId,
      complete: true, totalDocuments: inspection.documents, totalBytes: inspection.bytes,
      checksum: inspection.checksum, collections: inspection.collections, summary,
      publicCollections: Array.from(new Set(options.publicCollections)),
      privateCollections: Array.from(new Set(options.privateCollections)),
      offsite: { configured: Boolean(options.offsiteConfigured), verifiedAt: null, reference: '' },
    };
    writeJsonAtomically(path.join(target, 'manifest.json'), manifest);
    return manifest;
  } catch (error) {
    fs.rmSync(target, { recursive: true, force: true });
    throw error;
  }
}

export function verifyBackupSnapshot(backupRoot: string, id: string): SnapshotVerification {
  const manifest = loadSnapshotManifest(backupRoot, id);
  const inspection = inspectSnapshot(snapshotDirectory(backupRoot, id));
  const actual = new Map(inspection.collections.map((entry) => [entry.key, entry]));
  const expected = new Map(manifest.collections.map((entry) => [entry.key, entry]));
  const missingCollections = manifest.collections.filter((entry) => !actual.has(entry.key)).map((entry) => entry.key);
  const changedCollections = inspection.collections.filter((entry) => {
    const previous = expected.get(entry.key);
    return !previous || previous.documents !== entry.documents || previous.bytes !== entry.bytes || previous.checksum !== entry.checksum;
  }).map((entry) => entry.key);
  return {
    valid: inspection.checksum === manifest.checksum && !missingCollections.length && !changedCollections.length,
    snapshotId: id, checkedAt: new Date().toISOString(), expectedChecksum: manifest.checksum,
    actualChecksum: inspection.checksum, missingCollections, changedCollections,
  };
}

async function countCollection(connection: BackupDatabaseConnection, name: string, query: Record<string, unknown>): Promise<number | null> {
  const collection = connection.collection(name) as CountableCollection;
  if (collection.countDocuments) return collection.countDocuments(query);
  try {
    return (await collection.find(query).sort({ _id: 1 }).toArray()).length;
  } catch (_error) {
    return null;
  }
}

export async function compareSnapshotToCurrent(
  connection: BackupDatabaseConnection,
  manifest: BackupSnapshotManifest,
): Promise<SnapshotCountComparison[]> {
  const rows: SnapshotCountComparison[] = [];
  for (const collection of manifest.publicCollections) {
    const snapshot = Number(manifest.summary.public[collection] || 0);
    const query = manifest.privateCollections.includes(collection) ? { private: false } : {};
    const current = await countCollection(connection, collection, query);
    rows.push({ collection, current, snapshot, change: current === null ? null : snapshot - current, scope: 'public' });
  }
  for (const collection of manifest.privateCollections) {
    const snapshot = Object.entries(manifest.summary.private)
      .filter(([key]) => key.endsWith(`:${collection}`))
      .reduce((total, [, count]) => total + Number(count || 0), 0);
    const current = await countCollection(connection, collection, { private: true });
    rows.push({ collection, current, snapshot, change: current === null ? null : snapshot - current, scope: 'private' });
  }
  return rows;
}

function clientOf(connection: BackupDatabaseConnection): NativeClient | null {
  const extended = connection as unknown as { getClient?: () => NativeClient; client?: NativeClient };
  return extended.getClient?.() || extended.client || null;
}

function documentsByCollection(backupRoot: string, id: string): Map<string, Record<string, unknown>[]> {
  const root = snapshotDirectory(backupRoot, id);
  const output = new Map<string, Record<string, unknown>[]>();
  jsonFiles(root).forEach((file) => {
    const parts = path.relative(root, file).split(path.sep);
    const collection = parts[0] === 'public' ? parts[2] : parts[4];
    if (!collection) return;
    const rows = output.get(collection) || [];
    rows.push(JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>);
    output.set(collection, rows);
  });
  return output;
}

export async function testSnapshotRestore(options: {
  connection: BackupDatabaseConnection;
  backupRoot: string;
  snapshotId: string;
}): Promise<{ supported: boolean; valid: boolean; testedAt: string; collections: Record<string, number>; message: string }> {
  const client = clientOf(options.connection);
  if (!client) return { supported: false, valid: false, testedAt: new Date().toISOString(), collections: {}, message: 'The MongoDB driver does not expose an isolated test database.' };
  const verification = verifyBackupSnapshot(options.backupRoot, options.snapshotId);
  if (!verification.valid) return { supported: true, valid: false, testedAt: new Date().toISOString(), collections: {}, message: 'Checksum verification failed before the restore test.' };
  const name = `wikitruth_restore_test_${process.pid}_${Date.now()}_${randomBytes(3).toString('hex')}`;
  const temporary = client.db(name);
  const expected = documentsByCollection(options.backupRoot, options.snapshotId);
  const counts: Record<string, number> = {};
  try {
    for (const [collectionName, documents] of expected) {
      if (documents.length) await temporary.collection(collectionName).insertMany(documents, { ordered: true });
      counts[collectionName] = await temporary.collection(collectionName).countDocuments();
      if (counts[collectionName] !== documents.length) throw new Error(`Count mismatch for ${collectionName}`);
    }
    return { supported: true, valid: true, testedAt: new Date().toISOString(), collections: counts, message: 'Snapshot restored and verified in a disposable database.' };
  } finally {
    await temporary.dropDatabase();
  }
}

export function signRestorePreview(secret: string, payload: Record<string, unknown>): string {
  if (!secret) throw new Error('Restore preview signing is unavailable');
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`;
}

export function verifyRestorePreview(secret: string, token: string): Record<string, unknown> | null {
  const [encoded, signature] = String(token || '').split('.');
  if (!secret || !encoded || !signature) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>;
    return Number(payload.expiresAt || 0) > Date.now() ? payload : null;
  } catch (_error) {
    return null;
  }
}

export function snapshotRoots(backupRoot: string, id: string): { publicRoot: string; privateUsersRoot: string } {
  const root = snapshotDirectory(backupRoot, id);
  return { publicRoot: path.join(root, 'public'), privateUsersRoot: path.join(root, 'private', 'users') };
}
