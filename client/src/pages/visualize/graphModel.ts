import type { OutlineTreeNode } from '../../types/api';

export type VisualizeNodeRole = 'up' | 'current' | 'child';

export interface VisualizeGraphNode {
  id: string;
  label: string;
  title: string;
  level: number;
  role: VisualizeNodeRole;
  type: 'root' | 'topic';
  archived: boolean;
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
  breadcrumbs: Array<{ id: string; title: string; visualizeUrl: string; archived: boolean }>;
  directParent: VisualizeGraphNode | null;
  topicCount: number;
}

export const WIKITRUTH_ROOT_ID = 'wikitruth-root';
export const EXPLORE_ROOT_ID = 'explore-root';

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
    archived: Boolean(topic.archived),
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
    archived: false,
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
    edges.push({
      from: parentLevel === 0 ? String(parent._id) : String(child._id),
      to: parentLevel === 0 ? String(child._id) : String(parent._id),
      direction: 'down',
      width: parentLevel === 0 ? 4 : 1,
    });
    appendDescendants(child, parentLevel + 1, nodes, edges);
  }
}

function exploreBreadcrumb() {
  return { id: EXPLORE_ROOT_ID, title: 'Explore', visualizeUrl: '/explore', archived: false };
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
      edges.push({ from: root.id, to: String(tree._id), direction: 'down', width: 4 });
      appendDescendants(tree, 1, nodes, edges);
    }
    return {
      graph: { nodes, edges, focusNodeId: root.id },
      breadcrumbs: [exploreBreadcrumb()],
      directParent: null,
      topicCount: Math.max(0, nodes.length - 1),
    };
  }

  const current = trees[0];
  if (!current) {
    const root = wikitruthRoot('current', 0);
    return {
      graph: { nodes: [root], edges: [], focusNodeId: root.id },
      breadcrumbs: [exploreBreadcrumb()],
      directParent: null,
      topicCount: 0,
    };
  }

  const currentNode = graphTopicNode(current, 0, 'current');
  nodes.push(currentNode);
  appendDescendants(current, 0, nodes, edges);

  let lowerNode: VisualizeGraphNode = currentNode;
  const ancestorNodes: VisualizeGraphNode[] = [];
  const graphAncestors = ancestors.slice(-2);
  [...graphAncestors].reverse().forEach((ancestor, reverseIndex) => {
    const upDistance = reverseIndex + 1;
    const ancestorNode = graphTopicNode(ancestor, -upDistance, 'up');
    const upLabel = upDistance === 1 ? 'up level' : 'up 2 levels';
    ancestorNode.label = `${ancestorNode.label}\n(${ancestorNode.archived ? 'archived · ' : ''}${upLabel})`;
    ancestorNodes.unshift(ancestorNode);
    nodes.push(ancestorNode);
    edges.push({ from: lowerNode.id, to: ancestorNode.id, direction: 'up', width: upDistance === 1 ? 4 : 1 });
    lowerNode = ancestorNode;
  });

  if (graphAncestors.length < 2) {
    const upDistance = graphAncestors.length + 1;
    const root = wikitruthRoot('up', -upDistance);
    root.label = `${root.label}\n(${upDistance === 1 ? 'up level' : 'up 2 levels'})`;
    nodes.push(root);
    edges.push({ from: root.id, to: lowerNode.id, direction: 'up', width: upDistance === 1 ? 4 : 1 });
    ancestorNodes.unshift(root);
  }

  return {
    graph: { nodes, edges, focusNodeId: currentNode.id },
    breadcrumbs: [
      exploreBreadcrumb(),
      ...ancestors.map((ancestor) => ({
        id: String(ancestor._id),
        title: ancestor.title,
        visualizeUrl: topicVisualizeUrl(ancestor),
        archived: Boolean(ancestor.archived),
      })),
      {
        id: String(current._id),
        title: current.title,
        visualizeUrl: topicVisualizeUrl(current),
        archived: Boolean(current.archived),
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
