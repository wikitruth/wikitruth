import { serializeHydratedEntry } from '../../server/src/controllers/api/entrySerialization';

describe('entry response serialization', () => {
  it('retains transient hydrated usernames from a Mongoose-style document', () => {
    const entry = {
      createUsername: 'root',
      editUsername: 'editor',
      editorUsername: 'editor',
      toObject: () => ({ _id: 'topic-1', title: 'Topic' }),
    };

    expect(serializeHydratedEntry(entry)).toEqual({
      _id: 'topic-1',
      title: 'Topic',
      createUsername: 'root',
      editUsername: 'editor',
      editorUsername: 'editor',
    });
  });

  it('does not add empty identity fields to plain entries', () => {
    expect(serializeHydratedEntry({ _id: 'topic-1', createUsername: '' })).toEqual({
      _id: 'topic-1',
      createUsername: '',
    });
  });
});
