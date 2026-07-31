'use strict';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

type MoveFileOperations = Pick<typeof fs, 'copyFile' | 'mkdir' | 'rename' | 'unlink'>;

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as NodeJS.ErrnoException).code || '')
    : undefined;
}

export async function moveFile(
  sourcePath: string,
  destinationPath: string,
  operations: MoveFileOperations = fs
): Promise<void> {
  await operations.mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    await operations.rename(sourcePath, destinationPath);
    return;
  } catch (error) {
    if (errorCode(error) !== 'EXDEV') throw error;
  }

  const temporaryPath = `${destinationPath}.move-${process.pid}-${randomUUID()}`;
  try {
    await operations.copyFile(sourcePath, temporaryPath);
    await operations.rename(temporaryPath, destinationPath);
    await operations.unlink(sourcePath);
  } catch (error) {
    await operations.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
