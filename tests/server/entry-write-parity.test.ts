import fs from 'fs/promises';
import path from 'path';
import { parseBoolean, parseNumericTags, parseOptionalDate } from '../../server/src/controllers/api/entryWriteHelpers';
import { storeArtifactFile } from '../../server/src/services/artifactFileService';

describe('legacy-compatible entry write helpers', () => {
  it('normalizes numeric tags, optional dates, and multipart booleans', () => {
    expect(parseNumericTags('20, 30,20,invalid')).toEqual([20, 30]);
    expect(parseOptionalDate('2026-07-11T12:30')).toBeInstanceOf(Date);
    expect(parseOptionalDate('')).toBeNull();
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('true')).toBe(true);
  });

  it('stores artifact media under safe legacy-compatible paths', async () => {
    const artifactId = `parity-${Date.now()}`;
    const fileName = 'source_file.txt';
    const storedPath = path.join(process.cwd(), 'public', 'media', 'artifacts', `${artifactId}_${fileName}`);

    try {
      const stored = await storeArtifactFile(artifactId, {
        name: '../source file.txt',
        type: 'text/plain',
        data: Buffer.from('parity fixture').toString('base64'),
        lastModifiedDate: '2026-07-11T12:30:45+08:00',
      });

      expect(stored.name).toBe(fileName);
      expect(stored.size).toBe(14);
      await expect(fs.readFile(storedPath, 'utf8')).resolves.toBe('parity fixture');
    } finally {
      await fs.rm(storedPath, { force: true });
    }
  });

  it('rejects executable web uploads', async () => {
    await expect(storeArtifactFile('unsafe-artifact', {
      name: 'payload.html',
      type: 'text/html',
      data: Buffer.from('<script>alert(1)</script>').toString('base64'),
    })).rejects.toThrow('Executable web files');
  });
});
