import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  compareSnapshotToCurrent,
  createBackupSnapshot,
  listBackupSnapshots,
  testSnapshotRestore,
  verifyBackupSnapshot,
} from '../../server/src/services/backupSnapshotService';

function matches(document: Record<string, unknown>, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => document[key] === value);
}

function sourceCollection(documents: Record<string, unknown>[]) {
  return {
    find: (query: Record<string, unknown>) => ({
      sort: () => ({ toArray: async () => documents.filter((document) => matches(document, query)) }),
    }),
    countDocuments: async (query: Record<string, unknown>) => documents.filter((document) => matches(document, query)).length,
  };
}

function temporaryClient() {
  const databases = new Map<string, Map<string, Record<string, unknown>[]>>();
  return {
    db: (databaseName: string) => {
      const database = new Map<string, Record<string, unknown>[]>();
      databases.set(databaseName, database);
      return {
        collection: (name: string) => ({
          insertMany: async (documents: Record<string, unknown>[]) => {
            database.set(name, [...(database.get(name) || []), ...documents]);
          },
          countDocuments: async () => (database.get(name) || []).length,
        }),
        dropDatabase: async () => {
          databases.delete(databaseName);
        },
      };
    },
  };
}

describe('backup snapshot service', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'wikitruth-snapshot-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('creates, lists, verifies, compares, and disposable-tests an immutable snapshot', async () => {
    const collections = {
      users: sourceCollection([{ _id: 'user-1', username: 'alice' }]),
      topics: sourceCollection([
        { _id: 'public-topic', private: false, title: 'Public' },
        { _id: 'private-topic', private: true, createUserId: 'user-1', title: 'Private' },
      ]),
    };
    const connection = {
      collection: (name: keyof typeof collections) => collections[name],
      getClient: temporaryClient,
    };

    const snapshot = await createBackupSnapshot({
      connection,
      backupRoot: root,
      databaseName: 'wikitruth',
      publicCollections: ['users'],
      privateCollections: ['topics'],
      users: [{ _id: 'user-1', username: 'alice' }],
      createdByUserId: 'admin-1',
      offsiteConfigured: true,
    });

    expect(snapshot.complete).toBe(true);
    expect(snapshot.totalDocuments).toBe(3);
    expect(snapshot.offsite).toEqual({ configured: true, verifiedAt: null, reference: '' });
    expect(listBackupSnapshots(root).map((item) => item.id)).toEqual([snapshot.id]);
    expect(verifyBackupSnapshot(root, snapshot.id).valid).toBe(true);
    await expect(compareSnapshotToCurrent(connection, snapshot)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ collection: 'users', current: 1, snapshot: 1, change: 0 }),
      expect.objectContaining({ collection: 'topics', current: 1, snapshot: 1, change: 0, scope: 'private' }),
    ]));
    await expect(testSnapshotRestore({ connection, backupRoot: root, snapshotId: snapshot.id }))
      .resolves.toMatchObject({ supported: true, valid: true, collections: { users: 1, topics: 2 } });
  });

  it('fails closed when a snapshot document changes after the manifest is written', async () => {
    const connection = {
      collection: () => sourceCollection([{ _id: 'user-1', username: 'alice' }]),
      getClient: temporaryClient,
    };
    const snapshot = await createBackupSnapshot({
      connection, backupRoot: root, databaseName: 'wikitruth', publicCollections: ['users'],
      privateCollections: [], users: [], createdByUserId: 'admin-1',
    });
    const snapshotRoot = path.join(root, 'snapshots', snapshot.id);
    const document = fs.readdirSync(path.join(snapshotRoot, 'public', 'wikitruth', 'users'))[0];
    fs.appendFileSync(path.join(snapshotRoot, 'public', 'wikitruth', 'users', document), '\n');

    expect(verifyBackupSnapshot(root, snapshot.id)).toMatchObject({ valid: false });
  });
});
