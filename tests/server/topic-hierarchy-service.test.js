'use strict';

const { loadTopicAncestors } = require('../../server/src/services/topicHierarchyService');

function topicModel(rows) {
  return {
    findById: jest.fn((id) => ({
      select: jest.fn(() => ({
        lean: jest.fn(async () => rows[String(id)] || null),
      })),
    })),
  };
}

describe('topic hierarchy service', () => {
  it('returns every ancestor in root-to-parent order', async () => {
    const model = topicModel({
      health: { _id: 'health', title: 'Health', parentId: null },
      msg: { _id: 'msg', title: 'Monosodium glutamate (MSG)', parentId: 'health' },
      test: { _id: 'test', title: 'test', parentId: 'msg' },
    });

    await expect(loadTopicAncestors(model, 'test')).resolves.toEqual([
      expect.objectContaining({ _id: 'health' }),
      expect.objectContaining({ _id: 'msg' }),
      expect.objectContaining({ _id: 'test' }),
    ]);
  });

  it('stops safely when a legacy hierarchy contains a cycle', async () => {
    const model = topicModel({
      one: { _id: 'one', title: 'One', parentId: 'two' },
      two: { _id: 'two', title: 'Two', parentId: 'one' },
    });

    const result = await loadTopicAncestors(model, 'one');

    expect(result).toHaveLength(2);
    expect(model.findById).toHaveBeenCalledTimes(2);
  });
});
