import type { ArtifactFileUpload } from '../services/api';

export const MAX_ARTIFACT_FILE_BYTES = 10 * 1024 * 1024;

export async function readArtifactFile(file: File): Promise<ArtifactFileUpload> {
  if (file.size > MAX_ARTIFACT_FILE_BYTES) {
    throw new Error('Artifact files must be 10 MB or smaller');
  }

  return file;
}
