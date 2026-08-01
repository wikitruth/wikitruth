'use strict';

export interface TopicHierarchyNode extends Record<string, unknown> {
  _id: unknown;
  title?: string;
  friendlyUrl?: string;
  parentId?: unknown;
  screening?: { status?: number };
}

export interface TopicHierarchyModel {
  findById(id: unknown): {
    select(fields: string): {
      lean(): Promise<TopicHierarchyNode | null>;
    };
  };
}

/**
 * Returns the complete topic path in root-to-parent order.
 * A hard depth limit and cycle guard keep damaged legacy hierarchies bounded.
 */
export async function loadTopicAncestors(
  topicModel: TopicHierarchyModel,
  parentId: unknown,
  maxDepth = 50,
): Promise<TopicHierarchyNode[]> {
  const ancestors: TopicHierarchyNode[] = [];
  const visited = new Set<string>();
  let currentId = parentId;

  while (currentId && ancestors.length < maxDepth) {
    const key = String(currentId);
    if (!key || visited.has(key)) break;
    visited.add(key);

    const ancestor = await topicModel
      .findById(currentId)
      .select('_id title friendlyUrl parentId screening.status')
      .lean();
    if (!ancestor) break;

    ancestors.unshift(ancestor);
    currentId = ancestor.parentId;
  }

  return ancestors;
}
