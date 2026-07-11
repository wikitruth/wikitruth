'use strict';

import fs from 'fs';
import path from 'path';

type BackupDocument = Record<string, unknown>;

interface CollectionCursor {
  sort(sort: Record<string, 1 | -1>): CollectionCursor;
  toArray(): Promise<BackupDocument[]>;
}

interface NativeCollection {
  find(query: Record<string, unknown>): CollectionCursor;
}

export interface BackupDatabaseConnection {
  collection(name: string): NativeCollection;
}

export interface BackupUser {
  _id?: unknown;
  username?: unknown;
}

export interface BackupSummary {
  public: Record<string, number>;
  private: Record<string, number>;
}

function ensureDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true });
}

function safePathSegment(value: unknown): string {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('Backup path segment cannot be empty');
  }
  return encodeURIComponent(normalized);
}

function documentFileName(document: BackupDocument, index: number): string {
  const id = String(document._id || '').trim();
  return `${id ? safePathSegment(id) : String(index + 1).padStart(8, '0')}.json`;
}

function replaceDirectoryAtomically(targetDirectory: string, stagedDirectory: string): void {
  const previousDirectory = `${targetDirectory}.previous-${process.pid}-${Date.now()}`;
  const hadPreviousDirectory = fs.existsSync(targetDirectory);

  if (hadPreviousDirectory) {
    fs.renameSync(targetDirectory, previousDirectory);
  }

  try {
    fs.renameSync(stagedDirectory, targetDirectory);
    if (hadPreviousDirectory) {
      fs.rmSync(previousDirectory, { recursive: true, force: true });
    }
  } catch (error) {
    if (hadPreviousDirectory && fs.existsSync(previousDirectory) && !fs.existsSync(targetDirectory)) {
      fs.renameSync(previousDirectory, targetDirectory);
    }
    throw error;
  }
}

async function backupCollection(options: {
  connection: BackupDatabaseConnection;
  collectionName: string;
  databaseDirectory: string;
  query: Record<string, unknown>;
}): Promise<number> {
  const { connection, collectionName, databaseDirectory, query } = options;
  const collection = connection.collection(collectionName);
  const documents = await collection.find(query).sort({ _id: 1 }).toArray();
  const targetDirectory = path.join(databaseDirectory, safePathSegment(collectionName));
  const stagedDirectory = `${targetDirectory}.staged-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  ensureDirectory(databaseDirectory);
  ensureDirectory(stagedDirectory);

  try {
    documents.forEach((document, index) => {
      const outputPath = path.join(stagedDirectory, documentFileName(document, index));
      fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
    });
    replaceDirectoryAtomically(targetDirectory, stagedDirectory);
  } catch (error) {
    fs.rmSync(stagedDirectory, { recursive: true, force: true });
    throw error;
  }

  return documents.length;
}

async function backupCollectionSet(options: {
  connection: BackupDatabaseConnection;
  collectionNames: string[];
  rootDirectory: string;
  databaseName: string;
  query: Record<string, unknown>;
}): Promise<Record<string, number>> {
  const { connection, collectionNames, rootDirectory, databaseName, query } = options;
  const databaseDirectory = path.join(rootDirectory, safePathSegment(databaseName));
  const summary: Record<string, number> = {};

  for (const collectionName of Array.from(new Set(collectionNames))) {
    summary[collectionName] = await backupCollection({
      connection,
      collectionName,
      databaseDirectory,
      query,
    });
  }

  return summary;
}

export async function createDatabaseBackup(options: {
  connection: BackupDatabaseConnection;
  databaseName: string;
  publicRoot: string;
  privateUsersRoot: string;
  publicCollections: string[];
  privateCollections: string[];
  users: BackupUser[];
}): Promise<BackupSummary> {
  const {
    connection,
    databaseName,
    publicRoot,
    privateUsersRoot,
    publicCollections,
    privateCollections,
    users,
  } = options;

  const systemSummary = await backupCollectionSet({
    connection,
    collectionNames: publicCollections,
    rootDirectory: publicRoot,
    databaseName,
    query: {},
  });
  const publicContentSummary = await backupCollectionSet({
    connection,
    collectionNames: privateCollections,
    rootDirectory: publicRoot,
    databaseName,
    query: { private: false },
  });
  const privateSummary: Record<string, number> = {};

  for (const user of users) {
    const username = String(user.username || '').trim();
    if (!username || !user._id) {
      continue;
    }
    const userRoot = path.join(privateUsersRoot, safePathSegment(username));
    const userSummary = await backupCollectionSet({
      connection,
      collectionNames: privateCollections,
      rootDirectory: userRoot,
      databaseName,
      query: { private: true, createUserId: user._id },
    });
    Object.entries(userSummary).forEach(([collectionName, count]) => {
      privateSummary[`${username}:${collectionName}`] = count;
    });
  }

  return {
    public: { ...systemSummary, ...publicContentSummary },
    private: privateSummary,
  };
}

