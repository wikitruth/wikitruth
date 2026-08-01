import type { OutlineTreeNode } from '../../types/api';

export type VisualizeNodeRole = 'up' | 'current' | 'child';

export interface VisualizeGraphNode {
  id: string;
  label: string;
  title: string;
  level: number;
  role: VisualizeNodeRole;
  type: 'root' | 'topic';
  exploreUrl: string;
  visualizeUrl: string;
}

export interface VisualizeGraphEdge {
  from: string;
  to: string;
  direction: 'up' | 'down';
  width: number;
}

export interface VisualizeGraphPayload {
  nodes: VisualizeGraphNode[];
  edges: VisualizeGraphEdge[];
  focusNodeId: string;
}

export interface VisualizeGraphContext {
  graph: VisualizeGraphPayload;
  breadcrumbs: Array<{ id: string; title: string; visualizeUrl: string }>;
  directParent: VisualizeGraphNode | null;
  topicCount: number;
}

export const WIKITRUTH_ROOT_ID = 'wikitruth-root';

export function topicEntryUrl(topic: Pick<OutlineTreeNode, '_id' | 'friendlyUrl'>): string {
  const id = encodeURIComponent(String(topic._id || ''));
  const friendlyUrl = encodeURIComponent(String(topic.friendlyUrl || topic._id || 'topic'));
  return `/topics/entry/${friendlyUrl}/${id}`;
}

export function topicVisualizeUrl(topic: Pick<OutlineTreeNode, '_id' | 'friendlyUrl'>): string {
  const id = encodeURIComponent(String(topic._id || ''));
  const friendlyUrl = encodeURIComponent(String(topic.friendlyUrl || topic._id || 'topic'));
  return `/visualize/topic/${friendlyUrl}/${id}`;
}

function graphTopicNode(
  topic: OutlineTreeNode,
  level: number,
  role: VisualizeNodeRole,
): VisualizeGraphNode {
  return {
    id: String(topic._id),
    label: shortenGraphLabel(String(topic.title || 'Untitled topic')),
    title: String(topic.title || 'Untitled topic'),
    level,
    role,
    type: 'topic',
    exploreUrl: topicEntryUrl(topic),
    visualizeUrl: topicVisualizeUrl(topic),
  };
}

function wikitruthRoot(role: VisualizeNodeRole, level: number): VisualizeGraphNode {
  return {
    id: WIKITRUTH_ROOT_ID,
    label: 'Wikitruth',
    title: 'Wikitruth',
    level,
    role,
    type: 'root',
    exploreUrl: '/topics',
    visualizeUrl: '/visualize',
  };
}

function appendDescendants(
  parent: OutlineTreeNode,
  parentLevel: number,
  nodes: VisualizeGraphNode[],
  edges: VisualizeGraphEdge[],
): void {
  for (const child of parent.children || []) {
    nodes.push(graphTopicNode(child, parentLevel + 1, 'child'));
    edges.push({ from: String(parent._id), to: String(child._id), direction: 'down', width: 2 });
    appendDescendants(child, parentLevel + 1, nodes, edges);
  }
}

export function buildVisualizeGraphContext(
  trees: OutlineTreeNode[],
  ancestors: OutlineTreeNode[],
  selectedTopicId?: string,
): VisualizeGraphContext {
  const nodes: VisualizeGraphNode[] = [];
  const edges: VisualizeGraphEdge[] = [];

  if (!selectedTopicId) {
    const root = wikitruthRoot('current', 0);
    nodes.push(root);
    for (const tree of trees) {
      nodes.push(graphTopicNode(tree, 1, 'child'));
      edges.push({ from: root.id, to: String(tree._id), direction: 'down', width: 3 });
      appendDescendants(tree, 1, nodes, edges);
    }
    return {
      graph: { nodes, edges, focusNodeId: root.id },
      breadcrumbs: [{ id: root.id, title: root.title, visualizeUrl: root.visualizeUrl }],
      directParent: null,
      topicCount: Math.max(0, nodes.length - 1),
    };
  }

  const current = trees[0];
  if (!current) {
    const root = wikitruthRoot('current', 0);
    return {
      graph: { nodes: [root], edges: [], focusNodeId: root.id },
      breadcrumbs: [{ id: root.id, title: root.title, visualizeUrl: root.visualizeUrl }],
      directParent: null,
      topicCount: 0,
    };
  }

  const currentNode = graphTopicNode(current, 0, 'current');
  nodes.push(currentNode);
  appendDescendants(current, 0, nodes, edges);

  let lowerNode: VisualizeGraphNode = currentNode;
  const ancestorNodes: VisualizeGraphNode[] = [];
  [...ancestors].reverse().forEach((ancestor, reverseIndex) => {
    const ancestorNode = graphTopicNode(ancestor, -(reverseIndex + 1), 'up');
    ancestorNodes.unshift(ancestorNode);
    nodes.push(ancestorNode);
    edges.push({ from: lowerNode.id, to: ancestorNode.id, direction: 'up', width: 3 });
    lowerNode = ancestorNode;
  });

  if (ancestors.length < 2) {
    const root = wikitruthRoot('up', -(ancestors.length + 1));
    nodes.push(root);
    edges.push({ from: lowerNode.id, to: root.id, direction: 'up', width: 3 });
    ancestorNodes.unshift(root);
  }

  return {
    graph: { nodes, edges, focusNodeId: currentNode.id },
    breadcrumbs: [
      { id: WIKITRUTH_ROOT_ID, title: 'Wikitruth', visualizeUrl: '/visualize' },
      ...ancestors.map((ancestor) => ({
        id: String(ancestor._id),
        title: ancestor.title,
        visualizeUrl: topicVisualizeUrl(ancestor),
      })),
      {
        id: String(current._id),
        title: current.title,
        visualizeUrl: topicVisualizeUrl(current),
      },
    ],
    directParent: ancestorNodes.length > 0 ? ancestorNodes[ancestorNodes.length - 1] : null,
    topicCount: nodes.filter((node) => node.type === 'topic').length,
  };
}

export function shortenGraphLabel(value: string, max = 28): string {
  const cleaned = value.trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1)}…`;
}
