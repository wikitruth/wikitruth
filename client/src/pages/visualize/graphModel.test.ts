import type { OutlineTreeNode } from '../../types/api';
import { buildVisualizeGraphContext, EXPLORE_ROOT_ID, WIKITRUTH_ROOT_ID } from './graphModel';

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
    expect(context.breadcrumbs).toEqual([
      expect.objectContaining({ id: EXPLORE_ROOT_ID, title: 'Explore', visualizeUrl: '/explore' }),
    ]);
    expect(context.topicCount).toBe(3);
    expect(context.graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: WIKITRUTH_ROOT_ID, to: 'health', direction: 'down' }),
      expect.objectContaining({ from: 'medicine', to: 'health', direction: 'down' }),
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
    expect(context.graph.nodes.find((node) => node.id === 'health')?.label).toContain('(up level)');
    expect(context.graph.nodes.find((node) => node.id === 'society')?.label).toContain('(up 2 levels)');
    expect(context.graph.nodes.some((node) => node.id === WIKITRUTH_ROOT_ID)).toBe(false);
  });

  it('uses the full ancestor chain for breadcrumbs but only the nearest two in the graph', () => {
    const context = buildVisualizeGraphContext(
      [topic('languages', 'Human Languages')],
      [topic('knowledge', 'Knowledge'), topic('existence', 'Life & Existence'), topic('language', 'Language')],
      'languages',
    );

    expect(context.breadcrumbs.map((crumb) => crumb.title)).toEqual([
      'Explore',
      'Knowledge',
      'Life & Existence',
      'Language',
      'Human Languages',
    ]);
    expect(context.graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'languages',
      'existence',
      'language',
    ]));
    expect(context.graph.nodes.some((node) => node.id === 'knowledge')).toBe(false);
    expect(context.directParent?.id).toBe('language');
  });

  it('adds Wikitruth as the remaining upward level for a top-level selected topic', () => {
    const context = buildVisualizeGraphContext([topic('science', 'Science')], [], 'science');

    expect(context.directParent?.id).toBe(WIKITRUTH_ROOT_ID);
    expect(context.graph.edges).toContainEqual({
      from: WIKITRUTH_ROOT_ID,
      to: 'science',
      direction: 'up',
      width: 4,
    });
  });

  it('keeps direct and second-level descendants as distinct graph tiers', () => {
    const context = buildVisualizeGraphContext([
      topic('health', 'Health', [topic('medicine', 'Medicine', [topic('therapy', 'Therapy')])]),
    ], [], 'health');

    expect(context.graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'medicine', level: 1, role: 'child' }),
      expect.objectContaining({ id: 'therapy', level: 2, role: 'child' }),
    ]));
    expect(context.graph.edges).toContainEqual({
      from: 'health',
      to: 'medicine',
      direction: 'down',
      width: 4,
    });
    expect(context.graph.edges).toContainEqual({
      from: 'therapy',
      to: 'medicine',
      direction: 'down',
      width: 1,
    });
  });
});
