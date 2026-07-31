import path from 'path';

import { resolveBackupDir } from '../../server/src/utils/backupPaths';

describe('MongoDB backup path resolution', () => {
  const workspace = path.resolve('/tmp/wikitruth-backup-path-tests/repository');
  const homeDir = path.resolve('/tmp/wikitruth-backup-path-tests/home');
  const moduleDir = path.join(workspace, 'server/src/utils');

  it('uses separate external defaults for public and private backups', () => {
    expect(resolveBackupDir({ scope: 'public', cwd: workspace, homeDir, moduleDir }))
      .toBe(path.join(homeDir, '.wikitruth/backups/public'));
    expect(resolveBackupDir({ scope: 'private', cwd: workspace, homeDir, moduleDir }))
      .toBe(path.join(homeDir, '.wikitruth/backups/private'));
  });

  it('expands a home-relative path against the actual home directory', () => {
    expect(resolveBackupDir({
      configuredRoot: '~/backups/wikitruth',
      scope: 'public',
      cwd: workspace,
      homeDir,
      moduleDir,
    })).toBe(path.join(homeDir, 'backups/wikitruth'));
  });

  it('allows an explicit backup directory outside tracked fixtures', () => {
    expect(resolveBackupDir({
      configuredRoot: '../runtime-backups',
      scope: 'public',
      cwd: workspace,
      homeDir,
      moduleDir,
    })).toBe(path.resolve(workspace, '../runtime-backups'));
  });

  it.each([
    'config/mongodb',
    'config/mongodb/users',
  ])('rejects tracked fixture path %s', (configuredRoot) => {
    expect(() => resolveBackupDir({
      configuredRoot,
      scope: 'private',
      cwd: workspace,
      homeDir,
      moduleDir,
    })).toThrow(/outside the repository/i);
  });

  it('rejects tracked fixtures resolved from the module location', () => {
    expect(() => resolveBackupDir({
      configuredRoot: path.join(workspace, 'config/mongodb'),
      scope: 'public',
      cwd: path.join(workspace, 'server'),
      homeDir,
      moduleDir,
    })).toThrow(/MONGODB_BACKUP_ROOT/);
  });

  it('rejects unsupported named-user home expansion', () => {
    expect(() => resolveBackupDir({
      configuredRoot: '~someone/backups',
      scope: 'public',
      cwd: workspace,
      homeDir,
      moduleDir,
    })).toThrow(/unsupported home-directory/i);
  });
});
