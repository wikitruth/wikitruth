import type { LegacyEntity } from '../../types/legacy';
import { buildEntryReplyOptions } from './entryReplyOptions';

const entry = {
  _id: 'entry-1',
  ownerId: 'topic-1',
} as LegacyEntity;

describe('entry reply options', () => {
  it('offers the full contextual contribution set for a topic', () => {
    expect(buildEntryReplyOptions(entry, 'topic').map((item) => item.label)).toEqual([
      'New Topic',
      'New Fact',
      'New Question',
      'New Artifact',
      'New Issue',
      'New Comment',
    ]);
  });

  it('offers answers in question context and comments for artifacts', () => {
    expect(buildEntryReplyOptions(entry, 'question').map((item) => item.label)).toEqual([
      'New Answer',
      'New Issue',
      'New Comment',
    ]);
    expect(buildEntryReplyOptions(entry, 'artifact').map((item) => item.label)).toContain('New Comment');
  });
});
