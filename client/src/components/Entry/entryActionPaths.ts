import type { LegacyEntity } from '../../types/legacy';

function encodePathSegment(value: unknown): string {
  return encodeURIComponent(String(value || '').trim());
}

function extractNestedEntryTarget(
  entry: LegacyEntity,
  key: 'topic' | 'argument',
): { id: string; friendly: string } | null {
  const nested = entry[key] as { _id?: unknown; friendlyUrl?: unknown; title?: unknown } | undefined;
  const id = String(nested?._id || '').trim();
  if (!id) return null;

  const friendly = String(nested?.friendlyUrl || nested?.title || id).trim();
  return { id, friendly: friendly || id };
}

export function resolveEntryDetailsPath(entry: LegacyEntity, objectName: string): string {
  const defaultId = String(entry._id || '').trim();
  const defaultFriendly = String(entry.friendlyUrl || entry.title || defaultId).trim() || defaultId;
  const toFriendlyPath = (prefix: string, id: string, friendly: string): string => (
    `${prefix}/${encodePathSegment(friendly)}/${encodePathSegment(id)}`
  );

  if (objectName === 'topicLink') {
    const linkedTopic = extractNestedEntryTarget(entry, 'topic');
    if (linkedTopic) return toFriendlyPath('/topics/entry', linkedTopic.id, linkedTopic.friendly);
  }

  if (objectName === 'argumentLink') {
    const linkedArgument = extractNestedEntryTarget(entry, 'argument');
    if (linkedArgument) return toFriendlyPath('/arguments/entry', linkedArgument.id, linkedArgument.friendly);
  }

  switch (objectName) {
    case 'topic':
      return toFriendlyPath('/topics/entry', defaultId, defaultFriendly);
    case 'argument':
      return toFriendlyPath('/arguments/entry', defaultId, defaultFriendly);
    case 'question':
      return toFriendlyPath('/questions/entry', defaultId, defaultFriendly);
    case 'issue':
      return toFriendlyPath('/issues/entry', defaultId, defaultFriendly);
    case 'opinion':
      return toFriendlyPath('/opinions/entry', defaultId, defaultFriendly);
    case 'artifact':
      return toFriendlyPath('/artifacts/entry', defaultId, defaultFriendly);
    case 'answer':
      return `/answers/entry/${encodePathSegment(defaultId)}`;
    default:
      return `/topics/entry/${encodePathSegment(defaultId)}`;
  }
}
