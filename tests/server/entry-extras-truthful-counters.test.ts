import { appendEntryExtrasCore, type EntryExtras } from '../../server/src/utils/flow/entryExtras';

function dependencies() {
  return {
    constants: {
      SETTINGS: {
        TILE_MAX_ENTRY_LEN: 45,
        contentPreviewLength: 120,
      },
    },
    utils: {
      urlify: (value: unknown) => String(value || '').toLowerCase().replace(/\s+/g, '-'),
      getShortText: (value: unknown) => String(value || ''),
      timeSince: () => '1 day',
    },
    dateFns: {
      format: () => 'Jan 1, 2026',
    },
    getObjectName: () => 'topic',
    appendOwnerFlag: () => undefined,
  };
}

describe('entry extras engagement counters', () => {
  it('does not fabricate comments or points when persisted totals are absent', () => {
    const item: EntryExtras = {
      editDate: new Date('2026-01-01T00:00:00.000Z'),
      createDate: new Date('2026-01-01T00:00:00.000Z'),
    };

    appendEntryExtrasCore(item, undefined, undefined, undefined, dependencies());

    expect(item).not.toHaveProperty('comments');
    expect(item).not.toHaveProperty('points');
  });

  it('preserves persisted comments and points', () => {
    const item: EntryExtras = {
      comments: 7,
      points: 5,
      editDate: new Date('2026-01-01T00:00:00.000Z'),
      createDate: new Date('2026-01-01T00:00:00.000Z'),
    };

    appendEntryExtrasCore(item, undefined, undefined, undefined, dependencies());

    expect(item.comments).toBe(7);
    expect(item.points).toBe(5);
  });

  it('recognizes accepted artifacts as real child content', () => {
    const item: EntryExtras = {
      childrenCount: { artifacts: { accepted: 1 } },
      editDate: new Date('2026-01-01T00:00:00.000Z'),
      createDate: new Date('2026-01-01T00:00:00.000Z'),
    };

    appendEntryExtrasCore(item, undefined, undefined, undefined, dependencies());

    expect(item.hasChildren).toBe(true);
  });
});
