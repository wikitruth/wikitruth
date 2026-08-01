import type { OutlineTreeNode } from '../../types/api';
import { buildVisualizeGraphContext, WIKITRUTH_ROOT_ID } from './graphModel';

function topic(id: string, title: string, children: OutlineTreeNode[] = []): OutlineTreeNode {
  return { _id: id, title, friendlyUrl: id, objectName: 'topic', children };
}

describe('buildVisualizeGraphContext', () => {
  it('shows root topics and one supplied descendant level under Wikitruth', () => {
    const context = buildVisualizeGraphContext([
      topic('health', 'Health', [topic('medicine', 'Medicine')]),
      topic('science', 'Science'),
    ], [], '');

    expect(context.graph.focusNodeId).toBe(WIKITRUTH_ROOT_ID);
    expect(context.topicCount).toBe(3);
    expect(context.graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: WIKITRUTH_ROOT_ID, to: 'health', direction: 'down' }),
      expect.objectContaining({ from: 'health', to: 'medicine', direction: 'down' }),
    ]));
  });

  it('marks parent and grandparent nodes as upward context around a selected topic', () => {
    const context = buildVisualizeGraphContext(
      [topic('addiction', 'Addiction', [topic('recovery', 'Recovery')])],
      [topic('society', 'Society'), topic('health', 'Health')],
      'addiction',
    );

    expect(context.graph.focusNodeId).toBe('addiction');
    expect(context.directParent?.id).toBe('health');
    expect(context.graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'addiction', role: 'current', level: 0 }),
      expect.objectContaining({ id: 'health', role: 'up', level: -1 }),
      expect.objectContaining({ id: 'society', role: 'up', level: -2 }),
      expect.objectContaining({ id: 'recovery', role: 'child', level: 1 }),
    ]));
    expect(context.graph.nodes.some((node) => node.id === WIKITRUTH_ROOT_ID)).toBe(false);
  });

  it('adds Wikitruth as the remaining upward level for a top-level selected topic', () => {
    const context = buildVisualizeGraphContext([topic('science', 'Science')], [], 'science');

    expect(context.directParent?.id).toBe(WIKITRUTH_ROOT_ID);
    expect(context.graph.edges).toContainEqual({
      from: 'science',
      to: WIKITRUTH_ROOT_ID,
      direction: 'up',
      width: 3,
    });
  });
});
