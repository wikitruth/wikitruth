import os from 'os';
import path from 'path';

export type BackupScope = 'public' | 'private';

interface ResolveBackupDirOptions {
  configuredRoot?: unknown;
  scope: BackupScope;
  cwd?: string;
  homeDir?: string;
  moduleDir?: string;
}

function isSameOrDescendant(candidatePath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, candidatePath);
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function expandBackupRoot(rawRoot: string, cwd: string, homeDir: string): string {
  if (rawRoot === '~') {
    return path.resolve(homeDir);
  }
  if (rawRoot.startsWith(`~${path.sep}`) || rawRoot.startsWith('~/')) {
    return path.resolve(homeDir, rawRoot.slice(2));
  }
  if (rawRoot.startsWith('~')) {
    throw new Error(`Unsupported home-directory backup path: ${rawRoot}`);
  }
  return path.resolve(cwd, rawRoot);
}

function trackedFixtureRoots(cwd: string, moduleDir: string): string[] {
  return Array.from(new Set([
    path.resolve(cwd, 'config/mongodb'),
    path.resolve(moduleDir, '../../../config/mongodb'),
    path.resolve(moduleDir, '../../config/mongodb'),
  ]));
}

export function resolveBackupDir(options: ResolveBackupDirOptions): string {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || os.homedir());
  const moduleDir = path.resolve(options.moduleDir || __dirname);
  const configuredRoot = String(options.configuredRoot || '').trim();
  const defaultRoot = path.join(homeDir, '.wikitruth', 'backups', options.scope);
  const resolvedRoot = expandBackupRoot(configuredRoot || defaultRoot, cwd, homeDir);

  const fixtureRoot = trackedFixtureRoots(cwd, moduleDir).find((root) =>
    isSameOrDescendant(resolvedRoot, root)
  );
  if (fixtureRoot) {
    const envName = options.scope === 'private'
      ? 'MONGODB_PRIVATE_BACKUP_ROOT'
      : 'MONGODB_BACKUP_ROOT';
    throw new Error(
      `Refusing MongoDB backup path inside tracked fixtures: ${resolvedRoot}. `
      + `Set ${envName} to a private directory outside the repository.`,
    );
  }

  return resolvedRoot;
}
