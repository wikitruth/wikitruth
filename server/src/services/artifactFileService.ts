import fs from 'fs/promises';
import path from 'path';

const MAX_ARTIFACT_FILE_BYTES = 10 * 1024 * 1024;
const ARTIFACT_FOLDER = path.join(process.cwd(), 'public', 'media', 'artifacts');

export type ArtifactFilePayload = {
  name?: unknown;
  type?: unknown;
  size?: unknown;
  lastModifiedDate?: unknown;
  data?: unknown;
};

export type ArtifactTempFile = {
  filepath?: string;
  path?: string;
  originalFilename?: string;
  name?: string;
  mimetype?: string;
  type?: string;
  size?: number;
  mtime?: Date;
  lastModifiedDate?: Date;
};

type StoredArtifactFile = {
  name: string;
  type: string;
  size: number;
  lastModifiedDate: Date;
};

function safeFileName(value: unknown): string {
  const baseName = path.basename(String(value || '').trim());
  return baseName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
}

function artifactPath(id: string, fileName: string, thumbnail = false): string {
  return path.join(ARTIFACT_FOLDER, `${id}_${thumbnail ? 'thumbnail_' : ''}${fileName}`);
}

async function removeIfPresent(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function storeArtifactFile(
  artifactId: unknown,
  payload: ArtifactFilePayload,
  previousFile?: { name?: unknown; type?: unknown } | null,
): Promise<StoredArtifactFile> {
  const id = String(artifactId || '').trim();
  const name = safeFileName(payload.name);
  const type = String(payload.type || 'application/octet-stream').trim();
  const encoded = String(payload.data || '').replace(/^data:[^;]+;base64,/, '');
  const data = Buffer.from(encoded, 'base64');

  if (!id || !name || name === '.' || name === '..' || !encoded || data.length === 0) {
    throw new Error('A valid artifact file is required');
  }
  const extension = path.extname(name).toLowerCase();
  if (['.html', '.htm', '.xhtml', '.svg', '.js', '.mjs'].includes(extension)
    || ['text/html', 'application/xhtml+xml', 'image/svg+xml', 'application/javascript'].includes(type.toLowerCase())) {
    throw new Error('Executable web files cannot be uploaded as artifacts');
  }
  if (data.length > MAX_ARTIFACT_FILE_BYTES) {
    throw new Error('Artifact files must be 10 MB or smaller');
  }

  await fs.mkdir(ARTIFACT_FOLDER, { recursive: true });
  const oldName = safeFileName(previousFile?.name);
  if (oldName && oldName !== name) {
    await removeIfPresent(artifactPath(id, oldName));
    await removeIfPresent(artifactPath(id, oldName, true));
  }

  await fs.writeFile(artifactPath(id, name), data);
  const isImage = type.toLowerCase().startsWith('image/');
  if (isImage) {
    // Keep the legacy thumbnail URL contract; the browser constrains its rendered size.
    await fs.writeFile(artifactPath(id, name, true), data);
  } else {
    await removeIfPresent(artifactPath(id, name, true));
  }

  const modified = new Date(String(payload.lastModifiedDate || ''));
  return {
    name,
    type,
    size: data.length,
    lastModifiedDate: Number.isNaN(modified.getTime()) ? new Date() : modified,
  };
}

export async function storeUploadedArtifactFile(
  artifactId: unknown,
  upload: ArtifactTempFile,
  previousFile?: { name?: unknown; type?: unknown } | null,
): Promise<StoredArtifactFile> {
  const tempPath = String(upload.filepath || upload.path || '').trim();
  if (!tempPath) {
    throw new Error('A valid artifact file is required');
  }
  const stats = await fs.stat(tempPath);
  if (stats.size > MAX_ARTIFACT_FILE_BYTES) {
    throw new Error('Artifact files must be 10 MB or smaller');
  }
  const data = await fs.readFile(tempPath);
  return storeArtifactFile(artifactId, {
    name: upload.originalFilename || upload.name,
    type: upload.mimetype || upload.type,
    size: stats.size,
    lastModifiedDate: upload.mtime || upload.lastModifiedDate,
    data: data.toString('base64'),
  }, previousFile);
}

export { MAX_ARTIFACT_FILE_BYTES };
