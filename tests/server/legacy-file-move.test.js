const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { moveFile } = require('../../legacy/server/utils/moveFile');

describe('legacy artifact file move', () => {
  let directory;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wikitruth-move-'));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('uses an atomic rename when the paths share a filesystem', async () => {
    const source = path.join(directory, 'upload.tmp');
    const destination = path.join(directory, 'artifacts', 'image.jpg');
    await fs.writeFile(source, 'artifact-content');

    await moveFile(source, destination);

    await expect(fs.readFile(destination, 'utf8')).resolves.toBe('artifact-content');
    await expect(fs.access(source)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('copies through a destination-side temporary file after EXDEV', async () => {
    const source = path.join(directory, 'cross-device.tmp');
    const destination = path.join(directory, 'artifacts', 'document.pdf');
    await fs.writeFile(source, 'cross-device-content');

    let firstRename = true;
    const operations = {
      copyFile: fs.copyFile.bind(fs),
      mkdir: fs.mkdir.bind(fs),
      rename: async (...args) => {
        if (firstRename) {
          firstRename = false;
          throw Object.assign(new Error('cross-device link'), { code: 'EXDEV' });
        }
        return fs.rename(...args);
      },
      unlink: fs.unlink.bind(fs),
    };

    await moveFile(source, destination, operations);

    await expect(fs.readFile(destination, 'utf8')).resolves.toBe('cross-device-content');
    await expect(fs.access(source)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.readdir(path.dirname(destination))).resolves.toEqual(['document.pdf']);
  });

  it('does not hide rename errors unrelated to cross-device moves', async () => {
    const source = path.join(directory, 'missing.tmp');
    const destination = path.join(directory, 'artifacts', 'missing.bin');

    await expect(moveFile(source, destination)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
