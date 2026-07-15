import { setEditorsUsername, setUsername } from '../../server/src/utils/flowUtils';

function objectId(value: string) {
  return { valueOf: () => value };
}

describe('flowUtils username enrichment', () => {
  const find = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as typeof globalThis & { __wikitruth_app?: unknown }).__wikitruth_app = {
      db: { models: { User: { find } } },
    };
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __wikitruth_app?: unknown }).__wikitruth_app;
  });

  it('hydrates creators and editors in one query for list entries', async () => {
    find.mockReturnValue({
      exec: async () => [
        { _id: objectId('creator-1'), username: 'creator' },
        { _id: objectId('editor-1'), username: 'editor' },
      ],
    });
    const item: Record<string, unknown> = {
      createUserId: objectId('creator-1'),
      editUserId: objectId('editor-1'),
    };

    await setEditorsUsername([item]);

    expect(find).toHaveBeenCalledTimes(1);
    expect(item).toMatchObject({
      createUsername: 'creator',
      editUsername: 'editor',
      editorUsername: 'editor',
    });
  });

  it('uses value equality when one user created and edited a single entry', async () => {
    find.mockReturnValue({
      exec: async () => [{ _id: objectId('user-1'), username: 'root' }],
    });
    const item: Record<string, unknown> = {
      createUserId: objectId('user-1'),
      editUserId: objectId('user-1'),
    };

    await setUsername(item);

    expect(item).toMatchObject({
      createUsername: 'root',
      editUsername: 'root',
      editorUsername: 'root',
    });
  });
});
