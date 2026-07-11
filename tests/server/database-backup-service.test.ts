import fs from 'fs';
import os from 'os';
import path from 'path';

import { createDatabaseBackup } from '../../server/src/services/databaseBackupService';

function collection(documents: Array<Record<string, unknown>>) {
  return {
    find: jest.fn((query: Record<string, unknown>) => ({
      sort: jest.fn(() => ({
        toArray: jest.fn(async () => documents.filter((document) =>
          Object.entries(query).every(([key, value]) => document[key] === value)
        )),
      })),
    })),
  };
}

describe('database backup service', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'wikitruth-backup-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes public and user-private documents in the legacy-compatible directory format', async () => {
    const collections = {
      users: collection([{ _id: 'user-1', username: 'alice' }]),
      topics: collection([
        { _id: 'public-topic', title: 'Public', private: false },
        { _id: 'private-topic', title: 'Private', private: true, createUserId: 'user-1' },
      ]),
    };
    const connection = {
      collection: jest.fn((name: keyof typeof collections) => collections[name]),
    };

    const summary = await createDatabaseBackup({
      connection,
      databaseName: 'wikitruth',
      publicRoot: path.join(root, 'public'),
      privateUsersRoot: path.join(root, 'private', 'users'),
      publicCollections: ['users'],
      privateCollections: ['topics'],
      users: [{ _id: 'user-1', username: 'alice' }],
    });

    expect(summary).toEqual({
      public: { users: 1, topics: 1 },
      private: { 'alice:topics': 1 },
    });
    expect(JSON.parse(fs.readFileSync(path.join(root, 'public', 'wikitruth', 'topics', 'public-topic.json'), 'utf8')))
      .toEqual({ _id: 'public-topic', title: 'Public', private: false });
    expect(JSON.parse(fs.readFileSync(path.join(root, 'private', 'users', 'alice', 'wikitruth', 'topics', 'private-topic.json'), 'utf8')))
      .toEqual({ _id: 'private-topic', title: 'Private', private: true, createUserId: 'user-1' });
  });

  it('replaces a collection directory only after the new files are ready', async () => {
    const target = path.join(root, 'public', 'wikitruth', 'users');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'stale.json'), '{}');
    const connection = {
      collection: jest.fn(() => collection([{ _id: 'current' }])),
    };

    await createDatabaseBackup({
      connection,
      databaseName: 'wikitruth',
      publicRoot: path.join(root, 'public'),
      privateUsersRoot: path.join(root, 'private', 'users'),
      publicCollections: ['users'],
      privateCollections: [],
      users: [],
    });

    expect(fs.existsSync(path.join(target, 'stale.json'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'current.json'))).toBe(true);
  });
});
